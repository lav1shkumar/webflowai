"use client";

import { create } from "zustand";
import { Orchestrator } from "@/features/ai/orchestrator";
import { webContainerService, type ServerStatus } from "@/features/webcontainer/service";
import {
  buildFileTree,
  normalizeProjectFiles,
  sanitizePackageJson,
  type FileNode,
} from "@/features/webcontainer/files";
import { terminalBus } from "@/features/workspace/terminal-bus";
import { getProjectState, saveProjectState } from "@/server/projects";
import { getCredits } from "@/server/credits";
import type { AgentEvent, AgentKind } from "@/features/ai/types";
import { shortId } from "@/lib/utils";

/** Thrown when the server blocks a generation due to an exhausted balance. */
class InsufficientCreditsError extends Error {
  balance: number;
  constructor(balance: number) {
    super("insufficient-credits");
    this.name = "InsufficientCreditsError";
    this.balance = balance;
  }
}

export interface CreditsState {
  signedIn: boolean;
  balance: number;
  monthly: number;
}

export interface ChatStep {
  agent: AgentKind;
  label: string;
  status: "running" | "done" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: ChatStep[];
  files?: string[];
  /** Credits charged for this assistant turn (when metered). */
  credits?: number;
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

  /** Credit balance for the signed-in user; null until loaded. */
  credits: CreditsState | null;

  /** Project whose persisted state has finished loading (gates auto-seed). */
  hydratedProjectId: string | null;
  /** Project whose initial prompt has already been auto-sent (dedupes seed). */
  seededProjectId: string | null;

  // lifecycle
  init: (projectId: string, initialPrompt?: string) => void;
  sendPrompt: (prompt: string) => Promise<void>;
  fetchCredits: () => Promise<void>;

  // files
  setActiveFile: (path: string) => void;
  writeFile: (path: string, content: string) => void;
  createFile: (path: string) => void;
  createFolder: (path: string) => void;
  deleteFile: (path: string) => void;
  deleteFolder: (path: string) => void;
  renameFile: (from: string, to: string) => void;
  renameFolder: (from: string, to: string) => void;

  // terminal / preview
  appendTerminal: (line: string) => void;
  clearTerminal: () => void;
  bootPreview: () => Promise<void>;
  restartPreview: () => Promise<void>;
}

const agentLabels: Record<AgentKind, string> = {
  planner: "Planning",
  architect: "Designing architecture",
  generator: "Generating code",
  "file-operation": "Applying changes",
  reviewer: "Reviewing output",
};

const orchestrator = new Orchestrator({ maxReviewRetries: 1 });

function rebuildTree(files: Record<string, string>): FileNode[] {
  return buildFileTree(files);
}

/**
 * Debounced per-path sync of editor edits into the running WebContainer.
 * Coalesces rapid keystrokes so we don't thrash the FS / HMR. No-op until the
 * project is mounted.
 */
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

/** Normalize a package.json to just its dependency maps for change detection. */
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

/** True when package.json dependency sets differ (ignores formatting/scripts). */
function dependenciesChanged(before: string, after: string): boolean {
  if (!after) return false;
  return depsSignature(before) !== depsSignature(after);
}

const AGENT_EVENT_TYPES = new Set([
  "phase",
  "log",
  "token",
  "file",
  "plan",
  "blueprint",
  "review",
  "tool",
  "error",
]);

interface ServerRunOutput {
  summary: string | null;
  fileCount: number;
  ok: boolean;
  creditsUsed: number | null;
  creditsRemaining: number | null;
  signedIn: boolean;
}

/**
 * POST to the server generation route and consume its NDJSON event stream,
 * forwarding each {@link AgentEvent} to the live UI handler. Resolves once the
 * stream's terminal `done` marker is received; throws on `fatal` or transport
 * errors so the caller can fall back to the in-browser pipeline. Throws an
 * {@link InsufficientCreditsError} on HTTP 402 so the caller can gate instead
 * of falling back.
 */
async function runViaServer(
  input: {
    projectId: string;
    prompt: string;
    files: Record<string, string>;
    history: { role: "user" | "assistant"; content: string }[];
  },
  onEvent: (event: AgentEvent) => void,
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
    summary: null,
    fileCount: 0,
    ok: false,
    creditsUsed: null,
    creditsRemaining: null,
    signedIn: false,
  };

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let evt: Record<string, unknown>;
    try {
      evt = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return;
    }

    if (evt.type === "fatal") {
      throw new Error(String(evt.message ?? "Generation failed"));
    }
    if (evt.type === "done") {
      result.ok = Boolean(evt.ok);
      result.fileCount = Number(evt.fileCount ?? 0);
      result.signedIn = Boolean(evt.signedIn);
      result.creditsUsed =
        evt.creditsUsed != null ? Number(evt.creditsUsed) : null;
      result.creditsRemaining =
        evt.creditsRemaining != null ? Number(evt.creditsRemaining) : null;
      return;
    }
    if (evt.type === "review") {
      const review = evt.review as { summary?: string } | undefined;
      if (review?.summary) result.summary = review.summary;
    }
    if (typeof evt.type === "string" && AGENT_EVENT_TYPES.has(evt.type)) {
      onEvent(evt as unknown as AgentEvent);
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      handleLine(line);
    }
  }
  if (buffer) handleLine(buffer);

  return result;
}

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
  hydratedProjectId: null,
  seededProjectId: null,

  init: (projectId, initialPrompt) => {
    const switching = get().projectId !== projectId;

    // Load the current credit balance for gating (signed-in users).
    void get().fetchCredits();

    // Send the initial prompt exactly once per project — but only after
    // hydration has completed and confirmed the project is empty, and only
    // while the chat is still idle. Safe to call repeatedly (e.g. when the
    // `?prompt=` search param resolves a render after the first mount, or
    // under React StrictMode's double-invoke).
    const trySeed = () => {
      const s = get();
      if (
        initialPrompt &&
        s.projectId === projectId &&
        s.hydratedProjectId === projectId &&
        s.seededProjectId !== projectId &&
        s.messages.length === 0 &&
        !s.isGenerating
      ) {
        set({ seededProjectId: projectId });
        void get().sendPrompt(initialPrompt);
      }
    };

    // Re-init for the same project (e.g. a late-arriving prompt param): don't
    // reset state, just attempt to seed now that we may have a prompt.
    if (!switching) {
      trySeed();
      return;
    }

    set({
      projectId,
      files: {},
      tree: [],
      activeFilePath: null,
      messages: [],
      serverStatus: "idle",
      previewUrl: null,
      hydratedProjectId: null,
      seededProjectId: null,
    });

    terminalBus.clear();
    terminalBus.writeLine("\u001b[2mWelcome to the WebFlowAI workspace.\u001b[0m");

    webContainerService.setCallbacks({
      onStatus: (serverStatus) => set({ serverStatus }),
      onOutput: (chunk) => terminalBus.write(chunk),
      onServerReady: (url) => set({ previewUrl: url, serverStatus: "ready" }),
      onError: (message) => terminalBus.writeLine(`\u001b[31m${message}\u001b[0m`),
    });

    // Hydrate from the database, then auto-run the seed prompt only when the
    // project is brand new (no persisted files/messages).
    void (async () => {
      try {
        const state = await getProjectState(projectId);
        if (state && get().projectId === projectId) {
          const restored: ChatMessage[] = state.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          }));
          set({
            files: state.files,
            tree: rebuildTree(state.files),
            messages: restored,
            activeFilePath: Object.keys(state.files)[0] ?? null,
          });
        }
      } catch {
        /* persistence unavailable — run in-memory */
      } finally {
        // Mark hydration complete (even on failure) so seeding can proceed.
        if (get().projectId === projectId) {
          set({ hydratedProjectId: projectId });
        }
      }
      trySeed();
    })();
  },

  sendPrompt: async (prompt) => {
    const projectId = get().projectId;
    if (!projectId || get().isGenerating) return;

    // Block when a signed-in user's balance is exhausted — they must top up.
    const credits = get().credits;
    if (credits?.signedIn && credits.balance <= 0) {
      get().appendTerminal(
        "\u001b[33m[chat] Out of credits — top up to keep building.\u001b[0m",
      );
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
      steps: [],
      files: [],
      createdAt: Date.now(),
    };

    set((s) => ({
      messages: [...s.messages, userMessage, assistantMessage],
      isGenerating: true,
    }));

    const updateAssistant = (patch: Partial<ChatMessage>) =>
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantId ? { ...m, ...patch } : m,
        ),
      }));

    const upsertStep = (agent: AgentKind, status: ChatStep["status"]) => {
      set((s) => ({
        messages: s.messages.map((m) => {
          if (m.id !== assistantId) return m;
          const steps = [...(m.steps ?? [])];
          const idx = steps.findIndex((st) => st.agent === agent);
          const next: ChatStep = {
            agent,
            label: agentLabels[agent],
            status,
          };
          if (idx >= 0) steps[idx] = next;
          else steps.push(next);
          return { ...m, steps };
        }),
      }));
    };

    const onEvent = (event: AgentEvent) => {
      switch (event.type) {
        case "phase":
          if (event.phase === "running") upsertStep(event.agent, "running");
          if (event.phase === "succeeded") upsertStep(event.agent, "done");
          if (event.phase === "failed") upsertStep(event.agent, "error");
          break;
        case "log":
          get().appendTerminal(`[${event.agent}] ${event.message}`);
          break;
        case "tool":
          get().appendTerminal(
            `\u001b[36m[${event.agent}] ${event.detail}\u001b[0m`,
          );
          break;
        case "file": {
          const { change } = event;
          const synced =
            change.op === "delete"
              ? ""
              : change.path.endsWith("package.json")
                ? sanitizePackageJson(change.content ?? "")
                : (change.content ?? "");
          set((s) => {
            const files = { ...s.files };
            if (change.op === "delete") {
              delete files[change.path];
            } else {
              files[change.path] = synced;
            }
            return {
              files,
              tree: rebuildTree(files),
              activeFilePath: s.activeFilePath ?? change.path,
            };
          });
          // Mirror the change into the running WebContainer so the live
          // preview updates immediately (no-op until the project is mounted).
          if (change.op === "delete") {
            void webContainerService.syncDelete(change.path);
          } else {
            void webContainerService.syncFile(change.path, synced);
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
        case "review":
          updateAssistant({
            content: event.review.summary,
          });
          break;
        case "error":
          get().appendTerminal(`\u001b[31m[${event.agent}] ${event.message}\u001b[0m`);
          break;
      }
    };

    const history = get().messages
      .filter((m) => m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    // Snapshot deps so we can reinstall only if package.json deps change.
    const pkgBefore = get().files["package.json"] ?? "";

    try {
      // Primary path: run the multi-agent pipeline server-side (where the
      // model API key lives) and stream events back as NDJSON.
      const { summary, fileCount, ok, creditsUsed, creditsRemaining, signedIn } =
        await runViaServer(
          { projectId, prompt, files: get().files, history },
          onEvent,
        );
      updateAssistant({
        content:
          summary ??
          (ok
            ? `Done — applied ${fileCount} file change(s).`
            : "I couldn't complete that — check the terminal for details."),
        ...(creditsUsed != null ? { credits: creditsUsed } : {}),
      });
      // Reflect the new balance reported by the server.
      if (signedIn && creditsRemaining != null) {
        set((s) => ({
          credits: {
            signedIn: true,
            balance: creditsRemaining,
            monthly: s.credits?.monthly ?? creditsRemaining,
          },
        }));
        if (creditsUsed != null) {
          get().appendTerminal(
            `\u001b[2m[chat] Used ${creditsUsed} credit(s) · ${creditsRemaining} remaining.\u001b[0m`,
          );
        }
      }
    } catch (serverErr) {
      // Out of credits: gate hard — never fall back to the local pipeline.
      if (serverErr instanceof InsufficientCreditsError) {
        set((s) => ({
          credits: {
            signedIn: true,
            balance: serverErr.balance,
            monthly: s.credits?.monthly ?? 0,
          },
        }));
        updateAssistant({
          content:
            "You're out of credits. Top up your plan to continue generating.",
        });
        get().appendTerminal(
          "\u001b[33m[chat] Out of credits — top up to keep building.\u001b[0m",
        );
        return;
      }

      // Fallback: the in-browser demo pipeline (e.g. static hosting / offline).
      get().appendTerminal(
        `\u001b[33m[chat] Server pipeline unavailable, using local demo mode.\u001b[0m`,
      );
      try {
        const result = await orchestrator.run({
          projectId,
          prompt,
          files: get().files,
          history,
          emit: onEvent,
        });
        updateAssistant({
          content:
            result.context.review?.summary ??
            `Done — applied ${result.changes.length} file change(s).`,
        });
      } catch {
        updateAssistant({
          content:
            serverErr instanceof Error
              ? `Generation failed: ${serverErr.message}`
              : "Generation failed.",
        });
      }
    } finally {
      set({ isGenerating: false });

      // If the preview is running and the generation changed dependencies,
      // reinstall + restart so the live app picks them up. Source-only edits
      // were already mirrored into the container during streaming (HMR).
      if (webContainerService.isMounted) {
        const pkgAfter = get().files["package.json"] ?? "";
        if (dependenciesChanged(pkgBefore, pkgAfter)) {
          get().appendTerminal(
            "\u001b[36m[preview] Dependencies changed — reinstalling…\u001b[0m",
          );
          void webContainerService.resyncDependencies();
        }
      }

      // Persist the resulting files + chat. No-op for ephemeral/demo projects
      // (the action returns ok:false when there's no matching DB project).
      void (async () => {
        try {
          const s = get();
          await saveProjectState(projectId, {
            files: s.files,
            messages: s.messages
              .filter((m) => m.content)
              .map((m) => ({ role: m.role, content: m.content })),
          });
        } catch {
          /* persistence unavailable */
        }
      })();
    }
  },

  setActiveFile: (path) => set({ activeFilePath: path }),

  fetchCredits: async () => {
    try {
      const info = await getCredits();
      set({ credits: info });
    } catch {
      /* credits unavailable — leave gating disabled */
    }
  },

  writeFile: (path, content) => {    set((s) => {
      const files = { ...s.files, [path]: content };
      return { files, tree: rebuildTree(files) };
    });
    // Debounced mirror into the running container (no-op if not mounted).
    scheduleContainerSync(path, content);
  },

  createFile: (path) => {
    if (get().files[path] !== undefined) return;
    set((s) => {
      const files = { ...s.files, [path]: "" };
      return { files, tree: rebuildTree(files), activeFilePath: path };
    });
    void webContainerService.syncFile(path, "");
  },

  createFolder: (path) => {
    const clean = path.replace(/^\/+|\/+$/g, "");
    if (!clean) return;
    // Folders only exist implicitly (the file map is flat), so we materialize
    // an empty directory with a conventional placeholder file.
    const keep = `${clean}/.gitkeep`;
    if (get().files[keep] !== undefined) return;
    set((s) => {
      const files = { ...s.files, [keep]: "" };
      return { files, tree: rebuildTree(files) };
    });
    void webContainerService.syncFile(keep, "");
  },

  deleteFile: (path) => {
    set((s) => {
      const files = { ...s.files };
      delete files[path];
      const activeFilePath =
        s.activeFilePath === path ? null : s.activeFilePath;
      return { files, tree: rebuildTree(files), activeFilePath };
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
      return { files, tree: rebuildTree(files), activeFilePath };
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
      return { files, tree: rebuildTree(files), activeFilePath };
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
      return { files, tree: rebuildTree(files), activeFilePath };
    });

    for (const m of moves) {
      void webContainerService.syncDelete(m.from);
      void webContainerService.syncFile(m.to, get().files[m.to] ?? "");
    }
  },

  appendTerminal: (line) => terminalBus.writeLine(line),

  clearTerminal: () => terminalBus.clear(),

  bootPreview: async () => {
    if (!webContainerService.isSupported) {
      get().appendTerminal(
        "\u001b[33mWebContainers require a cross-origin-isolated context. Preview runs in supported browsers.\u001b[0m",
      );
      return;
    }
    try {
      // Normalize scripts (e.g. ${PORT:-3000}) that the WebContainer shell
      // can't expand, and reflect the fix back into the editor/state.
      const normalized = normalizeProjectFiles(get().files);
      set({ files: normalized, tree: rebuildTree(normalized) });
      await webContainerService.mount(normalized);
      await webContainerService.startDevServer();
    } catch (err) {
      get().appendTerminal(
        `\u001b[31m${err instanceof Error ? err.message : "Preview failed to boot"}\u001b[0m`,
      );
    }
  },

  restartPreview: async () => {
    set({ serverStatus: "starting", previewUrl: null });
    await webContainerService.restart();
  },
}));
