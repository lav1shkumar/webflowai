import { Code2, Eye, MessagesSquare, TerminalSquare } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/shared/reveal";

const panels = [
  { icon: MessagesSquare, label: "AI Chat", tone: "text-yellow-300" },
  { icon: Code2, label: "Editor", tone: "text-blue-400" },
  { icon: Eye, label: "Preview", tone: "text-emerald-400" },
  { icon: TerminalSquare, label: "Terminal", tone: "text-yellow-200" },
];

export function ProductDemo() {
  return (
    <section id="product-demo" className="relative py-28">
      <div className="container-wide">
        <SectionHeading
          eyebrow="The workspace"
          title="A full IDE, reimagined for AI"
          description="Chat, code, preview, and terminal — resizable panels in one focused environment."
        />

        <Reveal className="mt-16">
          <div className="gradient-border overflow-hidden">
            <div className="rounded-[inherit] bg-card/60 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500/70" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/70" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/70" />
                </div>
                <span className="text-xs text-muted-foreground">
                  workspace · dentalflow-crm
                </span>
                <span className="text-xs text-emerald-400">● live</span>
              </div>

              <div className="flex flex-col divide-y divide-border md:grid md:h-[440px] md:grid-cols-12 md:divide-x md:divide-y-0">
                {/* Chat */}
                <div className="flex flex-col p-4 md:col-span-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <MessagesSquare className="h-3.5 w-3.5" /> AI Chat
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-primary/15 px-3 py-2 text-foreground">
                      Add a patient appointment calendar
                    </div>
                    <div className="max-w-[90%] rounded-xl rounded-bl-sm border border-border bg-background/40 px-3 py-2 text-muted-foreground">
                      Creating <code className="text-primary">Calendar</code>{" "}
                      component and wiring the booking API…
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      3 files updated
                    </div>
                  </div>
                </div>

                {/* Editor */}
                <div className="overflow-x-auto bg-background/30 p-4 font-mono text-xs leading-relaxed md:col-span-5">
                  <pre className="text-muted-foreground">
                    <span className="text-yellow-300">export function</span>{" "}
                    <span className="text-blue-400">Calendar</span>() {"{"}
                    {"\n"}  <span className="text-yellow-300">const</span>{" "}
                    [date, setDate] = useState(today);
                    {"\n"}  <span className="text-yellow-300">return</span> (
                    {"\n"}    {"<"}
                    <span className="text-emerald-400">CalendarGrid</span>
                    {"\n"}      value={"{date}"}
                    {"\n"}      onSelect={"{setDate}"}
                    {"\n"}    /{">"}
                    {"\n"}  );{"\n"}
                    {"}"}
                  </pre>
                </div>

                {/* Preview + terminal */}
                <div className="flex flex-col md:col-span-3">
                  <div className="flex-1 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="h-2 w-3/4 rounded bg-foreground/10" />
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 21 }).map((_, i) => (
                          <div
                            key={i}
                            className="aspect-square rounded bg-foreground/[0.06]"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border bg-black/40 p-3 font-mono text-[11px] text-emerald-400">
                    <div className="text-muted-foreground">$ npm run dev</div>
                    <div>▲ Ready on :3000</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          {panels.map((p) => (
            <div
              key={p.label}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <p.icon className={`h-4 w-4 ${p.tone}`} />
              {p.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
