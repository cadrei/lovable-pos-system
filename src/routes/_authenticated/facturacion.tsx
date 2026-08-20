import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { fechaHora, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/facturacion")({
  head: () => ({
    meta: [
      { title: "Facturación — PuntoVenta" },
      { name: "description", content: "Consulta, imprime y anula facturas emitidas por el punto de venta." },
      { property: "og:title", content: "Facturación — PuntoVenta" },
      { property: "og:description", content: "Comprobantes emitidos, estados y anulaciones." },
    ],
  }),
  component: Facturacion,
});

const estados = ["todas", "autorizada", "emitida", "pendiente", "anulada"] as const;

function Facturacion() {
  const qc = useQueryClient();
  const { can } = useSession();
  const [estado, setEstado] = useState<(typeof estados)[number]>("todas");
  const [q, setQ] = useState("");
  const [detalle, setDetalle] = useState<string | null>(null);

  const { data: facturas = [], isLoading } = useQuery({
    queryKey: ["facturas"],
    queryFn: async () =>
      (await supabase
        .from("invoices")
        .select("*, customers(first_name, last_name, id_number)")
        .order("issue_date", { ascending: false })
        .limit(200)).data ?? [],
  });

  const { data: items = [] } = useQuery({
    queryKey: ["factura-items", detalle],
    enabled: !!detalle,
    queryFn: async () =>
      (await supabase.from("invoice_items").select("*").eq("invoice_id", detalle!)).data ?? [],
  });

  const filtradas = useMemo(
    () =>
      facturas.filter((f) => {
        const okEstado = estado === "todas" || f.status === estado;
        const s = q.trim().toLowerCase();
        const okBusqueda =
          !s ||
          f.number.toLowerCase().includes(s) ||
          `${f.customers?.first_name ?? ""} ${f.customers?.last_name ?? ""}`.toLowerCase().includes(s);
        return okEstado && okBusqueda;
      }),
    [facturas, estado, q],
  );

  const anular = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").update({ status: "anulada" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Factura anulada");
      qc.invalidateQueries({ queryKey: ["facturas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const factura = facturas.find((f) => f.id === detalle);
  const emitidas = facturas.filter((f) => f.status !== "anulada");
  const facturado = emitidas.reduce((s, f) => s + Number(f.total), 0);

  return (
    <AppShell title="Facturación" subtitle={`${facturas.length} comprobantes · ${money(facturado)} facturado`}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input className="max-w-xs" placeholder="Buscar por número o cliente" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {estados.map((e) => (
                <SelectItem key={e} value={e} className="capitalize">
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Número</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th className="text-right">Subtotal</th>
                <th className="text-right">IVA</th>
                <th className="text-right">Total</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={8}>
                    Cargando…
                  </td>
                </tr>
              )}
              {filtradas.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{f.number}</td>
                  <td className="text-muted-foreground">{fechaHora(f.issue_date)}</td>
                  <td>
                    {f.customers ? `${f.customers.first_name} ${f.customers.last_name ?? ""}` : "Consumidor final"}
                  </td>
                  <td>
                    <Badge
                      variant={
                        f.status === "anulada" ? "destructive" : f.status === "pendiente" ? "outline" : "secondary"
                      }
                      className="capitalize"
                    >
                      {f.status}
                    </Badge>
                  </td>
                  <td className="text-right">{money(Number(f.subtotal))}</td>
                  <td className="text-right">{money(Number(f.tax))}</td>
                  <td className="text-right font-medium">{money(Number(f.total))}</td>
                  <td className="space-x-2 p-2 text-right">
                    <Button size="sm" variant="outline" onClick={() => setDetalle(f.id)}>
                      Ver
                    </Button>
                    {can("invoice.cancel") && f.status !== "anulada" && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => anular.mutate(f.id)}>
                        Anular
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Factura {factura?.number}</DialogTitle>
            <DialogDescription>
              {fechaHora(factura?.issue_date)} · Serie {factura?.series}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-1">Descripción</th>
                  <th className="text-right">Cant.</th>
                  <th className="text-right">P. unit.</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="py-1.5">{i.description}</td>
                    <td className="text-right">{Number(i.quantity)}</td>
                    <td className="text-right">{money(Number(i.unit_price))}</td>
                    <td className="text-right">{money(Number(i.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="space-y-1 border-t border-border pt-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{money(Number(factura?.subtotal))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IVA</dt>
                <dd>{money(Number(factura?.tax))}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd>{money(Number(factura?.total))}</dd>
              </div>
            </dl>
            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
