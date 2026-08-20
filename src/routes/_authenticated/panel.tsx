import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, DollarSign, Receipt, ShoppingCart, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fechaHora, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel general — PuntoVenta" },
      { name: "description", content: "Indicadores de ventas, alertas de stock y actividad reciente." },
      { property: "og:title", content: "Panel general — PuntoVenta" },
      { property: "og:description", content: "Indicadores de ventas y stock en tiempo real." },
    ],
  }),
  component: Panel,
});

function Panel() {
  const { data, isLoading } = useQuery({
    queryKey: ["panel"],
    queryFn: async () => {
      const desde = new Date(Date.now() - 30 * 86400000).toISOString();
      const [ventas, productos, facturas] = await Promise.all([
        supabase
          .from("sales")
          .select("id, number, total, cost_total, status, created_at, user_name")
          .gte("created_at", desde)
          .order("created_at", { ascending: false }),
        supabase.from("products").select("id, name, code, stock, min_stock, sale_price").eq("active", true),
        supabase.from("invoices").select("id, status"),
      ]);
      return {
        ventas: ventas.data ?? [],
        productos: productos.data ?? [],
        facturas: facturas.data ?? [],
      };
    },
  });

  const ventas = (data?.ventas ?? []).filter((v) => v.status === "completada");
  const hoy = new Date().toDateString();
  const ventasHoy = ventas.filter((v) => new Date(v.created_at).toDateString() === hoy);
  const totalHoy = ventasHoy.reduce((s, v) => s + Number(v.total), 0);
  const totalMes = ventas.reduce((s, v) => s + Number(v.total), 0);
  const utilidad = ventas.reduce((s, v) => s + (Number(v.total) - Number(v.cost_total)), 0);
  const bajoStock = (data?.productos ?? []).filter((p) => Number(p.stock) <= Number(p.min_stock));
  const pendientes = (data?.facturas ?? []).filter((f) => f.status === "pendiente").length;

  const serie: { dia: string; ventas: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toDateString();
    serie.push({
      dia: d.toLocaleDateString("es-EC", { day: "2-digit", month: "short" }),
      ventas: ventas
        .filter((v) => new Date(v.created_at).toDateString() === key)
        .reduce((s, v) => s + Number(v.total), 0),
    });
  }

  const kpis = [
    { label: "Ventas de hoy", value: money(totalHoy), sub: `${ventasHoy.length} transacciones`, icon: DollarSign },
    { label: "Ventas 30 días", value: money(totalMes), sub: `${ventas.length} transacciones`, icon: ShoppingCart },
    { label: "Utilidad bruta 30 días", value: money(utilidad), sub: "Ingresos menos costo", icon: TrendingUp },
    { label: "Facturas pendientes", value: String(pendientes), sub: "Por autorizar", icon: Receipt },
  ];

  return (
    <AppShell
      title="Panel general"
      subtitle="Resumen operativo del negocio"
      actions={
        <Button asChild>
          <Link to="/ventas">Nueva venta</Link>
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando indicadores…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(({ label, value, sub, icon: Icon }) => (
              <div key={label} className="stat-tile">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <Icon className="size-4 text-primary" />
                </div>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="stat-tile lg:col-span-2">
              <h2 className="text-sm font-semibold">Ventas de los últimos 14 días</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={serie}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number | string) => money(Number(v))}
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                      }}
                    />
                    <Area type="monotone" dataKey="ventas" stroke="var(--color-chart-1)" fill="url(#g1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="stat-tile">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning" />
                <h2 className="text-sm font-semibold">Alertas de stock</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {bajoStock.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                    </div>
                    <Badge variant="destructive">
                      {Number(p.stock)} / {Number(p.min_stock)}
                    </Badge>
                  </li>
                ))}
                {!bajoStock.length && (
                  <li className="text-sm text-muted-foreground">Todo el inventario sobre el mínimo.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="stat-tile">
            <h2 className="text-sm font-semibold">Ventas recientes</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Número</th>
                    <th>Fecha</th>
                    <th>Cajero</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.ventas ?? []).slice(0, 8).map((v) => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="py-2 font-mono text-xs">{v.number}</td>
                      <td className="text-muted-foreground">{fechaHora(v.created_at)}</td>
                      <td>{v.user_name ?? "—"}</td>
                      <td className="text-right font-medium">{money(Number(v.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
