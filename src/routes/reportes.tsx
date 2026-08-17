import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "../components/AppShell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { money, usePos } from "../lib/pos-store";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — PuntoVenta" },
      {
        name: "description",
        content: "Reportes de ventas por categoría, métodos de pago, margen y productos más vendidos.",
      },
      { property: "og:title", content: "Reportes — PuntoVenta" },
      { property: "og:description", content: "Ventas por categoría, métodos de pago y márgenes." },
    ],
  }),
  component: Reportes,
});

const colores = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function Reportes() {
  const { productos, facturas } = usePos();
  const emitidas = facturas.filter((f) => f.estado === "Emitida");

  const porCategoria = Object.values(
    productos.reduce<Record<string, { categoria: string; valor: number }>>((acc, p) => {
      acc[p.categoria] ??= { categoria: p.categoria, valor: 0 };
      acc[p.categoria]!.valor += p.stock * p.precio;
      return acc;
    }, {}),
  );

  const porPago = Object.values(
    emitidas.reduce<Record<string, { name: string; value: number }>>((acc, f) => {
      acc[f.metodoPago] ??= { name: f.metodoPago, value: 0 };
      acc[f.metodoPago]!.value += f.total;
      return acc;
    }, {}),
  );

  const masVendidos = Object.values(
    emitidas
      .flatMap((f) => f.lineas)
      .reduce<Record<string, { nombre: string; unidades: number; ingreso: number }>>((acc, l) => {
        acc[l.productoId] ??= { nombre: l.nombre, unidades: 0, ingreso: 0 };
        acc[l.productoId]!.unidades += l.cantidad;
        acc[l.productoId]!.ingreso += l.cantidad * l.precio;
        return acc;
      }, {}),
  ).sort((a, b) => b.ingreso - a.ingreso);

  const margen = productos.reduce((s, p) => s + (p.precio - p.costo) * p.stock, 0);

  return (
    <AppShell title="Reportes" subtitle="Análisis comercial y de inventario">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-tile">
          <p className="text-sm text-muted-foreground">Ingresos facturados</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {money(emitidas.reduce((s, f) => s + f.total, 0))}
          </p>
        </div>
        <div className="stat-tile">
          <p className="text-sm text-muted-foreground">Margen potencial en stock</p>
          <p className="mt-2 font-mono text-2xl font-semibold">{money(margen)}</p>
        </div>
        <div className="stat-tile">
          <p className="text-sm text-muted-foreground">IVA por declarar</p>
          <p className="mt-2 font-mono text-2xl font-semibold">
            {money(emitidas.reduce((s, f) => s + f.impuesto, 0))}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Valor de inventario por categoría</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porCategoria}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="categoria" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={45} />
                <Tooltip
                  formatter={(v: number) => money(v)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                  }}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} fill="var(--color-chart-1)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Ingresos por método de pago</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porPago} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {porPago.map((_, i) => (
                    <Cell key={i} fill={colores[i % colores.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-4 text-sm font-semibold">
          Productos más vendidos
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Unidades</TableHead>
              <TableHead className="text-right">Ingreso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {masVendidos.map((m) => (
              <TableRow key={m.nombre}>
                <TableCell className="font-medium">{m.nombre}</TableCell>
                <TableCell className="text-right font-mono">{m.unidades}</TableCell>
                <TableCell className="text-right font-mono">{money(m.ingreso)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
