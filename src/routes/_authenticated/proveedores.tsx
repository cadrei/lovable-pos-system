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
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/proveedores")({
  head: () => ({
    meta: [
      { title: "Proveedores — PuntoVenta" },
      { name: "description", content: "Directorio de proveedores con RUC, contacto y estado comercial." },
      { property: "og:title", content: "Proveedores — PuntoVenta" },
      { property: "og:description", content: "Gestión del directorio de proveedores." },
    ],
  }),
  component: Proveedores,
});

type FormProveedor = {
  id: string | null;
  id_number: string;
  name: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
};

const vacio: FormProveedor = {
  id: null,
  id_number: "",
  name: "",
  company: "",
  contact: "",
  phone: "",
  email: "",
  address: "",
};

function Proveedores() {
  const qc = useQueryClient();
  const { can } = useSession();
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<FormProveedor>(vacio);

  const { data: proveedores = [], isLoading } = useQuery({
    queryKey: ["proveedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return proveedores;
    return proveedores.filter((p) =>
      [p.name, p.company ?? "", p.id_number, p.contact ?? "", p.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [proveedores, q]);

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        id_number: form.id_number,
        name: form.name,
        company: form.company || null,
        contact: form.contact || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
      };
      const { error } = form.id
        ? await supabase.from("suppliers").update(payload).eq("id", form.id)
        : await supabase.from("suppliers").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(form.id ? "Proveedor actualizado" : "Proveedor registrado");
      setAbierto(false);
      setForm(vacio);
      qc.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternar = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("suppliers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      qc.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const puedeCrear = can("suppliers.create");
  const puedeEditar = can("suppliers.update");

  return (
    <AppShell
      title="Proveedores"
      subtitle={`${proveedores.length} registrados`}
      actions={
        puedeCrear && (
          <Button
            onClick={() => {
              setForm(vacio);
              setAbierto(true);
            }}
          >
            Nuevo proveedor
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <Input
          className="max-w-md"
          placeholder="Buscar por nombre, empresa, RUC o contacto"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">RUC / Cédula</th>
                <th>Proveedor</th>
                <th>Empresa</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th className="pr-3 text-right">Acciones</th>
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
              {!isLoading && filtrados.length === 0 && (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={7}>
                    Sin resultados.
                  </td>
                </tr>
              )}
              {filtrados.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{p.id_number}</td>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-muted-foreground">{p.company ?? "—"}</td>
                  <td className="text-muted-foreground">{p.contact ?? "—"}</td>
                  <td className="text-muted-foreground">{p.phone ?? "—"}</td>
                  <td>
                    <Badge variant={p.active ? "secondary" : "outline"}>{p.active ? "Activo" : "Inactivo"}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {puedeEditar && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setForm({
                              id: p.id,
                              id_number: p.id_number,
                              name: p.name,
                              company: p.company ?? "",
                              contact: p.contact ?? "",
                              phone: p.phone ?? "",
                              email: p.email ?? "",
                              address: p.address ?? "",
                            });
                            setAbierto(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alternar.mutate({ id: p.id, active: !p.active })}
                        >
                          {p.active ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
            <DialogDescription>Datos fiscales y de contacto del proveedor.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>RUC / Cédula</Label>
              <Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Persona de contacto</Label>
              <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
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
            <Button onClick={() => guardar.mutate()} disabled={!form.id_number || !form.name || guardar.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
