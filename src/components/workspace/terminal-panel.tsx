"use client";

import * as React from "react";
import { Trash2, TerminalSquare } from "lucide-react";
import { useTheme } from "next-themes";
import type { ITheme, Terminal as XTerm } from "@xterm/xterm";
import type { FitAddon as XFitAddon } from "@xterm/addon-fit";
import { terminalBus } from "@/features/workspace/terminal-bus";
import { useWorkspace } from "@/features/workspace/store";
import "@xterm/xterm/css/xterm.css";

/** xterm color palettes for each theme. */
const darkTheme: ITheme = {
  background: "#0E0C0B",
  foreground: "#e4e4e7",
  cursor: "#fbe2a7",
  cursorAccent: "#0d0e12",
  selectionBackground: "rgba(255,255,255,0.18)",
  black: "#18181b",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#fbbf24",
  blue: "#60a5fa",
  magenta: "#a78bfa",
  cyan: "#22d3ee",
  white: "#e4e4e7",
  brightBlack: "#52525b",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#fde68a",
  brightBlue: "#93c5fd",
  brightMagenta: "#c4b5fd",
  brightCyan: "#67e8f9",
  brightWhite: "#fafafa",
};

const lightTheme: ITheme = {
  background: "#faf9f7",
  foreground: "#1c1610",
  cursor: "#b8895e",
  cursorAccent: "#faf9f7",
  selectionBackground: "rgba(0,0,0,0.12)",
  black: "#1c1610",
  red: "#dc2626",
  green: "#16a34a",
  yellow: "#b45309",
  blue: "#2563eb",
  magenta: "#7c3aed",
  cyan: "#0891b2",
  white: "#5c5347",
  brightBlack: "#78716c",
  brightRed: "#ef4444",
  brightGreen: "#22c55e",
  brightYellow: "#d97706",
  brightBlue: "#3b82f6",
  brightMagenta: "#8b5cf6",
  brightCyan: "#06b6d4",
  brightWhite: "#1c1610",
};

export function TerminalPanel() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const termRef = React.useRef<XTerm | null>(null);
  const [terminalReady, setTerminalReady] = React.useState(false);
  const sandboxId = useWorkspace((state) => state.sandboxId);
  const isGenerating = useWorkspace((state) => state.isGenerating);
  const isGeneratingRef = React.useRef(isGenerating);
  isGeneratingRef.current = isGenerating;
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const theme = isLight ? lightTheme : darkTheme;

  React.useEffect(() => {
    let disposed = false;
    let cleanup: () => void = () => {};

    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (disposed || !containerRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontSize: 12.5,
        lineHeight: 1.35,
        fontFamily:
          "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace",
        theme,
        disableStdin: isGeneratingRef.current,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      safeFit(fit);
      termRef.current = term;

      const unsubscribe = terminalBus.subscribe({
        write: (chunk) => term.write(chunk),
        clear: () => term.clear(),
      });

      const ro = new ResizeObserver(() => {
        safeFit(fit);
      });
      ro.observe(containerRef.current);
      setTerminalReady(true);

      cleanup = () => {
        unsubscribe();
        ro.disconnect();
        term.dispose();
        termRef.current = null;
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
    // Theme is applied live via the separate effect below, so the terminal is
    // not re-created on theme change (which would clear scrollback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const term = termRef.current;
    if (!terminalReady || !sandboxId || !term) return;

    const controller = new AbortController();
    const endpoint = `/api/sandboxes/${sandboxId}/terminal`;
    let pid: number | null = null;
    let stopped = false;
    let atPrompt = false;
    let promptTail = "";
    let localInputLength = 0;
    let pendingEcho = "";
    let pendingInput = "";
    let sendingInput = false;

    const send = (body: object) =>
      fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => undefined);

    const flushInput = async () => {
      if (!pid || sendingInput || !pendingInput) return;
      const data = pendingInput;
      pendingInput = "";
      sendingInput = true;
      await send({ action: "input", pid, data });
      sendingInput = false;
      void flushInput();
    };

    const writeInput = (data: string) => {
      if (!atPrompt) return;
      if (data === "\r") {
        term.write("\r\n");
        pendingEcho += data;
        atPrompt = false;
        promptTail = "";
        localInputLength = 0;
      } else if (data === "\u007f" && localInputLength > 0) {
        term.write("\b \b");
        pendingEcho += data;
        localInputLength--;
      } else if (
        [...data].every((character) => {
          const code = character.charCodeAt(0);
          return code >= 32 && code !== 127;
        })
      ) {
        term.write(data);
        pendingEcho += data;
        localInputLength += [...data].length;
      }
    };

    const removeEcho = (data: string) => {
      let output = data;
      while (pendingEcho && output) {
        const expected = pendingEcho[0];
        if (output.charCodeAt(0) === 27 && output[1] === "[") {
          let end = 2;
          while (end < output.length) {
            const code = output.charCodeAt(end);
            if (code >= 64 && code <= 126) break;
            end++;
          }
          if (end === output.length) break;
          output = output.slice(end + 1);
          continue;
        }
        if (expected !== "\r" && output[0] === "\r") {
          output = output.slice(1);
          continue;
        }
        if (expected === "\r" && output.startsWith("\r\n")) {
          output = output.slice(2);
        } else if (expected === "\r" && (output[0] === "\r" || output[0] === "\n")) {
          output = output.slice(1);
        } else if (expected === "\u007f" && output.startsWith("\b \b")) {
          output = output.slice(3);
        } else if (output[0] === expected) {
          output = output.slice(1);
        } else {
          pendingEcho = "";
          break;
        }
        pendingEcho = pendingEcho.slice(1);
      }
      return output;
    };

    const keyDisposable = term.onData((data) => {
      if (isGeneratingRef.current) return;
      writeInput(data);
      pendingInput += data;
      void flushInput();
    });
    const resizeDisposable = term.onResize(({ cols, rows }) => {
      if (pid) void send({ action: "resize", pid, cols, rows });
    });

    void (async () => {
      while (!controller.signal.aborted && !stopped) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pid: pid ?? undefined,
              cols: term.cols,
              rows: term.rows,
            }),
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            throw new Error(`Terminal failed (${response.status})`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!stopped) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line) continue;
              const event = JSON.parse(line);
              if (event.type === "ready") {
                pid = event.pid;
                atPrompt = true;
                void flushInput();
              }
              if (event.type === "data") {
                const output = removeEcho(event.data);
                if (output) {
                  terminalBus.write(output);
                  promptTail = (promptTail + output).slice(-200);
                  if (promptTail.includes("$") || promptTail.includes("#")) {
                    atPrompt = true;
                  }
                }
              }
              if (event.type === "exit") stopped = true;
              if (event.type === "error") {
                terminalBus.writeLine(`\u001b[31m${event.message}\u001b[0m`);
                stopped = true;
              }
            }
          }

          if (!pid) stopped = true;
        } catch (error) {
          if (!controller.signal.aborted) {
            terminalBus.writeLine(
              `\u001b[31m${error instanceof Error ? error.message : "Terminal failed"}\u001b[0m`,
            );
          }
          stopped = true;
        }
      }
    })();

    return () => {
      controller.abort();
      keyDisposable.dispose();
      resizeDisposable.dispose();
      if (pid) void send({ action: "kill", pid });
    };
  }, [sandboxId, terminalReady]);

  // Update the xterm palette live when the app theme changes.
  React.useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = theme;
    }
  }, [theme]);

  React.useEffect(() => {
    if (termRef.current) {
      termRef.current.options.disableStdin = isGenerating;
    }
  }, [isGenerating]);

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <TerminalSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Terminal
        </span>
        <button
          onClick={() => terminalBus.clear()}
          disabled={isGenerating}
          className="ml-auto rounded p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Clear terminal"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full overflow-hidden px-2 py-1" />
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-sm text-muted-foreground backdrop-blur-sm">
            Terminal is locked while code is generating…
          </div>
        )}
      </div>
    </div>
  );
}

function safeFit(fit: XFitAddon): void {
  try {
    fit.fit();
  } catch {
    /* container not measured yet */
  }
}
