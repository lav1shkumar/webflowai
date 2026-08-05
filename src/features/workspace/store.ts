"use client";

import { create } from "zustand";
import { buildFileTree, type FileNode } from "@/features/workspace/files";
import { terminalBus } from "@/features/workspace/terminal-bus";
import { getProjectState } from "@/server/projects";
import { getTokens } from "@/server/tokens";
import type { GenerationEvent } from "@/features/ai/types";
import { shortId } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokensState {
  signedIn: boolean;
  balance: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "running" | "done" | "error";
  stage?: "context" | "planning" | "generation" | "verification";
  stageMessage?: string;
  files?: string[];
  tokens?: number;
  durationMs?: number;
  createdAt: number;
}

export type ServerStatus =
  | "idle"
  | "installing"
  | "starting"
  | "ready"
  | "error";

interface WorkspaceState {
  projectId: string | null;
  sandboxId: string | null;
  files: Record<string, string>;
  tree: FileNode[];
  activeFilePath: string | null;
  messages: ChatMessage[];
  serverStatus: ServerStatus;
  previewUrl: string | null;
  isGenerating: boolean;
  tokens: TokensState | null;

  // lifecycle
  init: (projectId: string, initialPrompt?: string) => void;
  sendPrompt: (prompt: string) => Promise<void>;

  // files
  setActiveFile: (path: string) => void;
  writeFile: (path: string, content: string) => void;
  createFile: (path: string) => void;
  createFolder: (path: string) => void;
  deleteFile: (path: string) => void;
  deleteFolder: (path: string) => void;
  renameFile: (from: string, to: string) => void;
  renameFolder: (from: string, to: string) => void;

  // preview
  bootPreview: () => Promise<void>;
  restartPreview: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sandboxSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function patchSandbox(sandboxId: string, body: unknown) {
  const response = await fetch(`/api/sandboxes/${sandboxId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Sandbox sync failed (${response.status})`);
}

function scheduleSandboxWrite(
  sandboxId: string,
  path: string,
  content: string,
) {
  const existing = sandboxSyncTimers.get(path);
  if (existing) clearTimeout(existing);
  sandboxSyncTimers.set(
    path,
    setTimeout(() => {
      sandboxSyncTimers.delete(path);
      void patchSandbox(sandboxId, {
        action: "writeFiles",
        files: { [path]: content },
      }).catch(() => {});
    }, 200),
  );
}

function cancelSandboxWrite(path: string) {
  const timer = sandboxSyncTimers.get(path);
  if (timer) clearTimeout(timer);
  sandboxSyncTimers.delete(path);
}

function depsSignature(pkg: string): string {
  try {
    const parsed = JSON.parse(pkg) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return JSON.stringify({
      dependencies: parsed.dependencies ?? {},
      devDependencies: parsed.devDependencies ?? {},
    });
  } catch {
    return pkg;
  }
}

function dependenciesChanged(before: string, after: string): boolean {
  if (!after) return false;
  return depsSignature(before) !== depsSignature(after);
}

// ---------------------------------------------------------------------------
// Server generation stream
// ---------------------------------------------------------------------------

interface ServerRunOutput {
  summary: string;
  tokensUsed: number | null;
  tokensRemaining: number | null;
  signedIn: boolean;
}

type PreviewEvent =
  | { type: "status"; status: ServerStatus }
  | { type: "log"; data: string }
  | { type: "ready"; url: string }
  | {
      type: "error";
      message: string;
      code?: "sandbox-not-found";
    };

async function streamPreview(
  sandboxId: string,
  onEvent: (event: PreviewEvent) => void,
) {
  const response = await fetch(`/api/sandboxes/${sandboxId}/preview`, {
    method: "POST",
  });
  if (!response.ok || !response.body) {
    throw new Error(`Preview request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let ready = false;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as PreviewEvent;
    if (event.type === "error") {
      const error = new Error(event.message);
      if (event.code === "sandbox-not-found") {
        error.name = "SandboxNotFoundError";
      }
      throw error;
    }
    if (event.type === "ready") ready = true;
    onEvent(event);
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      handleLine(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
    }
  }
  if (buffer) handleLine(buffer);
  if (!ready) throw new Error("Preview stream ended before the server was ready");
}

async function runViaServer(
  input: {
    projectId: string;
    prompt: string;
  },
  onEvent: (event: GenerationEvent) => void,
): Promise<ServerRunOutput> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (res.status === 402) {
    const data = (await res.json().catch(() => ({}))) as { balance?: number };
    throw new InsufficientTokensError(Number(data.balance ?? 0));
  }

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const result: ServerRunOutput = {
    summary: "Generation completed.",
    tokensUsed: null,
    tokensRemaining: null,
    signedIn: false,
  };
  let completed = false;

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let event: GenerationEvent;
    try {
      event = JSON.parse(trimmed) as GenerationEvent;
    } catch {
      return;
    }

    if (event.type === "error") {
      throw new Error(event.message);
    }
    if (event.type === "done") {
      completed = true;
      result.summary = event.summary;
      result.signedIn = event.signedIn;
      result.tokensUsed = event.tokensUsed;
      result.tokensRemaining = event.tokensRemaining;
      return;
    }
    onEvent(event);
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      handleLine(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
  }
  if (buffer) handleLine(buffer);
  if (!completed) throw new Error("generation-stream-ended");

  return result;
}

class InsufficientTokensError extends Error {
  balance: number;
  constructor(balance: number) {
    super("insufficient-tokens");
    this.name = "InsufficientTokensError";
    this.balance = balance;
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

// Tracks whether init already auto-sent the initial prompt for a given project.
const seededProjects = new Set<string>();

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  projectId: null,
  sandboxId: null,
  files: {},
  tree: [],
  activeFilePath: null,
  messages: [],
  serverStatus: "idle",
  previewUrl: null,
  isGenerating: false,
  tokens: null,

  init: (projectId, initialPrompt) => {
    // Already on this project — nothing to do.
    if (get().projectId === projectId) return;

    for (const timer of sandboxSyncTimers.values()) clearTimeout(timer);
    sandboxSyncTimers.clear();

    set({
      projectId,
      sandboxId: null,
      files: {},
      tree: [],
      activeFilePath: null,
      messages: [],
      serverStatus: "idle",
      previewUrl: null,
    });

    terminalBus.clear();
    terminalBus.writeLine("\u001b[2mWelcome to the WebFlowAI workspace.\u001b[0m");

    void (async () => {
      try {
        set({ tokens: await getTokens() });
      } catch { /* unavailable */ }
    })();

    // Load saved project state, then auto-send the initial prompt if new.
    void (async () => {
      try {
        const state = await getProjectState(projectId);
        if (state && get().projectId === projectId) {
          set({
            files: state.files,
            tree: buildFileTree(state.files),
            messages: state.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
            })),
            activeFilePath: Object.keys(state.files)[0] ?? null,
          });

          try {
            let response = state.sandboxId
              ? await fetch(`/api/sandboxes/${state.sandboxId}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "reconnect" }),
                })
              : await fetch("/api/sandboxes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ projectId }),
                });

            if (response.status === 410 && state.sandboxId) {
              response = await fetch(`/api/sandboxes/${state.sandboxId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "restart" }),
              });
            }

            if (response.ok) {
              const data = (await response.json()) as {
                sandboxId: string;
                files?: Record<string, string>;
              };
              if (get().projectId === projectId) {
                const files = data.files ?? get().files;
                set({
                  sandboxId: data.sandboxId,
                  files,
                  tree: buildFileTree(files),
                  activeFilePath:
                    get().activeFilePath ?? Object.keys(files)[0] ?? null,
                });
              }
            }
          } catch { /* sandbox unavailable */ }
        }
      } catch { /* run in-memory */ }

      // Auto-send the initial prompt only for brand-new projects.
      if (
        initialPrompt &&
        !seededProjects.has(projectId) &&
        get().projectId === projectId &&
        get().messages.length === 0
      ) {
        seededProjects.add(projectId);
        void get().sendPrompt(initialPrompt);
      }
    })();
  },

  sendPrompt: async (prompt) => {
    const projectId = get().projectId;
    if (!projectId || get().isGenerating) return;

    const tokens = get().tokens;
    if (tokens?.signedIn && tokens.balance <= 0) {
      return;
    }

    const userMessage: ChatMessage = {
      id: shortId("msg"),
      role: "user",
      content: prompt,
      createdAt: Date.now(),
    };
    const assistantId = shortId("msg");
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      status: "running",
      stage: "context",
      files: [],
      createdAt: Date.now(),
    };

    set((s) => ({
      messages: [...s.messages, userMessage, assistantMessage],
      isGenerating: true,
    }));

    const startedAt = Date.now();
    const updateAssistant = (patch: Partial<ChatMessage>) =>
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantId ? { ...m, ...patch } : m,
        ),
      }));

    const onEvent = (event: GenerationEvent) => {
      switch (event.type) {
        case "status":
          updateAssistant({
            status:
              event.status === "succeeded"
                ? "done"
                : event.status === "failed"
                  ? "error"
                  : "running",
          });
          break;
        case "stage":
          updateAssistant({
            stage: event.stage,
            stageMessage: event.message,
          });
          break;
      }
    };

    const pkgBefore = get().files["package.json"] ?? "";

    try {
      const { summary, tokensUsed, tokensRemaining, signedIn } =
        await runViaServer({ projectId, prompt }, onEvent);

      updateAssistant({
        content: summary,
        ...(tokensUsed != null ? { tokens: tokensUsed } : {}),
      });

      const state = await getProjectState(projectId);
      if (state && get().projectId === projectId) {
        const activeFilePath = get().activeFilePath;
        set({
          files: state.files,
          tree: buildFileTree(state.files),
          activeFilePath:
            activeFilePath && state.files[activeFilePath] !== undefined
              ? activeFilePath
              : Object.keys(state.files)[0] ?? null,
        });
      }

      if (signedIn && tokensRemaining != null) {
        set({
          tokens: { signedIn: true, balance: tokensRemaining },
        });
      }
    } catch (serverErr) {
      if (serverErr instanceof InsufficientTokensError) {
        set({
          tokens: { signedIn: true, balance: serverErr.balance },
        });
        updateAssistant({
          content: "You're out of tokens. Buy more tokens to continue generating.",
          status: "error",
        });
        return;
      }

      updateAssistant({
        content: "",
        status: "error",
        stageMessage:
          serverErr instanceof Error &&
          [
            "network error",
            "Failed to fetch",
            "Load failed",
            "generation-stream-ended",
          ].includes(serverErr.message)
            ? "Generation stopped because the connection was lost."
            : serverErr instanceof Error
              ? serverErr.message
              : "Something went wrong. Please try again.",
      });
    } finally {
      set({ isGenerating: false });
      updateAssistant({ durationMs: Date.now() - startedAt });

      const pkgAfter = get().files["package.json"] ?? "";
      if (
        get().serverStatus === "ready" &&
        dependenciesChanged(pkgBefore, pkgAfter)
      ) {
        terminalBus.writeLine("\u001b[36m[preview] Dependencies changed — restarting…\u001b[0m");
        void get().restartPreview();
      }

    }
  },

  setActiveFile: (path) => set({ activeFilePath: path }),

  writeFile: (path, content) => {
    set((s) => {
      const files = { ...s.files, [path]: content };
      return { files, tree: buildFileTree(files) };
    });
    const sandboxId = get().sandboxId;
    if (sandboxId) scheduleSandboxWrite(sandboxId, path, content);
  },

  createFile: (path) => {
    if (get().files[path] !== undefined) return;
    set((s) => {
      const files = { ...s.files, [path]: "" };
      return { files, tree: buildFileTree(files), activeFilePath: path };
    });
    const sandboxId = get().sandboxId;
    if (sandboxId) {
      void patchSandbox(sandboxId, {
        action: "writeFiles",
        files: { [path]: "" },
      }).catch(() => {});
    }
  },

  createFolder: (path) => {
    const clean = path.replace(/^\/+|\/+$/g, "");
    if (!clean) return;
    const keep = `${clean}/.gitkeep`;
    if (get().files[keep] !== undefined) return;
    set((s) => {
      const files = { ...s.files, [keep]: "" };
      return { files, tree: buildFileTree(files) };
    });
    const sandboxId = get().sandboxId;
    if (sandboxId) {
      void patchSandbox(sandboxId, {
        action: "writeFiles",
        files: { [keep]: "" },
      }).catch(() => {});
    }
  },

  deleteFile: (path) => {
    set((s) => {
      const files = { ...s.files };
      delete files[path];
      const activeFilePath = s.activeFilePath === path ? null : s.activeFilePath;
      return { files, tree: buildFileTree(files), activeFilePath };
    });
    cancelSandboxWrite(path);
    const sandboxId = get().sandboxId;
    if (sandboxId) {
      void patchSandbox(sandboxId, {
        action: "removeFiles",
        paths: [path],
      }).catch(() => {});
    }
  },

  deleteFolder: (path) => {
    const prefix = `${path.replace(/\/+$/, "")}/`;
    const targets = Object.keys(get().files).filter(
      (p) => p === path || p.startsWith(prefix),
    );
    if (targets.length === 0) return;
    set((s) => {
      const files = { ...s.files };
      for (const p of targets) delete files[p];
      const activeFilePath =
        s.activeFilePath && targets.includes(s.activeFilePath)
          ? null
          : s.activeFilePath;
      return { files, tree: buildFileTree(files), activeFilePath };
    });
    for (const p of targets) cancelSandboxWrite(p);
    const sandboxId = get().sandboxId;
    if (sandboxId) {
      void patchSandbox(sandboxId, {
        action: "removeFiles",
        paths: targets,
      }).catch(() => {});
    }
  },

  renameFile: (from, to) => {
    const content = get().files[from];
    if (content === undefined) return;
    set((s) => {
      const files = { ...s.files };
      files[to] = files[from] ?? "";
      delete files[from];
      const activeFilePath = s.activeFilePath === from ? to : s.activeFilePath;
      return { files, tree: buildFileTree(files), activeFilePath };
    });
    cancelSandboxWrite(from);
    const sandboxId = get().sandboxId;
    if (sandboxId) {
      void patchSandbox(sandboxId, {
        action: "renameFile",
        oldPath: from,
        newPath: to,
      }).catch(() => {});
    }
  },

  renameFolder: (from, to) => {
    const src = from.replace(/\/+$/, "");
    const dest = to.replace(/^\/+|\/+$/g, "");
    if (!dest || src === dest) return;
    const prefix = `${src}/`;
    const entries = Object.keys(get().files).filter(
      (p) => p === src || p.startsWith(prefix),
    );
    if (entries.length === 0) return;

    const moves = entries.map((p) => ({
      from: p,
      to: p === src ? dest : `${dest}/${p.slice(prefix.length)}`,
    }));

    set((s) => {
      const files = { ...s.files };
      let activeFilePath = s.activeFilePath;
      for (const m of moves) {
        files[m.to] = files[m.from] ?? "";
        delete files[m.from];
        if (activeFilePath === m.from) activeFilePath = m.to;
      }
      return { files, tree: buildFileTree(files), activeFilePath };
    });

    for (const m of moves) {
      cancelSandboxWrite(m.from);
      const sandboxId = get().sandboxId;
      if (sandboxId) {
        void patchSandbox(sandboxId, {
          action: "renameFile",
          oldPath: m.from,
          newPath: m.to,
        }).catch(() => {});
      }
    }
  },

  bootPreview: async () => {
    let sandboxId = get().sandboxId;
    const projectId = get().projectId;
    if (!sandboxId && projectId) {
      try {
        const state = await getProjectState(projectId);
        if (state?.sandboxId) {
          let response = await fetch(`/api/sandboxes/${state.sandboxId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reconnect" }),
          });
          if (response.status === 410) {
            response = await fetch(`/api/sandboxes/${state.sandboxId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "restart" }),
            });
          }
          if (response.ok) {
            const data = (await response.json()) as { sandboxId: string };
            sandboxId = data.sandboxId;
            set({ sandboxId });
          }
        }
      } catch { /* sandbox unavailable */ }
    }
    if (!sandboxId) {
      set({ serverStatus: "error" });
      terminalBus.writeLine("\u001b[31mSandbox is not ready.\u001b[0m");
      return;
    }

    set({ serverStatus: "installing", previewUrl: null });
    try {
      const onEvent = (event: PreviewEvent) => {
        if (event.type === "status") set({ serverStatus: event.status });
        if (event.type === "log") terminalBus.write(event.data);
        if (event.type === "ready") {
          set({ previewUrl: event.url, serverStatus: "ready" });
        }
      };

      try {
        await streamPreview(sandboxId, onEvent);
      } catch (error) {
        if (!(error instanceof Error) || error.name !== "SandboxNotFoundError") {
          throw error;
        }

        terminalBus.writeLine(
          "\u001b[36m[preview] Sandbox expired — recovering…\u001b[0m",
        );
        const response = await fetch(`/api/sandboxes/${sandboxId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restart" }),
        });
        if (!response.ok) {
          throw new Error(`Sandbox recovery failed (${response.status})`);
        }

        const data = (await response.json()) as { sandboxId: string };
        sandboxId = data.sandboxId;
        set({ sandboxId, serverStatus: "installing" });
        await streamPreview(sandboxId, onEvent);
      }
    } catch (err) {
      set({ serverStatus: "error" });
      terminalBus.writeLine(
        `\u001b[31m${err instanceof Error ? err.message : "Preview failed to boot"}\u001b[0m`,
      );
    }
  },

  restartPreview: async () => {
    set({ serverStatus: "starting", previewUrl: null });
    await get().bootPreview();
  },
}));
