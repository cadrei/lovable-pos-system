import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { money, usePos } from "../lib/pos-store";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario — PuntoVenta" },
      {
        name: "description",
        content: "Control de existencias, costos, mínimos de reposición y alta de productos.",
      },
      { property: "og:title", content: "Inventario — PuntoVenta" },
      { property: "og:description", content: "Control de existencias y reposición de productos." },
    ],
  }),
  component: Inventario,
});

function Inventario() {
  const { productos, ajustarStock, agregarProducto } = usePos();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sku: "", nombre: "", categoria: "", precio: "", costo: "", stock: "", minimo: "" });

  const filtrados = productos.filter((p) =>
    `${p.nombre} ${p.sku} ${p.categoria}`.toLowerCase().includes(q.toLowerCase()),
  );

  const guardar = () => {
    if (!form.sku || !form.nombre) {
      toast.error("SKU y nombre son obligatorios");
      return;
    }
    agregarProducto({
      sku: form.sku,
      nombre: form.nombre,
      categoria: form.categoria || "General",
      precio: Number(form.precio) || 0,
      costo: Number(form.costo) || 0,
      stock: Number(form.stock) || 0,
      minimo: Number(form.minimo) || 0,
    });
    setForm({ sku: "", nombre: "", categoria: "", precio: "", costo: "", stock: "", minimo: "" });
    setOpen(false);
    toast.success("Producto agregado al inventario");
  };

  return (
    <AppShell
      title="Inventario"
      subtitle="Existencias, costos y niveles de reposición"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Nuevo producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo producto</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["sku", "SKU"],
                  ["nombre", "Nombre"],
                  ["categoria", "Categoría"],
                  ["precio", "Precio venta"],
                  ["costo", "Costo"],
                  ["stock", "Stock inicial"],
                  ["minimo", "Stock mínimo"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={guardar}>Guardar producto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, SKU o categoría"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Ajuste</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{p.categoria}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{money(p.costo)}</TableCell>
                <TableCell className="text-right font-mono">{money(p.precio)}</TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      p.stock <= p.minimo
                        ? "font-mono font-semibold text-destructive"
                        : "font-mono"
                    }
                  >
                    {p.stock}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">/ {p.minimo}</span>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="outline" onClick={() => ajustarStock(p.id, -1)}>
                      <Minus className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => ajustarStock(p.id, 1)}>
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
