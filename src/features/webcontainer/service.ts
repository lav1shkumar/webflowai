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

export interface WebContainerCallbacks {
  onStatus?: (status: ServerStatus) => void;
  onServerReady?: (url: string, port: number) => void;
  onOutput?: (chunk: string) => void;
  onError?: (message: string) => void;
}

/**
 * WebContainerService — a thin, framework-agnostic wrapper around the
 * `@webcontainer/api` runtime.
 *
 * Responsibilities:
 *  - Boot a single shared WebContainer (the API only allows one per page).
 *  - Mount / write / update files.
 *  - Run commands and stream their output to the terminal.
 *  - Manage the dev server lifecycle (install → dev → ready → restart).
 *
 * It is intentionally decoupled from React; the `useWorkspace` store wires
 * its callbacks to UI state. Boot is lazy and guarded so it is safe to call
 * from effects.
 */
export class WebContainerService {
  private static instance: WebContainerService | null = null;
  private container: WebContainer | null = null;
  private bootPromise: Promise<WebContainer> | null = null;
  private devProcess: WebContainerProcess | null = null;
  private shellProcess: WebContainerProcess | null = null;
  private shellWriter: WritableStreamDefaultWriter<string> | null = null;
  private callbacks: WebContainerCallbacks = {};
  private serverUrl: string | null = null;
  private mounted = false;

  static get(): WebContainerService {
    if (!WebContainerService.instance) {
      WebContainerService.instance = new WebContainerService();
    }
    return WebContainerService.instance;
  }

  setCallbacks(callbacks: WebContainerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  get isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof SharedArrayBuffer !== "undefined" &&
      window.crossOriginIsolated === true
    );
  }

  get url(): string | null {
    return this.serverUrl;
  }

  /** Boot the WebContainer runtime (idempotent). */
  async boot(): Promise<WebContainer> {
    if (this.container) return this.container;
    if (this.bootPromise) return this.bootPromise;

    // NOTE: boot() is a low-level concern shared by the shell and the dev
    // server. It deliberately does NOT touch `serverStatus` — the preview
    // lifecycle owns that (see mount/startDevServer), so booting the shell
    // never affects the preview's reported state.
    this.bootPromise = (async () => {
      // Dynamic import keeps the heavy runtime out of the marketing bundle.
      const { WebContainer } = await import("@webcontainer/api");
      const instance = await WebContainer.boot();
      this.container = instance;
      instance.on("server-ready", (port, url) => {
        this.serverUrl = url;
        this.setStatus("ready");
        this.callbacks.onServerReady?.(url, port);
      });
      instance.on("error", (err) => {
        this.callbacks.onError?.(err.message);
        this.setStatus("error");
      });
      return instance;
    })();

    return this.bootPromise;
  }

  /** Mount a full project filesystem from a flat path→content map. */
  async mount(files: Record<string, string>): Promise<void> {
    this.setStatus("booting");
    const container = await this.boot();
    this.setStatus("mounting");
    await container.mount(toFileSystemTree(files));
    this.mounted = true;
  }

  get isMounted(): boolean {
    return this.mounted;
  }

  /**
   * Mirror a single created/updated file into the running container so the
   * dev server (e.g. Vite HMR) reflects it live. No-op until the project has
   * been mounted — before that, the next {@link mount} carries the change.
   */
  async syncFile(path: string, content: string): Promise<void> {
    if (!this.mounted) return;
    await this.writeFile(path, content);
  }

  /** Mirror a file deletion into the running container. No-op if unmounted. */
  async syncDelete(path: string): Promise<void> {
    if (!this.mounted) return;
    try {
      await this.removeFile(path);
    } catch {
      /* already absent */
    }
  }

  /**
   * Reinstall dependencies and restart the dev server. Used when `package.json`
   * dependencies change (source-only edits are picked up by HMR and don't need
   * this). No-op until the project is mounted.
   */
  async resyncDependencies(): Promise<void> {
    if (!this.mounted) return;
    this.setStatus("installing");
    const installExit = await this.run("npm", ["install"]);
    if (installExit !== 0) {
      this.callbacks.onError?.(`Install failed (exit ${installExit}).`);
      this.setStatus("error");
      return;
    }
    this.devProcess?.kill();
    this.devProcess = null;
    this.serverUrl = null;
    await this.spawnDev();
  }

  /** Write or overwrite a single file, creating parent dirs as needed. */
  async writeFile(path: string, content: string): Promise<void> {
    const container = await this.boot();
    const dir = path.split("/").slice(0, -1).join("/");
    if (dir) await container.fs.mkdir(dir, { recursive: true });
    await container.fs.writeFile(path, content);
  }

  async readFile(path: string): Promise<string> {
    const container = await this.boot();
    return container.fs.readFile(path, "utf-8");
  }

  async removeFile(path: string): Promise<void> {
    const container = await this.boot();
    await container.fs.rm(path, { recursive: true, force: true });
  }

  /**
   * Spawn a command, streaming stdout to the terminal callback.
   * Resolves with the process exit code.
   */
  async run(command: string, args: string[] = []): Promise<number> {
    const container = await this.boot();
    this.callbacks.onOutput?.(`\u001b[36m$ ${command} ${args.join(" ")}\u001b[0m\r\n`);
    const process = await container.spawn(command, args);
    process.output.pipeTo(
      new WritableStream({
        write: (chunk) => this.callbacks.onOutput?.(chunk),
      }),
    );
    return process.exit;
  }

  /**
   * Full dev lifecycle: install dependencies then start the dev server.
   * Reuses a running dev process if already started.
   */
  async startDevServer(
    installCommand: [string, string[]] = ["npm", ["install"]],
    devCommand: [string, string[]] = ["npm", ["run", "dev"]],
  ): Promise<void> {
    await this.boot();

    this.setStatus("installing");
    const installExit = await this.run(installCommand[0], installCommand[1]);
    if (installExit !== 0) {
      this.callbacks.onError?.(`Install failed (exit ${installExit}).`);
      this.setStatus("error");
      return;
    }

    await this.spawnDev(devCommand);
  }

  /** Spawn the dev server process and stream its output. Status → "starting". */
  private async spawnDev(
    devCommand: [string, string[]] = ["npm", ["run", "dev"]],
  ): Promise<void> {
    const container = await this.boot();
    this.setStatus("starting");
    this.devProcess = await container.spawn(devCommand[0], devCommand[1]);
    this.devProcess.output.pipeTo(
      new WritableStream({
        write: (chunk) => this.callbacks.onOutput?.(chunk),
      }),
    );
    // `server-ready` event flips status to "ready".
  }

  /** Tear down and restart the dev server process. */
  async restart(): Promise<void> {
    this.devProcess?.kill();
    this.devProcess = null;
    this.serverUrl = null;
    await this.startDevServer();
  }

  /**
   * Start an interactive `jsh` shell wired to the terminal. Output is streamed
   * to `onOutput`; keystrokes are sent via {@link writeToShell}. Idempotent —
   * a second call is a no-op while a shell is alive.
   */
  async startShell(cols: number, rows: number): Promise<void> {
    const container = await this.boot();
    if (this.shellProcess) return;

    const shell = await container.spawn("jsh", {
      terminal: { cols, rows },
    });
    this.shellProcess = shell;
    this.shellWriter = shell.input.getWriter();

    shell.output.pipeTo(
      new WritableStream({
        write: (chunk) => this.callbacks.onOutput?.(chunk),
      }),
    );

    // Surface unexpected shell exit so the UI can offer a restart.
    shell.exit.then(() => {
      this.shellProcess = null;
      this.shellWriter = null;
    });
  }

  /** Send keystrokes / input to the interactive shell. */
  writeToShell(data: string): void {
    void this.shellWriter?.write(data);
  }

  /** Run a command line in the interactive shell (appends a newline). */
  runInShell(command: string): void {
    this.writeToShell(`${command}\n`);
  }

  /** Resize the shell PTY to match the rendered terminal. */
  resizeShell(cols: number, rows: number): void {
    this.shellProcess?.resize({ cols, rows });
  }

  get hasShell(): boolean {
    return this.shellProcess !== null;
  }

  teardown(): void {
    this.devProcess?.kill();
    this.shellProcess?.kill();
    this.devProcess = null;
    this.shellProcess = null;
    this.shellWriter = null;
    this.serverUrl = null;
    this.mounted = false;
  }

  private setStatus(status: ServerStatus): void {
    this.callbacks.onStatus?.(status);
  }
}

export const webContainerService = WebContainerService.get();
