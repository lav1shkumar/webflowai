"use client";

import * as React from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  Code2,
  Coins,
  FileCode2,
  ListChecks,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
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
import type {
  GenerationActivity,
  GenerationStage,
} from "@/features/ai/types";
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
            stage={message.stage}
            stageMessage={message.stageMessage}
            activities={message.activities ?? []}
            fileCount={new Set(message.files ?? []).size}
            createdAt={message.createdAt}
            durationMs={message.durationMs}
          />
        )}

        {message.content && (
          <div className="space-y-2 text-sm leading-relaxed text-foreground/90 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-foreground/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-foreground/[0.06] [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {typeof message.tokens === "number" && message.tokens > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Coins className="h-3 w-3" />
              {message.tokens} token{message.tokens === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GenerationStatus({
  status,
  stage,
  stageMessage,
  activities,
  fileCount,
  createdAt,
  durationMs,
}: {
  status: NonNullable<ChatMessage["status"]>;
  stage: ChatMessage["stage"];
  stageMessage: ChatMessage["stageMessage"];
  activities: GenerationActivity[];
  fileCount: number;
  createdAt: number;
  durationMs?: number;
}) {
  const running = status === "running";
  const done = status === "done";
  const failed = status === "error";
  const reducedMotion = useReducedMotion();
  const currentStage = stage ?? "context";
  const currentIndex = generationStages.findIndex(
    (item) => item.key === currentStage,
  );
  const [expanded, setExpanded] = React.useState(!done);
  const [elapsedMs, setElapsedMs] = React.useState(
    durationMs ?? Math.max(0, Date.now() - createdAt),
  );

  React.useEffect(() => {
    if (!running) {
      setElapsedMs(durationMs ?? Math.max(0, Date.now() - createdAt));
      return;
    }

    const update = () => setElapsedMs(Math.max(0, Date.now() - createdAt));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [createdAt, durationMs, running]);

  React.useEffect(() => {
    if (running || failed) setExpanded(true);
    else setExpanded(false);
  }, [failed, running]);

  const activeActivity = activities.findLast(
    (activity) => activity.status === "running",
  );
  const label = running
    ? "Building your app"
    : done
      ? "Generation complete"
      : "Generation stopped";
  const detail = running
    ? activeActivity?.label ?? stageDetail(currentStage, stageMessage)
    : done
      ? fileCount > 0
        ? `${fileCount} file${fileCount === 1 ? "" : "s"} changed`
        : "Finished without file changes"
      : firstLine(stageMessage) ?? "Something went wrong. Please try again.";
  const showTimeline = running || failed || expanded;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-gradient-to-b shadow-sm",
        failed
          ? "border-red-500/25 from-red-500/[0.07] to-foreground/[0.015]"
          : "border-primary/20 from-primary/[0.07] to-foreground/[0.015]",
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <AgentPulse status={status} reducedMotion={Boolean(reducedMotion)} />

        <div className="min-w-0 flex-1" aria-live="polite">
          <div
            className={cn(
              "text-xs font-semibold",
              failed ? "text-red-400" : "text-foreground",
            )}
          >
            {label}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={detail}
              initial={reducedMotion ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              className="mt-0.5 truncate text-[11px] text-muted-foreground"
            >
              {detail}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(durationMs ?? elapsedMs)}
          </span>
          {done && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              aria-label={expanded ? "Hide generation activity" : "Show generation activity"}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showTimeline && (
          <motion.div
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.22 }}
            className="overflow-hidden border-t border-border/70"
          >
            <div className="px-3 py-3">
              {generationStages.map((item, index) => {
                const phaseActivities = activities.filter(
                  (activity) => activity.stage === item.key,
                );
                const lastPhaseActivity = phaseActivities.at(-1);
                const groupedActivities = phaseActivities.reduce(
                  (groups, activity) => {
                    const previous = groups.at(-1);
                    if (
                      previous &&
                      previous.stage === activity.stage &&
                      previous.kind === activity.kind &&
                      previous.label === activity.label &&
                      previous.path === activity.path
                    ) {
                      groups[groups.length - 1] = {
                        ...activity,
                        repeatCount: previous.repeatCount + 1,
                      };
                    } else {
                      groups.push({ ...activity, repeatCount: 1 });
                    }
                    return groups;
                  },
                  [] as Array<GenerationActivity & { repeatCount: number }>,
                );
                const phaseState = done
                  ? lastPhaseActivity?.status === "error"
                    ? "error"
                    : index <= currentIndex
                      ? "done"
                      : "pending"
                  : index < currentIndex
                    ? "done"
                    : index === currentIndex
                      ? failed
                        ? "error"
                        : "active"
                      : "pending";
                const visibleActivities = done
                  ? groupedActivities
                  : groupedActivities.slice(-5);
                const showActivities = done
                  ? visibleActivities.length > 0
                  : index === currentIndex;

                return (
                  <GenerationPhase
                    key={item.key}
                    item={item}
                    state={phaseState}
                    activities={visibleActivities}
                    detail={
                      index === currentIndex
                        ? stageDetail(currentStage, stageMessage)
                        : undefined
                    }
                    showActivities={showActivities}
                    last={index === generationStages.length - 1}
                    reducedMotion={Boolean(reducedMotion)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const generationStages = [
  { key: "context", label: "Analyze", icon: Search },
  { key: "planning", label: "Plan", icon: ListChecks },
  { key: "generation", label: "Build", icon: Code2 },
  { key: "verification", label: "Verify", icon: ShieldCheck },
  { key: "preview", label: "Preview", icon: TerminalSquare },
] as const;

function AgentPulse({
  status,
  reducedMotion,
}: {
  status: NonNullable<ChatMessage["status"]>;
  reducedMotion: boolean;
}) {
  const running = status === "running";
  const failed = status === "error";

  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      {running && (
        <motion.span
          className="absolute inset-1 rounded-full border border-primary/50"
          animate={
            reducedMotion
              ? undefined
              : { scale: [0.85, 1.35], opacity: [0.55, 0] }
          }
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <motion.span
        animate={
          running && !reducedMotion
            ? { scale: [1, 1.04, 1], rotate: [0, 3, 0] }
            : undefined
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-full border shadow-sm",
          failed
            ? "border-red-500/35 bg-red-500/10 text-red-400"
            : status === "done"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-primary/30 bg-primary/10 text-primary",
        )}
      >
        {failed ? (
          <X className="h-3.5 w-3.5" />
        ) : status === "done" ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
      </motion.span>
    </div>
  );
}

function GenerationPhase({
  item,
  state,
  activities,
  detail,
  showActivities,
  last,
  reducedMotion,
}: {
  item: (typeof generationStages)[number];
  state: "pending" | "active" | "done" | "error";
  activities: Array<GenerationActivity & { repeatCount: number }>;
  detail?: string;
  showActivities: boolean;
  last: boolean;
  reducedMotion: boolean;
}) {
  const Icon = item.icon;

  return (
    <div className="relative flex gap-2.5">
      <div className="flex w-6 shrink-0 flex-col items-center">
        <span
          className={cn(
            "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border",
            state === "done" &&
              "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
            state === "active" &&
              "border-primary/40 bg-primary/10 text-primary",
            state === "error" &&
              "border-red-500/35 bg-red-500/10 text-red-400",
            state === "pending" &&
              "border-border bg-background/50 text-muted-foreground/50",
          )}
        >
          {state === "done" ? (
            <Check className="h-3 w-3" />
          ) : state === "error" ? (
            <X className="h-3 w-3" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
        </span>
        {!last && (
          <span
            className={cn(
              "min-h-3 w-px flex-1",
              state === "done" ? "bg-emerald-500/25" : "bg-border",
            )}
          />
        )}
      </div>

      <div className={cn("min-w-0 flex-1", !last && "pb-3")}>
        <div className="flex min-h-6 items-center justify-between gap-2">
          <span
            className={cn(
              "text-[11px] font-medium",
              state === "active" && "text-foreground",
              state === "done" && "text-foreground/80",
              state === "error" && "text-red-400",
              state === "pending" && "text-muted-foreground/60",
            )}
          >
            {item.label}
          </span>
          {state === "active" && (
            <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-primary/80">
              Active
            </span>
          )}
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {showActivities && (
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -3 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              className="mt-1 space-y-1.5"
            >
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <ActivityRow
                    key={activity.id}
                    activity={activity}
                    reducedMotion={reducedMotion}
                  />
                ))
              ) : detail ? (
                <p className="truncate text-[10px] text-muted-foreground">
                  {detail}
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const activityIcons = {
  inspect: Search,
  plan: ListChecks,
  file: FileCode2,
  command: TerminalSquare,
};

function ActivityRow({
  activity,
  reducedMotion,
}: {
  activity: GenerationActivity & { repeatCount: number };
  reducedMotion: boolean;
}) {
  const Icon = activityIcons[activity.kind];

  return (
    <motion.div
      layout={!reducedMotion}
      initial={reducedMotion ? false : { opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.16 }}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2 py-1.5",
        activity.status === "error"
          ? "border-red-500/20 bg-red-500/[0.05]"
          : "border-border/70 bg-background/40",
      )}
    >
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
        {activity.label}
      </span>
      {activity.repeatCount > 1 && (
        <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground/70">
          ×{activity.repeatCount}
        </span>
      )}
      {activity.status === "running" ? (
        <Loader2
          className={cn(
            "h-3 w-3 shrink-0 text-primary",
            !reducedMotion && "animate-spin",
          )}
        />
      ) : activity.status === "error" ? (
        <X className="h-3 w-3 shrink-0 text-red-400" />
      ) : (
        <Check className="h-3 w-3 shrink-0 text-emerald-500" />
      )}
    </motion.div>
  );
}

const defaultStageDetails: Record<GenerationStage, string> = {
  context: "Inspecting project files…",
  planning: "Planning the implementation…",
  generation: "Updating project files…",
  verification: "Running project checks…",
  preview: "Starting and checking preview…",
};

function stageDetail(stage: GenerationStage, message?: string) {
  return firstLine(message) ?? defaultStageDetails[stage];
}

function firstLine(value?: string) {
  return value?.split("\n").find((line) => line.trim())?.trim();
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
