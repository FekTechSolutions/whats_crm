import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MessageSquareDot,
  Clock4,
  Users,
  Send,
  Timer,
  ArrowUpRight,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Zaply CRM WhatsApp" },
      {
        name: "description",
        content:
          "Acompanhe conversas abertas, clientes cadastrados, mensagens enviadas e tempo médio de resposta.",
      },
      { property: "og:title", content: "Dashboard | Zaply CRM WhatsApp" },
      {
        property: "og:description",
        content: "Indicadores de atendimento e vendas do seu WhatsApp Business.",
      },
    ],
  }),
  component: DashboardPage,
});

type Metrics = {
  open: number;
  waiting: number;
  customers: number;
  sentToday: number;
  avgResponse: number | null;
  series: { day: string; total: number }[];
};

async function fetchMetrics(): Promise<Metrics> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  weekAgo.setHours(0, 0, 0, 0);

  const [open, waiting, customers, sentToday, responses, weekMessages] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .in("status", ["novo", "em_atendimento"]),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando_cliente"),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "saida")
      .gte("created_at", startOfToday.toISOString()),
    supabase.from("conversations").select("first_response_seconds").not("first_response_seconds", "is", null),
    supabase.from("messages").select("created_at").gte("created_at", weekAgo.toISOString()),
  ]);

  const times = (responses.data ?? []).map((r) => r.first_response_seconds as number);
  const avgResponse = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;

  const buckets = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const m of weekMessages.data ?? []) {
    const key = String(m.created_at).slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return {
    open: open.count ?? 0,
    waiting: waiting.count ?? 0,
    customers: customers.count ?? 0,
    sentToday: sentToday.count ?? 0,
    avgResponse,
    series: [...buckets.entries()].map(([day, total]) => ({
      day: new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      total,
    })),
  };
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  hint?: string;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-metrics"], queryFn: fetchMetrics });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do atendimento no WhatsApp Business.
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <ArrowUpRight className="h-3 w-3" /> Dados em tempo real
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Conversas abertas" value={data!.open} icon={MessageSquareDot} />
          <StatCard label="Aguardando cliente" value={data!.waiting} icon={Clock4} />
          <StatCard label="Clientes cadastrados" value={data!.customers} icon={Users} />
          <StatCard label="Mensagens enviadas hoje" value={data!.sentToday} icon={Send} />
          <StatCard
            label="Tempo médio de resposta"
            value={formatDuration(data!.avgResponse)}
            icon={Timer}
            hint="Primeira resposta ao cliente"
          />
        </div>
      )}

      <div className="surface-card p-5">
        <h2 className="text-sm font-semibold">Mensagens nos últimos 7 dias</h2>
        <div className="mt-4 h-64">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data!.series}>
                <defs>
                  <linearGradient id="msgFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  fill="url(#msgFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
