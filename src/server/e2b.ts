import { CommandExitError, Sandbox, SandboxNotFoundError } from "e2b";

export const E2B_PROJECT_DIR = "/home/user/project";
export const E2B_PREVIEW_PORT = 5173;

function projectPath(path: string) {
  return path.startsWith("/") ? path : `${E2B_PROJECT_DIR}/${path}`;
}

export function connectSandbox(sandboxId: string) {
  return Sandbox.connect(sandboxId);
}

export function createSandbox(projectId: string, ownerId: string) {
  if (!process.env.E2B_API_KEY) throw new Error("E2B_API_KEY is not configured");

  return Sandbox.create(process.env.E2B_TEMPLATE || "base", {
    secure: true,
    metadata: { webflowaiProjectId: projectId, webflowaiOwnerId: ownerId },
    lifecycle: { onTimeout: "kill" },
  });
}

export async function killSandbox(sandboxId: string) {
  try {
    return await Sandbox.kill(sandboxId);
  } catch (error) {
    if (error instanceof SandboxNotFoundError) return false;
    throw error;
  }
}

export async function runCommand(sandboxId: string, command: string) {
  const sandbox = await connectSandbox(sandboxId);
  try {
    const result = await sandbox.commands.run(command, {
      cwd: E2B_PROJECT_DIR,
    });
    return result.stdout + result.stderr;
  } catch (error) {
    if (error instanceof CommandExitError) {
      return error.stdout + error.stderr;
    }
    throw error;
  }
}

export async function readFiles(sandboxId: string, paths: string[]) {
  const sandbox = await connectSandbox(sandboxId);
  const files = await Promise.all(
    paths.map(async (path) => [path, await sandbox.files.read(projectPath(path))]),
  );
  return Object.fromEntries(files);
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
  await Promise.all(paths.map((path) => sandbox.files.remove(projectPath(path))));
}
