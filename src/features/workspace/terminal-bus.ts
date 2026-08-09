"use client";

interface TerminalSubscriber {
  write: (chunk: string) => void;
  clear: () => void;
}

/**
 * A tiny pub/sub bridge between producers of terminal output (the
 * sandbox process streams and the generation pipeline) and the xterm.js
 * renderer. Output is raw — ANSI escape codes are preserved so xterm can
 * interpret cursor moves, line clears, colors, and spinners correctly.
 *
 * A bounded replay buffer lets a freshly-mounted terminal catch up on output
 * that was produced before it subscribed.
 */
class TerminalBus {
  private subscribers = new Set<TerminalSubscriber>();
  private buffer: string[] = [];

  write(chunk: string): void {
    this.buffer.push(chunk);
    if (this.buffer.length > 4000) this.buffer.shift();
    this.subscribers.forEach((subscriber) => subscriber.write(chunk));
  }

  /** Write a discrete line (adds a CRLF for correct xterm line breaks). */
  writeLine(line: string): void {
    this.write(`${line}\r\n`);
  }

  clear(): void {
    this.buffer = [];
    this.subscribers.forEach((subscriber) => subscriber.clear());
  }

  /** Replay buffered output, then subscribe to future output and clears. */
  subscribe(subscriber: TerminalSubscriber): () => void {
    this.buffer.forEach((chunk) => subscriber.write(chunk));
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }
}

export const terminalBus = new TerminalBus();
