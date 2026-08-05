import { CommandExitError, Sandbox, SandboxNotFoundError } from "e2b";

export const E2B_PROJECT_DIR = "/home/user/project";
export const E2B_PREVIEW_PORT = 3000;

function projectPath(path: string) {
  if (path.startsWith("/") || path.split("/").includes(".."))
    throw new Error(`Invalid project path: ${path}`);
  return `${E2B_PROJECT_DIR}/${path}`;
}

export function connectSandbox(sandboxId: string) {
  return Sandbox.connect(sandboxId);
}

export async function createSandbox(projectId: string, ownerId: string) {
  if (!process.env.E2B_API_KEY)
    throw new Error("E2B_API_KEY is not configured");

  const sandbox = await Sandbox.create(process.env.E2B_TEMPLATE || "base", {
    metadata: { webflowaiProjectId: projectId, webflowaiOwnerId: ownerId },
    lifecycle: { onTimeout: "kill" },
    timeoutMs: 15 * 60 * 1000,
  });
  await sandbox.files.makeDir(E2B_PROJECT_DIR);
  return sandbox;
}

export async function killSandbox(sandboxId: string) {
  try {
    return await Sandbox.kill(sandboxId);
  } catch (error) {
    if (error instanceof SandboxNotFoundError) return false;
    throw error;
  }
}

export async function runCommand(
  sandboxId: string,
  command: string,
  timeoutMs = 120_000,
) {
  const sandbox = await connectSandbox(sandboxId);
  try {
    const result = await sandbox.commands.run(command, {
      cwd: E2B_PROJECT_DIR,
      timeoutMs,
    });
    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    if (error instanceof CommandExitError) {
      return {
        exitCode: error.exitCode,
        stdout: error.stdout,
        stderr: error.stderr,
      };
    }
    throw error;
  }
}

export async function readFiles(sandboxId: string, paths: string[]) {
  const sandbox = await connectSandbox(sandboxId);
  const files = await Promise.all(
    paths.map(async (path) => [
      path,
      await sandbox.files.read(projectPath(path)),
    ]),
  );
  return Object.fromEntries(files);
}

export async function readProjectFiles(sandboxId: string) {
  const sandbox = await connectSandbox(sandboxId);
  const paths = await listProjectFiles(sandboxId);
  const files = await Promise.all(
    paths.map(async (path) => [
      path,
      await sandbox.files.read(projectPath(path)),
    ]),
  );
  return Object.fromEntries(files);
}

export async function listProjectFiles(sandboxId: string) {
  const sandbox = await connectSandbox(sandboxId);
  const result = await sandbox.commands.run(
    "find . -path './node_modules' -prune -o -path './.next' -prune -o -path './.git' -prune -o -path './dist' -prune -o -path './build' -prune -o -type f -print",
    { cwd: E2B_PROJECT_DIR },
  );
  return result.stdout
    .split("\n")
    .map((path) => path.replace(/^\.\//, ""))
    .filter(Boolean)
    .filter(
      (path) =>
        !/\.(ico|png|jpe?g|gif|webp|woff2?|ttf|eot|mp4|pdf)$/i.test(path),
    );
}

export async function writeFiles(
  sandboxId: string,
  files: Record<string, string>,
) {
  const sandbox = await connectSandbox(sandboxId);
  return sandbox.files.write(
    Object.entries(files).map(([path, data]) => ({
      path: projectPath(path),
      data,
    })),
  );
}

export async function replaceFiles(
  sandboxId: string,
  files: Record<string, string>,
) {
  const sandbox = await connectSandbox(sandboxId);
  if (await sandbox.files.exists(E2B_PROJECT_DIR)) {
    await sandbox.files.remove(E2B_PROJECT_DIR);
  }
  await sandbox.files.makeDir(E2B_PROJECT_DIR);

  const entries = Object.entries(files);
  if (entries.length === 0) return [];
  return sandbox.files.write(
    entries.map(([path, data]) => ({ path: projectPath(path), data })),
  );
}

export async function renameFile(
  sandboxId: string,
  oldPath: string,
  newPath: string,
) {
  const sandbox = await connectSandbox(sandboxId);
  return sandbox.files.rename(projectPath(oldPath), projectPath(newPath));
}

export async function removeFiles(sandboxId: string, paths: string[]) {
  const sandbox = await connectSandbox(sandboxId);
  await Promise.all(
    paths.map((path) => sandbox.files.remove(projectPath(path))),
  );
}
