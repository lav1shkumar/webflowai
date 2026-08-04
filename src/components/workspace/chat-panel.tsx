"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUp,
  Check,
  Clock,
  Coins,
  FileText,
  Loader2,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  useWorkspace,
  type ChatMessage,
  type TokensState,
} from "@/features/workspace/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const BILLING_HREF = "/settings/billing";

export function ChatPanel() {
  const messages = useWorkspace((s) => s.messages);
  const isGenerating = useWorkspace((s) => s.isGenerating);
  const sendPrompt = useWorkspace((s) => s.sendPrompt);
  const tokens = useWorkspace((s) => s.tokens);
  const [value, setValue] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const outOfTokens = Boolean(tokens?.signedIn && tokens.balance <= 0);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const submit = () => {
    const text = value.trim();
    if (!text || isGenerating || outOfTokens) return;
    setValue("");
    void sendPrompt(text);
  };

  return (
    <div className="flex h-full flex-col bg-card/20">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">AI Chat</span>
        <TokensPill tokens={tokens} />
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar flex-1 space-y-5 overflow-y-auto p-4"
      >
        {messages.length === 0 && <EmptyChat />}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      {outOfTokens ? (
        <TopupGate />
      ) : (
        <div className="border-t border-border p-3">
          <div className="relative">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask for a change, a feature, or a fix…"
              className="min-h-[60px] resize-none border-border bg-background/40 pr-12 text-sm"
              disabled={isGenerating}
            />
            <Button
              size="icon-sm"
              variant="brand"
              className="absolute bottom-2.5 right-2.5"
              onClick={submit}
              disabled={!value.trim() || isGenerating}
              aria-label="Send"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <p className="text-[11px] text-muted-foreground">
              Enter to send · Shift+Enter for new line
            </p>
            {tokens?.signedIn && tokens.balance > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {tokens.balance} tokens left
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TokensPill({ tokens }: { tokens: TokensState | null }) {
  if (!tokens?.signedIn) return null;
  const empty = tokens.balance <= 0;
  const low = !empty && tokens.balance <= 20;
  return (
    <Link
      href={BILLING_HREF}
      title="Tokens — buy more"
      className={cn(
        "ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
        empty
          ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/15"
          : low
            ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15"
            : "border-border bg-foreground/[0.03] text-muted-foreground hover:text-foreground",
      )}
    >
      <Coins className="h-3 w-3" />
      {Math.max(0, tokens.balance)} tokens
    </Link>
  );
}

function TopupGate() {
  return (
    <div className="border-t border-border p-3">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15">
          <Coins className="h-5 w-5 text-amber-400" />
        </div>
        <p className="mt-2 text-sm font-medium">You&apos;re out of tokens</p>
        <p className="mx-auto mt-0.5 max-w-[240px] text-xs text-muted-foreground">
          Buy more tokens to keep building with AI. Your project is safe.
        </p>
        <Button asChild variant="brand" size="sm" className="mt-3 w-full">
          <Link href={BILLING_HREF}>
            <Zap className="h-3.5 w-3.5" /> Buy tokens
          </Link>
        </Button>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient">
        <Sparkles className="h-6 w-6 text-white" />
      </div>
      <p className="mt-4 text-sm font-medium">Describe what to build</p>
      <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
        The AI will generate and update your project files.
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary/15 px-3.5 py-2.5 text-sm text-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px]">AI</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-2.5">
        {message.status && (
          <GenerationStatus
            status={message.status}
            fileCount={dedupe(message.files ?? []).length}
          />
        )}

        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dedupe(message.files).map((path) => (
              <span
                key={path}
                className="inline-flex items-center gap-1 rounded-md bg-foreground/[0.04] px-2 py-1 text-[11px] text-muted-foreground"
              >
                <FileText className="h-3 w-3" />
                {path}
              </span>
            ))}
          </div>
        )}

        {message.content && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {message.content}
          </p>
        )}

        {(typeof message.tokens === "number" && message.tokens > 0) ||
        typeof message.durationMs === "number" ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {typeof message.durationMs === "number" && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(message.durationMs)}
              </span>
            )}
            {typeof message.tokens === "number" && message.tokens > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Coins className="h-3 w-3" />
                {message.tokens} token{message.tokens === 1 ? "" : "s"}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GenerationStatus({
  status,
  fileCount,
}: {
  status: NonNullable<ChatMessage["status"]>;
  fileCount: number;
}) {
  const running = status === "running";
  const done = status === "done";
  const label = running
    ? "Generating code"
    : done
      ? "Code generated"
      : "Generation failed";
  const detail = running
    ? "Working…"
    : done && fileCount > 0
      ? `${fileCount} file${fileCount === 1 ? "" : "s"}`
      : done
        ? "Done"
        : "Failed";

  return (
    <div className="rounded-xl border border-border bg-foreground/[0.02] p-3">
      <div className="flex gap-3">
        <span
          className={cn(
            "relative flex h-[26px] w-[26px] items-center justify-center rounded-full border",
            done && "border-transparent bg-primary text-primary-foreground",
            running && "border-primary/50 bg-primary/10 text-primary",
            status === "error" &&
              "border-red-500/40 bg-red-500/10 text-red-400",
          )}
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : done ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </span>
        <div>
          <div
            className={cn(
              "text-xs font-medium leading-6",
              status === "error" ? "text-red-400" : "text-foreground",
            )}
          >
            {label}
          </div>
          <div className="-mt-0.5 text-[11px] text-muted-foreground">
            {detail}
          </div>
        </div>
      </div>
    </div>
  );
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

/** Human-friendly elapsed time, e.g. "1.2s", "850ms", "2m 5s". */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}
