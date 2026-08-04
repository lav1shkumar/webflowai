import type { WebContainer, WebContainerProcess } from "@webcontainer/api";
import { toFileSystemTree } from "./files";

export type ServerStatus =
  | "idle"
  | "booting"
  | "mounting"
  | "installing"
  | "starting"
  | "ready"
  | "error";

interface WebContainerCallbacks {
  onStatus?: (status: ServerStatus) => void;
  onServerReady?: (url: string) => void;
  onOutput?: (chunk: string) => void;
  onError?: (message: string) => void;
}

/** Manages the one WebContainer shared by the workspace. */
class WebContainerService {
  private bootPromise: Promise<WebContainer> | null = null;
  private devProcess: WebContainerProcess | null = null;
  private shellProcess: WebContainerProcess | null = null;
  private shellWriter: WritableStreamDefaultWriter<string> | null = null;
  private callbacks: WebContainerCallbacks = {};
  private mounted = false;

  setCallbacks(callbacks: WebContainerCallbacks): void {
    this.callbacks = callbacks;
  }

  get isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof SharedArrayBuffer !== "undefined" &&
      window.crossOriginIsolated === true
    );
  }

  get isMounted(): boolean {
    return this.mounted;
  }

  /** Mount the project, install its dependencies, and start its dev server. */
  async start(files: Record<string, string>): Promise<void> {
    this.setStatus("booting");
    const container = await this.boot();
    this.setStatus("mounting");
    await container.mount(toFileSystemTree(files));
    this.mounted = true;

    if (await this.installDependencies()) {
      await this.spawnDevServer();
    }
  }

  /** Mirror a created or updated file into the mounted container. */
  async syncFile(path: string, content: string): Promise<void> {
    if (!this.mounted) return;
    const container = await this.boot();
    const directory = path.split("/").slice(0, -1).join("/");
    if (directory) await container.fs.mkdir(directory, { recursive: true });
    await container.fs.writeFile(path, content);
  }

  /** Remove a file or directory from the mounted container. */
  async syncDelete(path: string): Promise<void> {
    if (!this.mounted) return;
    try {
      const container = await this.boot();
      await container.fs.rm(path, { recursive: true, force: true });
    } catch {
      // The path may already be absent.
    }
  }

  /** Reinstall dependencies after package.json changes, then restart. */
  async resyncDependencies(): Promise<void> {
    if (!this.mounted || !(await this.installDependencies())) return;
    this.stopDevServer();
    await this.spawnDevServer();
  }

  /** Reinstall dependencies and restart the current project. */
  async restart(): Promise<void> {
    this.stopDevServer();
    if (await this.installDependencies()) {
      await this.spawnDevServer();
    }
  }

  /** Start an interactive shell for the terminal. */
  async startShell(cols: number, rows: number): Promise<void> {
    const container = await this.boot();
    if (this.shellProcess) return;

    const shell = await container.spawn("jsh", {
      terminal: { cols, rows },
    });
    this.shellProcess = shell;
    this.shellWriter = shell.input.getWriter();
    this.pipeOutput(shell);

    shell.exit.then(() => {
      this.shellProcess = null;
      this.shellWriter = null;
    });
  }

  writeToShell(data: string): void {
    void this.shellWriter?.write(data);
  }

  resizeShell(cols: number, rows: number): void {
    this.shellProcess?.resize({ cols, rows });
  }

  private async boot(): Promise<WebContainer> {
    if (!this.bootPromise) {
      this.bootPromise = (async () => {
        const { WebContainer } = await import("@webcontainer/api");
        const container = await WebContainer.boot();

        container.on("server-ready", (_port, url) => {
          this.setStatus("ready");
          this.callbacks.onServerReady?.(url);
        });
        container.on("error", (error) => {
          this.callbacks.onError?.(error.message);
          this.setStatus("error");
        });

        return container;
      })();
    }
    return this.bootPromise;
  }

  private async installDependencies(): Promise<boolean> {
    this.setStatus("installing");
    const exitCode = await this.run("npm", ["install"]);
    if (exitCode === 0) return true;

    this.callbacks.onError?.(`Install failed (exit ${exitCode}).`);
    this.setStatus("error");
    return false;
  }

  private async run(command: string, args: string[]): Promise<number> {
    const container = await this.boot();
    this.callbacks.onOutput?.(
      `\u001b[36m$ ${command} ${args.join(" ")}\u001b[0m\r\n`,
    );
    const process = await container.spawn(command, args);
    this.pipeOutput(process);
    return process.exit;
  }

  private async spawnDevServer(): Promise<void> {
    const container = await this.boot();
    this.setStatus("starting");
    this.devProcess = await container.spawn("npm", ["run", "dev"]);
    this.pipeOutput(this.devProcess);
  }

  private stopDevServer(): void {
    this.devProcess?.kill();
    this.devProcess = null;
  }

  private pipeOutput(process: WebContainerProcess): void {
    void process.output.pipeTo(
      new WritableStream({
        write: (chunk) => this.callbacks.onOutput?.(chunk),
      }),
    );
  }

  private setStatus(status: ServerStatus): void {
    this.callbacks.onStatus?.(status);
  }
}

export const webContainerService = new WebContainerService();
