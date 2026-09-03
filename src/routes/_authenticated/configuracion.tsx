import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — PuntoVenta" },
      { name: "description", content: "Datos de la empresa, sucursales, cajas, catálogos y parámetros del sistema." },
      { property: "og:title", content: "Configuración — PuntoVenta" },
      { property: "og:description", content: "Parámetros generales del punto de venta." },
    ],
  }),
  component: Configuracion,
});

type Catalogo = "categories" | "brands" | "units" | "taxes";

function Configuracion() {
  const qc = useQueryClient();
  const { can } = useSession();
  const puedeEditar = can("settings.update");

  const empresaQ = useQuery({
    queryKey: ["cfg-empresa"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [empresa, setEmpresa] = useState({
    name: "",
    tax_id: "",
    address: "",
    phone: "",
    email: "",
    logo_url: "",
  });

  useEffect(() => {
    if (empresaQ.data) {
      setEmpresa({
        name: empresaQ.data.name ?? "",
        tax_id: empresaQ.data.tax_id ?? "",
        address: empresaQ.data.address ?? "",
        phone: empresaQ.data.phone ?? "",
        email: empresaQ.data.email ?? "",
        logo_url: empresaQ.data.logo_url ?? "",
      });
    }
  }, [empresaQ.data]);

  const guardarEmpresa = useMutation({
    mutationFn: async () => {
      if (!empresaQ.data) throw new Error("No hay empresa registrada");
      const { error } = await supabase
        .from("companies")
        .update({
          name: empresa.name,
          tax_id: empresa.tax_id,
          address: empresa.address || null,
          phone: empresa.phone || null,
          email: empresa.email || null,
          logo_url: empresa.logo_url || null,
        })
        .eq("id", empresaQ.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Datos de la empresa actualizados");
      qc.invalidateQueries({ queryKey: ["cfg-empresa"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sucursalesQ = useQuery({
    queryKey: ["cfg-sucursales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const cajasQ = useQuery({
    queryKey: ["cfg-cajas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cash_registers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const [nuevaSucursal, setNuevaSucursal] = useState({ code: "", name: "", address: "", phone: "" });
  const crearSucursal = useMutation({
    mutationFn: async () => {
      if (!empresaQ.data) throw new Error("No hay empresa registrada");
      const { error } = await supabase.from("branches").insert({
        company_id: empresaQ.data.id,
        code: nuevaSucursal.code,
        name: nuevaSucursal.name,
        address: nuevaSucursal.address || null,
        phone: nuevaSucursal.phone || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sucursal creada");
      setNuevaSucursal({ code: "", name: "", address: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["cfg-sucursales"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternarSucursal = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("branches").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cfg-sucursales"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const alternarCaja = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("cash_registers").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cfg-cajas"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const catalogosQ = useQuery({
    queryKey: ["cfg-catalogos"],
    queryFn: async () => {
      const [cat, mar, uni, imp] = await Promise.all([
        supabase.from("categories").select("id, name, active").order("name"),
        supabase.from("brands").select("id, name, active").order("name"),
        supabase.from("units").select("id, code, name, active").order("name"),
        supabase.from("taxes").select("id, name, rate, active").order("name"),
      ]);
      return {
        categories: cat.data ?? [],
        brands: mar.data ?? [],
        units: uni.data ?? [],
        taxes: imp.data ?? [],
      };
    },
  });

  const [nuevoCat, setNuevoCat] = useState({ categories: "", brands: "", units: "", taxes: "" });
  const [nuevoUnitCode, setNuevoUnitCode] = useState("");
  const [nuevaTasa, setNuevaTasa] = useState("15");

  const crearCatalogo = useMutation({
    mutationFn: async (tabla: Catalogo) => {
      const nombre = nuevoCat[tabla].trim();
      if (!nombre) throw new Error("Escribe un nombre");
      if (tabla === "units") {
        const { error } = await supabase.from("units").insert({ code: nuevoUnitCode || nombre.slice(0, 3), name: nombre });
        if (error) throw error;
      } else if (tabla === "taxes") {
        const { error } = await supabase.from("taxes").insert({ name: nombre, rate: Number(nuevaTasa) / 100 });
        if (error) throw error;
      } else if (tabla === "categories") {
        const { error } = await supabase.from("categories").insert({ name: nombre });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brands").insert({ name: nombre });
        if (error) throw error;
      }
    },
    onSuccess: (_d, tabla) => {
      toast.success("Registro creado");
      setNuevoCat({ ...nuevoCat, [tabla]: "" });
      qc.invalidateQueries({ queryKey: ["cfg-catalogos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ajustesQ = useQuery({
    queryKey: ["cfg-ajustes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings").select("key, value, description").order("key");
      if (error) throw error;
      return data;
    },
  });

  const guardarAjuste = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase.from("system_settings").update({ value }).eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parámetro actualizado");
      qc.invalidateQueries({ queryKey: ["cfg-ajustes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [ajustes, setAjustes] = useState<Record<string, string>>({});
  useEffect(() => {
    if (ajustesQ.data) {
      setAjustes(
        Object.fromEntries(
          ajustesQ.data.map((a) => [a.key, typeof a.value === "string" ? a.value : JSON.stringify(a.value)]),
        ),
      );
    }
  }, [ajustesQ.data]);

  const catalogos = catalogosQ.data;

  return (
    <AppShell title="Configuración" subtitle="Empresa, sucursales, catálogos y parámetros">
      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="sucursales">Sucursales y cajas</TabsTrigger>
          <TabsTrigger value="catalogos">Catálogos</TabsTrigger>
          <TabsTrigger value="parametros">Parámetros</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="pt-4">
          <div className="max-w-2xl space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Razón social</Label>
                <Input
                  value={empresa.name}
                  disabled={!puedeEditar}
                  onChange={(e) => setEmpresa({ ...empresa, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>RUC</Label>
                <Input
                  value={empresa.tax_id}
                  disabled={!puedeEditar}
                  onChange={(e) => setEmpresa({ ...empresa, tax_id: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input
                  value={empresa.phone}
                  disabled={!puedeEditar}
                  onChange={(e) => setEmpresa({ ...empresa, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Correo</Label>
                <Input
                  value={empresa.email}
                  disabled={!puedeEditar}
                  onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Dirección</Label>
                <Input
                  value={empresa.address}
                  disabled={!puedeEditar}
                  onChange={(e) => setEmpresa({ ...empresa, address: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>URL del logo</Label>
                <Input
                  value={empresa.logo_url}
                  disabled={!puedeEditar}
                  onChange={(e) => setEmpresa({ ...empresa, logo_url: e.target.value })}
                />
              </div>
            </div>
            {puedeEditar && (
              <Button onClick={() => guardarEmpresa.mutate()} disabled={guardarEmpresa.isPending}>
                Guardar cambios
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sucursales" className="space-y-6 pt-4">
          {puedeEditar && (
            <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-5">
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input value={nuevaSucursal.code} onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={nuevaSucursal.name} onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Dirección</Label>
                <Input value={nuevaSucursal.address} onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={nuevaSucursal.phone} onChange={(e) => setNuevaSucursal({ ...nuevaSucursal, phone: e.target.value })} />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={() => crearSucursal.mutate()}
                  disabled={!nuevaSucursal.code || !nuevaSucursal.name || crearSucursal.isPending}
                >
                  Agregar
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Código</th>
                  <th>Sucursal</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th className="pr-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {(sucursalesQ.data ?? []).map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{s.code}</td>
                    <td className="font-medium">{s.name}</td>
                    <td className="text-muted-foreground">{s.address ?? "—"}</td>
                    <td>
                      <Badge variant={s.active ? "secondary" : "outline"}>{s.active ? "Activa" : "Inactiva"}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {puedeEditar && (
                        <Button size="sm" variant="outline" onClick={() => alternarSucursal.mutate({ id: s.id, active: !s.active })}>
                          {s.active ? "Desactivar" : "Activar"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <p className="border-b border-border bg-muted/40 p-3 text-xs font-semibold uppercase tracking-wide">Cajas</p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Código</th>
                  <th>Caja</th>
                  <th>Sucursal</th>
                  <th>Estado</th>
                  <th className="pr-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {(cajasQ.data ?? []).map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3 font-mono text-xs">{c.code}</td>
                    <td className="font-medium">{c.name}</td>
                    <td className="text-muted-foreground">
                      {(sucursalesQ.data ?? []).find((s) => s.id === c.branch_id)?.name ?? "—"}
                    </td>
                    <td>
                      <Badge variant={c.active ? "secondary" : "outline"}>{c.active ? "Activa" : "Inactiva"}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {puedeEditar && (
                        <Button size="sm" variant="outline" onClick={() => alternarCaja.mutate({ id: c.id, active: !c.active })}>
                          {c.active ? "Desactivar" : "Activar"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="catalogos" className="pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {([
              ["categories", "Categorías"],
              ["brands", "Marcas"],
              ["units", "Unidades"],
              ["taxes", "Impuestos"],
            ] as [Catalogo, string][]).map(([tabla, titulo]) => (
              <div key={tabla} className="rounded-xl border border-border bg-card">
                <p className="border-b border-border bg-muted/40 p-3 text-xs font-semibold uppercase tracking-wide">
                  {titulo}
                </p>
                {puedeEditar && (
                  <div className="flex flex-wrap gap-2 border-b border-border p-3">
                    <Input
                      className="flex-1"
                      placeholder={`Nuevo en ${titulo.toLowerCase()}`}
                      value={nuevoCat[tabla]}
                      onChange={(e) => setNuevoCat({ ...nuevoCat, [tabla]: e.target.value })}
                    />
                    {tabla === "units" && (
                      <Input
                        className="w-24"
                        placeholder="Código"
                        value={nuevoUnitCode}
                        onChange={(e) => setNuevoUnitCode(e.target.value)}
                      />
                    )}
                    {tabla === "taxes" && (
                      <Input
                        className="w-24"
                        placeholder="%"
                        value={nuevaTasa}
                        onChange={(e) => setNuevaTasa(e.target.value)}
                      />
                    )}
                    <Button onClick={() => crearCatalogo.mutate(tabla)} disabled={crearCatalogo.isPending}>
                      Agregar
                    </Button>
                  </div>
                )}
                <ul className="divide-y divide-border text-sm">
                  {(catalogos?.[tabla] ?? []).map((r) => (
                    <li key={r.id} className="flex items-center justify-between p-3">
                      <span>{r.name}</span>
                      {"rate" in r ? (
                        <Badge variant="outline">{num(Number(r.rate) * 100, 0)}%</Badge>
                      ) : (
                        <Badge variant={r.active ? "secondary" : "outline"}>{r.active ? "Activo" : "Inactivo"}</Badge>
                      )}
                    </li>
                  ))}
                  {(catalogos?.[tabla] ?? []).length === 0 && (
                    <li className="p-3 text-muted-foreground">Sin registros.</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="parametros" className="pt-4">
          <div className="max-w-3xl space-y-3 rounded-xl border border-border bg-card p-5">
            {(ajustesQ.data ?? []).map((a) => (
              <div key={a.key} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
                <div>
                  <p className="font-mono text-xs">{a.key}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                <Input
                  value={ajustes[a.key] ?? ""}
                  disabled={!puedeEditar}
                  onChange={(e) => setAjustes({ ...ajustes, [a.key]: e.target.value })}
                />
                {puedeEditar && (
                  <Button
                    variant="outline"
                    onClick={() => guardarAjuste.mutate({ key: a.key, value: ajustes[a.key] ?? "" })}
                    disabled={guardarAjuste.isPending}
                  >
                    Guardar
                  </Button>
                )}
              </div>
            ))}
            {(ajustesQ.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No hay parámetros configurados.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
