"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { plans, getPlan, type PlanId } from "@/features/billing/plans";
import {
  loadRazorpayScript,
  openRazorpayCheckout,
} from "@/features/billing/checkout-client";
import { useViewer } from "@/components/app/viewer-provider";
import { getPayments, type PaymentRecord } from "@/server/billing";
import { cn, formatINR } from "@/lib/utils";

export default function BillingSettingsPage() {
  const viewer = useViewer();
  const router = useRouter();
  const currentPlan = viewer.plan.toLowerCase() as PlanId;
  const currentPlanDef = getPlan(currentPlan);
  const isPaid = currentPlan !== "free";
  const [annual, setAnnual] = React.useState(false);
  const [loading, setLoading] = React.useState<PlanId | null>(null);
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);

  const loadPayments = React.useCallback(() => {
    getPayments()
      .then(setPayments)
      .catch(() => setPayments([]));
  }, []);

  React.useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const upgrade = async (planId: PlanId) => {
    if (planId === "free") return;
    const cycle = annual ? "annual" : "monthly";
    setLoading(planId);
    try {
      // 1. Create the order on the server.
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, cycle }),
      });
      const session = await res.json();
      if (!res.ok) throw new Error(session.error ?? "Checkout failed");

      // 2. Load and open the Razorpay Checkout widget.
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Couldn't load the Razorpay checkout.");
      }

      const opened = openRazorpayCheckout({
        key: session.keyId,
        amount: session.amount,
        currency: session.currency ?? "INR",
        name: "WebFlowAI",
        description: `${getPlan(planId)?.name ?? "Plan"} · ${cycle}`,
        order_id: session.referenceId,
        prefill: { name: viewer.name, email: viewer.email },
        theme: { color: "#5c7edb" },
        // 3. On success, verify the payment + activate the plan.
        handler: async (resp) => {
          try {
            const verify = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                planId,
                cycle,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            const data = await verify.json();
            if (!verify.ok || !data.ok) {
              throw new Error(data.error ?? "Payment verification failed");
            }
            toast.success(`You're now on the ${getPlan(planId)?.name} plan!`);
            loadPayments();
            router.refresh();
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Verification failed",
            );
          } finally {
            setLoading(null);
          }
        },
        modal: { ondismiss: () => setLoading(null) },
      });
      if (!opened) {
        setLoading(null);
        throw new Error("Couldn't open the Razorpay checkout.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not start checkout",
      );
      setLoading(null);
    }
  };

  const creditPct = Math.round(
    (viewer.creditsBalance / Math.max(1, viewer.creditsMonthly)) * 100,
  );

  return (
    <div className="space-y-6">
      {/* Current plan + usage */}
      <Card className="bg-card/40">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Current plan</CardTitle>
          <Badge variant={isPaid ? "default" : "secondary"}>
            {currentPlanDef?.name ?? "Free"}
            {isPaid ? " · Monthly" : ""}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">
                {currentPlanDef && currentPlanDef.priceMonthly > 0
                  ? formatINR(currentPlanDef.priceMonthly)
                  : "₹0"}
              </div>
              <p className="text-sm text-muted-foreground">
                {isPaid ? "per month" : "Free forever"}
              </p>
            </div>
            {isPaid && (
              <Button variant="outline" size="sm">
                Manage subscription
              </Button>
            )}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Credits used</span>
              <span className="font-medium">
                {viewer.creditsMonthly - viewer.creditsBalance} /{" "}
                {viewer.creditsMonthly}
              </span>
            </div>
            <Progress value={100 - creditPct} />
          </div>
        </CardContent>
      </Card>

      {/* Plan switcher */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Plans</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className={!annual ? "text-foreground" : "text-muted-foreground"}>
            Monthly
          </span>
          <Switch
            checked={annual}
            onCheckedChange={setAnnual}
            aria-label="Toggle annual billing"
          />
          <span className={annual ? "text-foreground" : "text-muted-foreground"}>
            Annual
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = annual ? plan.priceAnnual : plan.priceMonthly;
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border p-5",
                plan.highlight
                  ? "border-primary/40 bg-card"
                  : "border-border bg-card/40",
              )}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{plan.name}</h4>
                {isCurrent && <Badge variant="success">Current</Badge>}
              </div>
              <div className="mt-3 text-2xl font-bold">
                {price === 0 ? "₹0" : formatINR(price)}
                {price > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {annual ? "/yr" : "/mo"}
                  </span>
                )}
              </div>
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={isCurrent ? "outline" : plan.highlight ? "brand" : "outline"}
                className="mt-5 w-full"
                disabled={isCurrent || loading === plan.id}
                onClick={() => upgrade(plan.id)}
              >
                {isCurrent
                  ? "Current plan"
                  : loading === plan.id
                    ? "Starting…"
                    : `Switch to ${plan.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Payment history */}
      <Card className="bg-card/40">
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No payments yet.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => {
                const meta = paymentStatusMeta(p.status);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-6 py-3.5 text-sm"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        {new Date(p.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <Badge variant="secondary">{p.method ?? "Razorpay"}</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{formatINR(p.amount)}</span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function paymentStatusMeta(status: PaymentRecord["status"]): {
  label: string;
  variant: "success" | "warning" | "secondary" | "destructive";
} {
  switch (status) {
    case "CAPTURED":
      return { label: "Paid", variant: "success" };
    case "AUTHORIZED":
      return { label: "Authorized", variant: "warning" };
    case "REFUNDED":
      return { label: "Refunded", variant: "secondary" };
    case "FAILED":
      return { label: "Failed", variant: "destructive" };
    default:
      return { label: "Pending", variant: "secondary" };
  }
}
