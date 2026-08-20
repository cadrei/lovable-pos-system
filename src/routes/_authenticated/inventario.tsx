import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { fechaHora, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario y kardex — PuntoVenta" },
      { name: "description", content: "Administra productos, existencias, mínimos y movimientos de inventario." },
      { property: "og:title", content: "Inventario y kardex — PuntoVenta" },
      { property: "og:description", content: "Productos, stock y kardex de movimientos." },
    ],
  }),
  component: Inventario,
});

function Inventario() {
  const qc = useQueryClient();
  const { nombre, can } = useSession();
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [ajuste, setAjuste] = useState<{ id: string; nombre: string; stock: number } | null>(null);
  const [cantidadAjuste, setCantidadAjuste] = useState(0);
  const [motivo, setMotivo] = useState("");

  const [form, setForm] = useState({
    code: "",
    barcode: "",
    name: "",
    category_id: "",
    cost_price: 0,
    sale_price: 0,
    stock: 0,
    min_stock: 0,
    max_stock: 0,
  });

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ["productos"],
    queryFn: async () =>
      (await supabase
        .from("products")
        .select("*, categories(name), brands(name)")
        .order("name")).data ?? [],
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => (await supabase.from("categories").select("id, name").order("name")).data ?? [],
  });

  const { data: movimientos = [] } = useQuery({
    queryKey: ["kardex"],
    queryFn: async () =>
      (await supabase
        .from("inventory_movements")
        .select("*, products(name, code)")
        .order("created_at", { ascending: false })
        .limit(80)).data ?? [],
  });

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return productos;
    return productos.filter(
      (p) => p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s) || (p.barcode ?? "").includes(s),
    );
  }, [q, productos]);

  const crear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").insert({
        code: form.code,
        barcode: form.barcode || null,
        name: form.name,
        category_id: form.category_id || null,
        cost_price: form.cost_price,
        sale_price: form.sale_price,
        stock: form.stock,
        min_stock: form.min_stock,
        max_stock: form.max_stock,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Producto creado");
      setAbierto(false);
      setForm({ code: "", barcode: "", name: "", category_id: "", cost_price: 0, sale_price: 0, stock: 0, min_stock: 0, max_stock: 0 });
      qc.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ajustar = useMutation({
    mutationFn: async () => {
      if (!ajuste) return;
      const nuevo = Math.max(0, ajuste.stock + cantidadAjuste);
      const { error } = await supabase.from("products").update({ stock: nuevo }).eq("id", ajuste.id);
      if (error) throw error;
      await supabase.from("inventory_movements").insert({
        product_id: ajuste.id,
        movement_type: "ajuste",
        quantity_in: cantidadAjuste > 0 ? cantidadAjuste : 0,
        quantity_out: cantidadAjuste < 0 ? -cantidadAjuste : 0,
        balance: nuevo,
        user_name: nombre,
        notes: motivo || "Ajuste manual",
      });
    },
    onSuccess: () => {
      toast.success("Inventario ajustado");
      setAjuste(null);
      setCantidadAjuste(0);
      setMotivo("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Inventario"
      subtitle={`${productos.length} productos registrados`}
      actions={
        can("inventory.create") && (
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
              <Button>Nuevo producto</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo producto</DialogTitle>
                <DialogDescription>Registra un artículo en el catálogo.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Código</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Código de barras</Label>
                  <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Nombre</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Categoría</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(
                  [
                    ["cost_price", "Costo"],
                    ["sale_price", "Precio venta"],
                    ["stock", "Stock inicial"],
                    ["min_stock", "Stock mínimo"],
                    ["max_stock", "Stock máximo"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={() => crear.mutate()} disabled={!form.code || !form.name || crear.isPending}>
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      }
    >
      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="kardex">Kardex</TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar producto" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className="text-right">Costo</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td className="p-3 text-muted-foreground" colSpan={7}>
                      Cargando…
                    </td>
                  </tr>
                )}
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{p.code}</td>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-muted-foreground">{p.categories?.name ?? "—"}</td>
                    <td className="text-right">{money(Number(p.cost_price))}</td>
                    <td className="text-right">{money(Number(p.sale_price))}</td>
                    <td className="text-right">
                      <Badge variant={Number(p.stock) <= Number(p.min_stock) ? "destructive" : "secondary"}>
                        {Number(p.stock)}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">
                      {can("inventory.adjust") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAjuste({ id: p.id, nombre: p.name, stock: Number(p.stock) })}
                        >
                          Ajustar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="kardex" className="mt-4">
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Documento</th>
                  <th className="text-right">Entrada</th>
                  <th className="text-right">Salida</th>
                  <th className="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="p-3 text-muted-foreground">{fechaHora(m.created_at)}</td>
                    <td>{m.products?.name ?? "—"}</td>
                    <td className="capitalize">{m.movement_type}</td>
                    <td className="font-mono text-xs">{m.document ?? "—"}</td>
                    <td className="text-right text-success">{Number(m.quantity_in) || "—"}</td>
                    <td className="text-right text-destructive">{Number(m.quantity_out) || "—"}</td>
                    <td className="text-right font-medium">{Number(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!ajuste} onOpenChange={(o) => !o && setAjuste(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar inventario</DialogTitle>
            <DialogDescription>{ajuste?.nombre} · stock actual {ajuste?.stock}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Cantidad (+ entrada / − salida)</Label>
              <Input type="number" value={cantidadAjuste} onChange={(e) => setCantidadAjuste(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo</Label>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Conteo físico, merma…" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => ajustar.mutate()} disabled={!cantidadAjuste || ajustar.isPending}>
              Aplicar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
