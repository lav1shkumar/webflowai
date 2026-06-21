"use client";

type DataListener = (chunk: string) => void;
type ClearListener = () => void;

/**
 * A tiny pub/sub bridge between producers of terminal output (the
 * WebContainer process streams and the agent pipeline) and the xterm.js
 * renderer. Output is raw — ANSI escape codes are preserved so xterm can
 * interpret cursor moves, line clears, colors, and spinners correctly.
 *
 * A bounded replay buffer lets a freshly-mounted terminal catch up on output
 * that was produced before it subscribed.
 */
class TerminalBus {
  private dataListeners = new Set<DataListener>();
  private clearListeners = new Set<ClearListener>();
  private buffer: string[] = [];
  private readonly maxBuffer = 4000;

  write(chunk: string): void {
    this.buffer.push(chunk);
    if (this.buffer.length > this.maxBuffer) this.buffer.shift();
    this.dataListeners.forEach((l) => l(chunk));
  }

  /** Write a discrete line (adds a CRLF for correct xterm line breaks). */
  writeLine(line: string): void {
    this.write(`${line}\r\n`);
  }

  clear(): void {
    this.buffer = [];
    this.clearListeners.forEach((l) => l());
  }

  onData(listener: DataListener): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  onClear(listener: ClearListener): () => void {
    this.clearListeners.add(listener);
    return () => this.clearListeners.delete(listener);
  }

  /** Replay buffered output into a listener (e.g. on terminal mount). */
  replay(listener: DataListener): void {
    this.buffer.forEach((chunk) => listener(chunk));
  }
}

export const terminalBus = new TerminalBus();
