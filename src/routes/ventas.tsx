import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { IVA, money, usePos, type Factura, type LineaVenta } from "../lib/pos-store";

export const Route = createFileRoute("/ventas")({
  head: () => ({
    meta: [
      { title: "Ventas POS — PuntoVenta" },
      {
        name: "description",
        content: "Terminal de caja: arma el carrito, cobra y descuenta inventario en tiempo real.",
      },
      { property: "og:title", content: "Ventas POS — PuntoVenta" },
      { property: "og:description", content: "Terminal de caja con cobro y descuento de stock." },
    ],
  }),
  component: Ventas,
});

function Ventas() {
  const { productos, registrarVenta } = usePos();
  const [carrito, setCarrito] = useState<LineaVenta[]>([]);
  const [cliente, setCliente] = useState("");
  const [metodoPago, setMetodoPago] = useState<Factura["metodoPago"]>("Efectivo");
  const [q, setQ] = useState("");

  const filtrados = productos.filter((p) =>
    `${p.nombre} ${p.sku}`.toLowerCase().includes(q.toLowerCase()),
  );

  const agregar = (id: string) => {
    const p = productos.find((x) => x.id === id)!;
    if (p.stock === 0) {
      toast.error("Sin stock disponible");
      return;
    }
    setCarrito((c) => {
      const ex = c.find((l) => l.productoId === id);
      if (ex) {
        if (ex.cantidad >= p.stock) {
          toast.error("Cantidad supera el stock");
          return c;
        }
        return c.map((l) => (l.productoId === id ? { ...l, cantidad: l.cantidad + 1 } : l));
      }
      return [...c, { productoId: id, nombre: p.nombre, precio: p.precio, cantidad: 1 }];
    });
  };

  const cambiar = (id: string, delta: number) =>
    setCarrito((c) =>
      c
        .map((l) => (l.productoId === id ? { ...l, cantidad: l.cantidad + delta } : l))
        .filter((l) => l.cantidad > 0),
    );

  const subtotal = carrito.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const impuesto = subtotal * IVA;

  const cobrar = () => {
    if (carrito.length === 0) return;
    const f = registrarVenta({ lineas: carrito, cliente, metodoPago });
    setCarrito([]);
    setCliente("");
    toast.success(`Venta cobrada · Factura ${f.numero}`, {
      description: `${money(f.total)} · ${f.metodoPago}`,
    });
  };

  return (
    <AppShell title="Ventas (POS)" subtitle="Terminal de caja 01 · Cajero: María Cedeño">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section>
          <Input
            placeholder="Escanear código o buscar producto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mb-4"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregar(p.id)}
                disabled={p.stock === 0}
                className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary disabled:opacity-50"
              >
                <p className="font-mono text-[11px] text-muted-foreground">{p.sku}</p>
                <p className="mt-1 line-clamp-2 text-sm font-medium">{p.nombre}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-base font-semibold text-primary">
                    {money(p.precio)}
                  </span>
                  <Badge variant={p.stock <= p.minimo ? "destructive" : "secondary"}>
                    {p.stock} u.
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Carrito ({carrito.length})</h2>
          </div>

          <div className="mt-4 space-y-3">
            {carrito.length === 0 && (
              <p className="text-sm text-muted-foreground">Selecciona productos para iniciar la venta.</p>
            )}
            {carrito.map((l) => (
              <div key={l.productoId} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.nombre}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {l.cantidad} × {money(l.precio)}
                  </p>
                </div>
                <Button size="icon" variant="outline" onClick={() => cambiar(l.productoId, -1)}>
                  <Minus className="size-3.5" />
                </Button>
                <Button size="icon" variant="outline" onClick={() => cambiar(l.productoId, 1)}>
                  <Plus className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => cambiar(l.productoId, -l.cantidad)}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="cliente">Cliente</Label>
              <Input
                id="cliente"
                placeholder="Consumidor final"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Método de pago</Label>
              <Select
                value={metodoPago}
                onValueChange={(v) => setMetodoPago(v as Factura["metodoPago"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-mono">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">IVA 15%</dt>
              <dd className="font-mono">{money(impuesto)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd className="font-mono text-primary">{money(subtotal + impuesto)}</dd>
            </div>
          </dl>

          <Button className="mt-5 w-full" size="lg" disabled={!carrito.length} onClick={cobrar}>
            Cobrar y facturar
          </Button>
        </aside>
      </div>
    </AppShell>
  );
}
