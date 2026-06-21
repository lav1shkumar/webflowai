"use client";

import * as React from "react";
import { Trash2, TerminalSquare } from "lucide-react";
import type { Terminal as XTerm } from "@xterm/xterm";
import type { FitAddon as XFitAddon } from "@xterm/addon-fit";
import { webContainerService } from "@/features/webcontainer/service";
import { terminalBus } from "@/features/workspace/terminal-bus";
import "@xterm/xterm/css/xterm.css";

/**
 * Interactive terminal backed by xterm.js.
 *
 * xterm correctly interprets ANSI escape sequences (cursor moves, line
 * clears, spinners, colors) emitted by npm and the dev server — fixing the
 * raw-escape "gibberish" a naive renderer produces. Output arrives via the
 * {@link terminalBus}; keystrokes are forwarded to an interactive `jsh` shell
 * running inside the WebContainer.
 */
export function TerminalPanel() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const termRef = React.useRef<XTerm | null>(null);

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
        convertEol: false,
        cursorBlink: true,
        fontSize: 12.5,
        lineHeight: 1.35,
        fontFamily:
          "ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, monospace",
        theme: {
          background: "#0d0e12",
          foreground: "#e4e4e7",
          cursor: "#8aa0ff",
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
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      safeFit(fit);
      termRef.current = term;

      // Render buffered output, then stream live output.
      terminalBus.replay((chunk) => term.write(chunk));
      const offData = terminalBus.onData((chunk) => term.write(chunk));
      const offClear = terminalBus.onClear(() => term.clear());

      // Forward keystrokes to the interactive shell.
      const keyDisposable = term.onData((data) =>
        webContainerService.writeToShell(data),
      );

      // Boot the interactive shell (best-effort; needs cross-origin isolation).
      if (webContainerService.isSupported) {
        try {
          await webContainerService.startShell(term.cols, term.rows);
        } catch {
          /* shell is optional; logs still render */
        }
      } else {
        term.writeln(
          "\u001b[33mInteractive shell requires a cross-origin-isolated browser (Chrome/Edge desktop).\u001b[0m",
        );
      }

      const ro = new ResizeObserver(() => {
        safeFit(fit);
        webContainerService.resizeShell(term.cols, term.rows);
      });
      ro.observe(containerRef.current);

      cleanup = () => {
        offData();
        offClear();
        keyDisposable.dispose();
        ro.disconnect();
        term.dispose();
        termRef.current = null;
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <div className="flex h-full flex-col bg-[#0d0e12]">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <TerminalSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Terminal
        </span>
        <button
          onClick={() => terminalBus.clear()}
          className="ml-auto rounded p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
          aria-label="Clear terminal"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden px-2 py-1" />
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
