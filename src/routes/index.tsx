import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpRight, Boxes, DollarSign, Receipt } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { money, usePos } from "../lib/pos-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Panel general — PuntoVenta" },
      {
        name: "description",
        content:
          "Indicadores de ventas del día, alertas de stock y actividad reciente del punto de venta.",
      },
      { property: "og:title", content: "Panel general — PuntoVenta" },
      {
        property: "og:description",
        content: "Indicadores de ventas, alertas de stock y actividad reciente.",
      },
    ],
  }),
  component: Panel,
});

const serie = [
  { dia: "Lun", ventas: 480 },
  { dia: "Mar", ventas: 620 },
  { dia: "Mié", ventas: 545 },
  { dia: "Jue", ventas: 710 },
  { dia: "Vie", ventas: 930 },
  { dia: "Sáb", ventas: 1180 },
  { dia: "Dom", ventas: 640 },
];

function Panel() {
  const { productos, facturas, bitacora } = usePos();
  const emitidas = facturas.filter((f) => f.estado === "Emitida");
  const total = emitidas.reduce((s, f) => s + f.total, 0);
  const bajoStock = productos.filter((p) => p.stock <= p.minimo);
  const valorInventario = productos.reduce((s, p) => s + p.stock * p.costo, 0);

  const tiles = [
    { label: "Ventas acumuladas", value: money(total), icon: DollarSign, hint: `${emitidas.length} facturas emitidas` },
    { label: "Ticket promedio", value: money(emitidas.length ? total / emitidas.length : 0), icon: Receipt, hint: "IVA 15% incluido" },
    { label: "Valor de inventario", value: money(valorInventario), icon: Boxes, hint: `${productos.length} SKUs activos` },
    { label: "Alertas de stock", value: String(bajoStock.length), icon: AlertTriangle, hint: "Productos bajo el mínimo" },
  ];

  return (
    <AppShell
      title="Panel general"
      subtitle="Resumen operativo de la tienda · Caja 01"
      actions={
        <Button asChild>
          <Link to="/ventas">
            Abrir caja <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ label, value, icon: Icon, hint }) => (
          <div key={label} className="stat-tile">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="size-4 text-primary" />
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Ventas de la semana</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
                <Tooltip
                  formatter={(v: number) => money(v)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  fill="url(#g)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Reposición sugerida</h2>
          <ul className="mt-4 space-y-3">
            {bajoStock.length === 0 && (
              <li className="text-sm text-muted-foreground">Todo el inventario está sobre el mínimo.</li>
            )}
            {bajoStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.nombre}</p>
                  <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                </div>
                <Badge variant="destructive">{p.stock} / {p.minimo}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Actividad reciente</h2>
        <ul className="mt-4 divide-y divide-border">
          {bitacora.slice(0, 6).map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span>{b.accion}</span>
              <span className="text-xs text-muted-foreground">
                {b.usuario} · {b.modulo} · {b.fecha}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
