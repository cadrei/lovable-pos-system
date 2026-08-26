import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — PuntoVenta" },
      { name: "description", content: "Directorio de clientes con identificación, contacto y estado." },
      { property: "og:title", content: "Clientes — PuntoVenta" },
      { property: "og:description", content: "Gestión del directorio de clientes." },
    ],
  }),
  component: Clientes,
});

const tipos = ["cedula", "ruc", "pasaporte", "consumidor_final"] as const;

function Clientes() {
  const qc = useQueryClient();
  const { can } = useSession();
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({
    id_type: "cedula" as (typeof tipos)[number],
    id_number: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address: "",
  });

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await supabase.from("customers").select("*").order("first_name")).data ?? [],
  });

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clientes;
    return clientes.filter(
      (c) =>
        `${c.first_name} ${c.last_name ?? ""}`.toLowerCase().includes(s) ||
        c.id_number.includes(s) ||
        (c.email ?? "").toLowerCase().includes(s),
    );
  }, [clientes, q]);

  const crear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("customers").insert({
        id_type: form.id_type,
        id_number: form.id_number,
        first_name: form.first_name,
        last_name: form.last_name || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente registrado");
      setAbierto(false);
      setForm({ id_type: "cedula", id_number: "", first_name: "", last_name: "", phone: "", email: "", address: "" });
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Clientes"
      subtitle={`${clientes.length} registrados`}
      actions={
        can("customers.create") && (
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
              <Button>Nuevo cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo cliente</DialogTitle>
                <DialogDescription>Datos de identificación y contacto.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Tipo de identificación</Label>
                  <Select value={form.id_type} onValueChange={(v) => setForm({ ...form, id_type: v as typeof form.id_type })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">
                          {t.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Identificación</Label>
                  <Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nombres</Label>
                  <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Apellidos</Label>
                  <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Correo</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Dirección</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => crear.mutate()} disabled={!form.id_number || !form.first_name || crear.isPending}>
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      }
    >
      <div className="space-y-4">
        <Input className="max-w-md" placeholder="Buscar por nombre, identificación o correo" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Identificación</th>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={5}>
                    Cargando…
                  </td>
                </tr>
              )}
              {filtrados.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{c.id_number}</td>
                  <td className="font-medium">
                    {c.first_name} {c.last_name ?? ""}
                  </td>
                  <td className="text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="text-muted-foreground">{c.email ?? "—"}</td>
                  <td>
                    <Badge variant={c.active ? "secondary" : "outline"}>{c.active ? "Activo" : "Inactivo"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
