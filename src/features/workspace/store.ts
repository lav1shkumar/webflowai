"use client";

import { create } from "zustand";
import { webContainerService, type ServerStatus } from "@/features/webcontainer/service";
import { buildFileTree, type FileNode } from "@/features/webcontainer/files";
import { terminalBus } from "@/features/workspace/terminal-bus";
import { getProjectState, saveProjectState } from "@/server/projects";
import { getCredits } from "@/server/credits";
import type { GenerationEvent } from "@/features/ai/types";
import { shortId } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreditsState {
  signedIn: boolean;
  balance: number;
  monthly: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "running" | "done" | "error";
  files?: string[];
  credits?: number;
  durationMs?: number;
  createdAt: number;
}

interface WorkspaceState {
  projectId: string | null;
  files: Record<string, string>;
  tree: FileNode[];
  activeFilePath: string | null;
  messages: ChatMessage[];
  serverStatus: ServerStatus;
  previewUrl: string | null;
  isGenerating: boolean;
  credits: CreditsState | null;

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

const containerSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();
function scheduleContainerSync(path: string, content: string): void {
  if (!webContainerService.isMounted) return;
  const existing = containerSyncTimers.get(path);
  if (existing) clearTimeout(existing);
  containerSyncTimers.set(
    path,
    setTimeout(() => {
      containerSyncTimers.delete(path);
      void webContainerService.syncFile(path, content);
    }, 200),
  );
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
  creditsUsed: number | null;
  creditsRemaining: number | null;
  signedIn: boolean;
}

async function runViaServer(
  input: {
    prompt: string;
    files: Record<string, string>;
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
    throw new InsufficientCreditsError(Number(data.balance ?? 0));
  }

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const result: ServerRunOutput = {
    summary: "Generation completed.",
    creditsUsed: null,
    creditsRemaining: null,
    signedIn: false,
  };

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
      result.summary = event.summary;
      result.signedIn = event.signedIn;
      result.creditsUsed = event.creditsUsed;
      result.creditsRemaining = event.creditsRemaining;
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

  return result;
}

class InsufficientCreditsError extends Error {
  balance: number;
  constructor(balance: number) {
    super("insufficient-credits");
    this.name = "InsufficientCreditsError";
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
  files: {},
  tree: [],
  activeFilePath: null,
  messages: [],
  serverStatus: "idle",
  previewUrl: null,
  isGenerating: false,
  credits: null,

  init: (projectId, initialPrompt) => {
    // Already on this project — nothing to do.
    if (get().projectId === projectId) return;

    set({
      projectId,
      files: {},
      tree: [],
      activeFilePath: null,
      messages: [],
      serverStatus: "idle",
      previewUrl: null,
    });

    terminalBus.clear();
    terminalBus.writeLine("\u001b[2mWelcome to the WebFlowAI workspace.\u001b[0m");

    webContainerService.setCallbacks({
      onStatus: (serverStatus) => set({ serverStatus }),
      onOutput: (chunk) => terminalBus.write(chunk),
      onServerReady: (url) => set({ previewUrl: url, serverStatus: "ready" }),
      onError: (message) => terminalBus.writeLine(`\u001b[31m${message}\u001b[0m`),
    });

    // Load credits.
    void (async () => {
      try {
        set({ credits: await getCredits() });
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

    const credits = get().credits;
    if (credits?.signedIn && credits.balance <= 0) {
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
        case "file": {
          const { change } = event;
          const content = change.op === "delete" ? "" : (change.content ?? "");
          set((s) => {
            const files = { ...s.files };
            if (change.op === "delete") {
              delete files[change.path];
            } else {
              files[change.path] = content;
            }
            return {
              files,
              tree: buildFileTree(files),
              activeFilePath: s.activeFilePath ?? change.path,
            };
          });
          if (change.op === "delete") {
            void webContainerService.syncDelete(change.path);
          } else {
            void webContainerService.syncFile(change.path, content);
          }
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? { ...m, files: [...(m.files ?? []), change.path] }
                : m,
            ),
          }));
          break;
        }
        case "log":
          terminalBus.writeLine(`\u001b[2m${event.message}\u001b[0m`);
          break;
      }
    };

    const pkgBefore = get().files["package.json"] ?? "";

    try {
      const { summary, creditsUsed, creditsRemaining, signedIn } =
        await runViaServer({ prompt, files: get().files }, onEvent);

      updateAssistant({
        content: summary,
        ...(creditsUsed != null ? { credits: creditsUsed } : {}),
      });

      if (signedIn && creditsRemaining != null) {
        set((s) => ({
          credits: {
            signedIn: true,
            balance: creditsRemaining,
            monthly: s.credits?.monthly ?? creditsRemaining,
          },
        }));
      }
    } catch (serverErr) {
      if (serverErr instanceof InsufficientCreditsError) {
        set((s) => ({
          credits: {
            signedIn: true,
            balance: serverErr.balance,
            monthly: s.credits?.monthly ?? 0,
          },
        }));
        updateAssistant({
          content: "You're out of credits. Top up your plan to continue generating.",
          status: "error",
        });
        return;
      }

      updateAssistant({
        content:
          serverErr instanceof Error
            ? `Generation failed: ${serverErr.message}`
            : "Generation failed — check the terminal for details.",
        status: "error",
      });
    } finally {
      set({ isGenerating: false });
      updateAssistant({ durationMs: Date.now() - startedAt });

      if (webContainerService.isMounted) {
        const pkgAfter = get().files["package.json"] ?? "";
        if (dependenciesChanged(pkgBefore, pkgAfter)) {
          terminalBus.writeLine("\u001b[36m[preview] Dependencies changed — reinstalling…\u001b[0m");
          void webContainerService.resyncDependencies();
        }
      }

      void (async () => {
        try {
          const s = get();
          await saveProjectState(projectId, {
            files: s.files,
            messages: s.messages
              .filter((m) => m.content)
              .map((m) => ({ role: m.role, content: m.content })),
          });
        } catch { /* persistence unavailable */ }
      })();
    }
  },

  setActiveFile: (path) => set({ activeFilePath: path }),

  writeFile: (path, content) => {
    set((s) => {
      const files = { ...s.files, [path]: content };
      return { files, tree: buildFileTree(files) };
    });
    scheduleContainerSync(path, content);
  },

  createFile: (path) => {
    if (get().files[path] !== undefined) return;
    set((s) => {
      const files = { ...s.files, [path]: "" };
      return { files, tree: buildFileTree(files), activeFilePath: path };
    });
    void webContainerService.syncFile(path, "");
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
    void webContainerService.syncFile(keep, "");
  },

  deleteFile: (path) => {
    set((s) => {
      const files = { ...s.files };
      delete files[path];
      const activeFilePath = s.activeFilePath === path ? null : s.activeFilePath;
      return { files, tree: buildFileTree(files), activeFilePath };
    });
    void webContainerService.syncDelete(path);
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
    for (const p of targets) void webContainerService.syncDelete(p);
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
    void webContainerService.syncDelete(from);
    void webContainerService.syncFile(to, content);
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
      void webContainerService.syncDelete(m.from);
      void webContainerService.syncFile(m.to, get().files[m.to] ?? "");
    }
  },

  bootPreview: async () => {
    if (!webContainerService.isSupported) {
      terminalBus.writeLine(
        "\u001b[33mWebContainers require a cross-origin-isolated context. Preview runs in supported browsers.\u001b[0m",
      );
      return;
    }
    try {
      await webContainerService.start(get().files);
    } catch (err) {
      terminalBus.writeLine(
        `\u001b[31m${err instanceof Error ? err.message : "Preview failed to boot"}\u001b[0m`,
      );
    }
  },

  restartPreview: async () => {
    set({ serverStatus: "starting", previewUrl: null });
    await webContainerService.restart();
  },
}));
