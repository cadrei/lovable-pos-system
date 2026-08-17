import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { money, usePos, type Factura } from "../lib/pos-store";

export const Route = createFileRoute("/facturacion")({
  head: () => ({
    meta: [
      { title: "Facturación — PuntoVenta" },
      {
        name: "description",
        content: "Comprobantes electrónicos emitidos, detalle de impuestos y anulación de facturas.",
      },
      { property: "og:title", content: "Facturación — PuntoVenta" },
      { property: "og:description", content: "Comprobantes emitidos, impuestos y anulaciones." },
    ],
  }),
  component: Facturacion,
});

function Facturacion() {
  const { facturas, anularFactura } = usePos();
  const [detalle, setDetalle] = useState<Factura | null>(null);

  return (
    <AppShell title="Facturación" subtitle="Comprobantes electrónicos · Punto emisión 001-001">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facturas.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">{f.numero}</TableCell>
                <TableCell className="text-sm">
                  {new Date(f.fecha).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "short" })}
                </TableCell>
                <TableCell>{f.cliente}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{f.metodoPago}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">{money(f.subtotal)}</TableCell>
                <TableCell className="text-right font-mono">{money(f.impuesto)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{money(f.total)}</TableCell>
                <TableCell>
                  <Badge variant={f.estado === "Emitida" ? "default" : "destructive"}>
                    {f.estado}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDetalle(f)}>
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={f.estado === "Anulada"}
                      onClick={() => {
                        anularFactura(f.id);
                        toast.success("Factura anulada");
                      }}
                    >
                      Anular
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Factura {detalle?.numero}</DialogTitle>
          </DialogHeader>
          {detalle && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <p>Cliente: <span className="text-foreground">{detalle.cliente}</span></p>
                <p>Cajero: <span className="text-foreground">{detalle.cajero}</span></p>
                <p>Pago: <span className="text-foreground">{detalle.metodoPago}</span></p>
                <p>Estado: <span className="text-foreground">{detalle.estado}</span></p>
              </div>
              <ul className="divide-y divide-border border-y border-border">
                {detalle.lineas.map((l) => (
                  <li key={l.productoId} className="flex justify-between py-2">
                    <span>
                      {l.cantidad} × {l.nombre}
                    </span>
                    <span className="font-mono">{money(l.precio * l.cantidad)}</span>
                  </li>
                ))}
              </ul>
              <dl className="space-y-1">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-mono">{money(detalle.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">IVA 15%</dt>
                  <dd className="font-mono">{money(detalle.impuesto)}</dd>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="font-mono text-primary">{money(detalle.total)}</dd>
                </div>
              </dl>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
