import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { IVA, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/ventas")({
  head: () => ({
    meta: [
      { title: "Punto de venta — PuntoVenta" },
      { name: "description", content: "Registra ventas con búsqueda de productos, descuentos y pagos." },
      { property: "og:title", content: "Punto de venta — PuntoVenta" },
      { property: "og:description", content: "Caja rápida con carrito, descuentos y cobro." },
    ],
  }),
  component: POS,
});

type Linea = {
  productId: string;
  code: string;
  nombre: string;
  precio: number;
  costo: number;
  cantidad: number;
  stock: number;
};

function POS() {
  const qc = useQueryClient();
  const { nombre: cajero } = useSession();
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<Linea[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [metodo, setMetodo] = useState<"efectivo" | "tarjeta" | "transferencia">("efectivo");
  const [descuento, setDescuento] = useState(0);
  const [recibido, setRecibido] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const { data: productos = [] } = useQuery({
    queryKey: ["pos-productos"],
    queryFn: async () =>
      (await supabase
        .from("products")
        .select("id, code, barcode, name, sale_price, cost_price, stock")
        .eq("active", true)
        .order("name")).data ?? [],
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["pos-clientes"],
    queryFn: async () =>
      (await supabase
        .from("customers")
        .select("id, first_name, last_name, id_number")
        .eq("active", true)
        .order("first_name")).data ?? [],
  });

  const { data: sesionCaja } = useQuery({
    queryKey: ["caja-abierta"],
    queryFn: async () =>
      (await supabase
        .from("cash_sessions")
        .select("id, cash_register_id")
        .eq("status", "abierta")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle()).data,
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos.slice(0, 12);
    return productos
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          (p.barcode ?? "").toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [busqueda, productos]);

  function agregar(p: (typeof productos)[number]) {
    setCarrito((prev) => {
      const ex = prev.find((l) => l.productId === p.id);
      if (ex) return prev.map((l) => (l.productId === p.id ? { ...l, cantidad: l.cantidad + 1 } : l));
      return [
        ...prev,
        {
          productId: p.id,
          code: p.code,
          nombre: p.name,
          precio: Number(p.sale_price),
          costo: Number(p.cost_price),
          cantidad: 1,
          stock: Number(p.stock),
        },
      ];
    });
    setBusqueda("");
  }

  const subtotal = carrito.reduce((s, l) => s + l.precio * l.cantidad, 0);
  const descuentoValor = Math.min(descuento, subtotal);
  const impuesto = +((subtotal - descuentoValor) * IVA).toFixed(2);
  const total = +(subtotal - descuentoValor + impuesto).toFixed(2);
  const cambio = Math.max(0, +(recibido - total).toFixed(2));

  const cobrar = useMutation({
    mutationFn: async () => {
      if (!carrito.length) throw new Error("El carrito está vacío");
      const { data: numero, error: errNum } = await supabase.rpc("next_document_number", {
        _doc_type: "venta",
        _series: "V001-001",
      });
      if (errNum) throw errNum;

      const costTotal = carrito.reduce((s, l) => s + l.costo * l.cantidad, 0);
      const { data: venta, error } = await supabase
        .from("sales")
        .insert({
          number: numero as string,
          customer_id: clienteId || null,
          cash_session_id: sesionCaja?.id ?? null,
          user_name: cajero,
          subtotal: +subtotal.toFixed(2),
          discount: descuentoValor,
          tax: impuesto,
          total,
          cost_total: +costTotal.toFixed(2),
        })
        .select("id, number")
        .single();
      if (error) throw error;

      const items = carrito.map((l) => ({
        sale_id: venta.id,
        product_id: l.productId,
        description: l.nombre,
        quantity: l.cantidad,
        unit_price: l.precio,
        unit_cost: l.costo,
        discount: 0,
        tax_rate: IVA,
        subtotal: +(l.precio * l.cantidad).toFixed(2),
        total: +(l.precio * l.cantidad * (1 + IVA)).toFixed(2),
      }));
      await supabase.from("sale_items").insert(items);
      await supabase.from("payments").insert({
        sale_id: venta.id,
        method: metodo,
        amount: total,
        received: metodo === "efectivo" ? recibido || total : null,
        change_given: metodo === "efectivo" ? cambio : null,
      });

      for (const l of carrito) {
        const nuevo = Math.max(0, l.stock - l.cantidad);
        await supabase.from("products").update({ stock: nuevo }).eq("id", l.productId);
        await supabase.from("inventory_movements").insert({
          product_id: l.productId,
          movement_type: "venta",
          document: venta.number,
          quantity_out: l.cantidad,
          balance: nuevo,
          unit_cost: l.costo,
          user_name: cajero,
        });
      }

      const { data: numFactura } = await supabase.rpc("next_document_number", {
        _doc_type: "factura",
        _series: "001-001",
      });
      const { data: factura } = await supabase
        .from("invoices")
        .insert({
          sale_id: venta.id,
          number: (numFactura as string) ?? venta.number,
          customer_id: clienteId || null,
          status: "emitida",
          subtotal: +subtotal.toFixed(2),
          discount: descuentoValor,
          tax: impuesto,
          total,
        })
        .select("id")
        .single();

      if (factura) {
        await supabase.from("invoice_items").insert(
          carrito.map((l) => ({
            invoice_id: factura.id,
            product_id: l.productId,
            description: l.nombre,
            quantity: l.cantidad,
            unit_price: l.precio,
            discount: 0,
            tax: +(l.precio * l.cantidad * IVA).toFixed(2),
            total: +(l.precio * l.cantidad * (1 + IVA)).toFixed(2),
          })),
        );
      }

      if (sesionCaja?.id && metodo === "efectivo") {
        await supabase.from("cash_movements").insert({
          cash_session_id: sesionCaja.id,
          type: "venta",
          amount: total,
          concept: "Venta en efectivo",
          reference: venta.number,
        });
      }

      return venta;
    },
    onSuccess: (venta) => {
      toast.success(`Venta ${venta.number} registrada`);
      setCarrito([]);
      setDescuento(0);
      setRecibido(0);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Punto de venta" subtitle="F2 para buscar productos">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              className="pl-9"
              placeholder="Buscar por nombre, código o código de barras (F2)"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtrados[0]) agregar(filtrados[0]);
              }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregar(p)}
                className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary"
              >
                <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-semibold">{money(Number(p.sale_price))}</span>
                  <Badge variant={Number(p.stock) > 0 ? "secondary" : "destructive"}>
                    {Number(p.stock)} u.
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </section>

        <aside className="space-y-4 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Carrito ({carrito.length})</h2>

          <div className="space-y-2">
            {carrito.map((l) => (
              <div key={l.productId} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.nombre}</p>
                  <p className="text-xs text-muted-foreground">{money(l.precio)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() =>
                      setCarrito((prev) =>
                        prev
                          .map((x) => (x.productId === l.productId ? { ...x, cantidad: x.cantidad - 1 } : x))
                          .filter((x) => x.cantidad > 0),
                      )
                    }
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-sm">{l.cantidad}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() =>
                      setCarrito((prev) =>
                        prev.map((x) => (x.productId === l.productId ? { ...x, cantidad: x.cantidad + 1 } : x)),
                      )
                    }
                  >
                    <Plus className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-destructive"
                    onClick={() => setCarrito((prev) => prev.filter((x) => x.productId !== l.productId))}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
            {!carrito.length && <p className="text-sm text-muted-foreground">Agrega productos para vender.</p>}
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Consumidor final" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name ?? ""} · {c.id_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Método de pago</Label>
                <Select value={metodo} onValueChange={(v) => setMetodo(v as typeof metodo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Descuento ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={descuento}
                  onChange={(e) => setDescuento(Number(e.target.value))}
                />
              </div>
            </div>

            {metodo === "efectivo" && (
              <div className="space-y-1.5">
                <Label>Recibido ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={recibido}
                  onChange={(e) => setRecibido(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">Cambio: {money(cambio)}</p>
              </div>
            )}

            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Descuento</dt>
                <dd>-{money(descuentoValor)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IVA 15%</dt>
                <dd>{money(impuesto)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1 text-base font-semibold">
                <dt>Total</dt>
                <dd>{money(total)}</dd>
              </div>
            </dl>

            <Button
              className="w-full"
              size="lg"
              disabled={!carrito.length || cobrar.isPending}
              onClick={() => cobrar.mutate()}
            >
              Cobrar y facturar
            </Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
