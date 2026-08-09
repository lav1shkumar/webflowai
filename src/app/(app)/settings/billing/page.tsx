"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  tokenPacks,
  getTokenPack,
  type TokenPackId,
} from "@/features/billing/token-packs";
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
  const [loading, setLoading] = React.useState<TokenPackId | null>(null);
  const [payments, setPayments] = React.useState<PaymentRecord[]>([]);

  const loadPayments = React.useCallback(() => {
    getPayments()
      .then(setPayments)
      .catch(() => setPayments([]));
  }, []);

  React.useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const purchase = async (packId: TokenPackId) => {
    setLoading(packId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const session = await res.json();
      if (!res.ok) throw new Error(session.error ?? "Checkout failed");

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("Couldn't load the Razorpay checkout.");
      }

      const pack = getTokenPack(packId);
      const opened = openRazorpayCheckout({
        key: session.keyId,
        amount: session.amount,
        currency: session.currency ?? "INR",
        name: "WebFlowAI",
        description: `${pack?.tokens.toLocaleString() ?? "AI"} token pack`,
        order_id: session.referenceId,
        prefill: { name: viewer.name, email: viewer.email },
        theme: { color: "#5c7edb" },
        handler: async (response) => {
          try {
            const verify = await fetch("/api/billing/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const data = await verify.json();
            if (!verify.ok || !data.ok) {
              throw new Error(data.error ?? "Payment verification failed");
            }
            toast.success(`${data.tokens.toLocaleString()} tokens added`);
            loadPayments();
            router.refresh();
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Verification failed",
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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not start checkout",
      );
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card/40">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Token balance</CardTitle>
          <Badge variant="secondary">No subscription</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {viewer.tokensBalance.toLocaleString()}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            AI tokens available · tokens never expire
          </p>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold">Buy tokens</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          One-time payment. Add more whenever you need them.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {tokenPacks.map((pack) => (
          <div
            key={pack.id}
            className={cn(
              "relative flex flex-col rounded-2xl border p-5",
              pack.highlight
                ? "border-primary/40 bg-card"
                : "border-border bg-card/40",
            )}
          >
            {pack.highlight && (
              <Badge className="absolute -top-2.5 right-4 bg-primary text-primary-foreground shadow-sm ring-1 ring-inset ring-white/10">
                Most popular
              </Badge>
            )}
            <h4 className="font-semibold">{pack.name}</h4>
            <p className="mt-1 text-xs text-muted-foreground">{pack.tagline}</p>
            <div className="mt-4 text-2xl font-bold">
              {formatINR(pack.price)}
            </div>
            <div className="mt-1 text-sm font-medium">
              {pack.tokens.toLocaleString()} tokens
            </div>
            <ul className="mt-4 flex-1 space-y-2">
              {pack.features.slice(1).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-xs">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              variant={pack.highlight ? "brand" : "outline"}
              className="mt-5 w-full"
              disabled={loading !== null}
              onClick={() => purchase(pack.id)}
            >
              {loading === pack.id ? "Starting…" : "Buy tokens"}
            </Button>
          </div>
        ))}
      </div>

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
              {payments.map((payment) => {
                const meta = paymentStatusMeta(payment.status);
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between px-6 py-3.5 text-sm"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        {new Date(payment.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <Badge variant="secondary">
                        {payment.method ?? "Razorpay"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        {formatINR(payment.amount)}
                      </span>
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
