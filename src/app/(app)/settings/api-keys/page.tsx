import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function ApiKeysPage() {
  return (
    <Card className="bg-card/40">
      <CardContent className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <div className="mt-5 flex items-center gap-2">
          <h2 className="text-lg font-semibold">API Keys</h2>
          <Badge variant="secondary">Coming soon</Badge>
        </div>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Programmatic access to the WebFlowAI API is on the way. You&apos;ll be
          able to create and manage keys to generate and deploy projects from
          your own tools.
        </p>
      </CardContent>
    </Card>
  );
}
