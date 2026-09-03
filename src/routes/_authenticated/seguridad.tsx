import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession, type Rol } from "@/hooks/use-session";
import { fechaHora } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/seguridad")({
  head: () => ({
    meta: [
      { title: "Seguridad — PuntoVenta" },
      { name: "description", content: "Administración de usuarios, roles, permisos y bitácora de auditoría." },
      { property: "og:title", content: "Seguridad — PuntoVenta" },
      { property: "og:description", content: "Control de accesos y auditoría del sistema." },
    ],
  }),
  component: Seguridad,
});

const ROLES: Rol[] = ["administrador", "supervisor", "cajero", "bodega"];

function Seguridad() {
  const qc = useQueryClient();
  const { can } = useSession();
  const puedeEditar = can("users.update");
  const [q, setQ] = useState("");
  const [moduloAuditoria, setModuloAuditoria] = useState("todos");

  const perfilesQ = useQuery({
    queryKey: ["seg-perfiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, branch_id, active, last_login_at")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const rolesQ = useQuery({
    queryKey: ["seg-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id, user_id, role");
      if (error) throw error;
      return data;
    },
  });

  const sucursalesQ = useQuery({
    queryKey: ["seg-sucursales"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const permisosQ = useQuery({
    queryKey: ["seg-permisos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permissions").select("code, module, description").order("code");
      if (error) throw error;
      return data;
    },
  });

  const rolPermQ = useQuery({
    queryKey: ["seg-rol-permisos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("role_permissions").select("id, role, permission_code");
      if (error) throw error;
      return data;
    },
  });

  const auditoriaQ = useQuery({
    queryKey: ["seg-auditoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, user_email, action, module, entity, entity_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const perfiles = perfilesQ.data ?? [];
  const roles = rolesQ.data ?? [];
  const permisos = permisosQ.data ?? [];
  const rolPerm = rolPermQ.data ?? [];
  const auditoria = auditoriaQ.data ?? [];

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return perfiles;
    return perfiles.filter((p) => `${p.full_name} ${p.email ?? ""}`.toLowerCase().includes(s));
  }, [perfiles, q]);

  const modulos = useMemo(() => [...new Set(auditoria.map((a) => a.module))].sort(), [auditoria]);
  const auditoriaFiltrada = auditoria.filter((a) => moduloAuditoria === "todos" || a.module === moduloAuditoria);

  const porModulo = useMemo(() => {
    const mapa = new Map<string, typeof permisos>();
    permisos.forEach((p) => mapa.set(p.module, [...(mapa.get(p.module) ?? []), p]));
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permisos]);

  const actualizarPerfil = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { active?: boolean; branch_id?: string | null };
    }) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuario actualizado");
      qc.invalidateQueries({ queryKey: ["seg-perfiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternarRol = useMutation({
    mutationFn: async ({ userId, rol, activo }: { userId: string; rol: Rol; activo: boolean }) => {
      if (activo) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: rol });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", rol);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Roles actualizados");
      qc.invalidateQueries({ queryKey: ["seg-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternarPermiso = useMutation({
    mutationFn: async ({ rol, code, activo }: { rol: Rol; code: string; activo: boolean }) => {
      if (activo) {
        const { error } = await supabase.from("role_permissions").insert({ role: rol, permission_code: code });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", rol)
          .eq("permission_code", code);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Permisos actualizados");
      qc.invalidateQueries({ queryKey: ["seg-rol-permisos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Seguridad" subtitle="Usuarios, roles, permisos y auditoría">
      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permisos">Permisos</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4 pt-4">
          <Input
            className="max-w-md"
            placeholder="Buscar usuario por nombre o correo"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Usuario</th>
                  <th>Correo</th>
                  <th>Sucursal</th>
                  <th>Último acceso</th>
                  <th>Estado</th>
                  <th className="pr-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-medium">{p.full_name}</td>
                    <td className="text-muted-foreground">{p.email ?? "—"}</td>
                    <td>
                      {puedeEditar ? (
                        <Select
                          value={p.branch_id ?? "ninguna"}
                          onValueChange={(v) =>
                            actualizarPerfil.mutate({ id: p.id, patch: { branch_id: v === "ninguna" ? null : v } })
                          }
                        >
                          <SelectTrigger className="h-8 w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ninguna">Sin asignar</SelectItem>
                            {(sucursalesQ.data ?? []).map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground">
                          {(sucursalesQ.data ?? []).find((s) => s.id === p.branch_id)?.name ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="text-muted-foreground">{p.last_login_at ? fechaHora(p.last_login_at) : "—"}</td>
                    <td>
                      <Badge variant={p.active ? "secondary" : "outline"}>{p.active ? "Activo" : "Inactivo"}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {puedeEditar && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => actualizarPerfil.mutate({ id: p.id, patch: { active: !p.active } })}
                        >
                          {p.active ? "Desactivar" : "Activar"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4 pt-4">
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Usuario</th>
                  {ROLES.map((r) => (
                    <th key={r} className="capitalize">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfiles.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3">
                      <p className="font-medium">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </td>
                    {ROLES.map((r) => {
                      const tiene = roles.some((ur) => ur.user_id === p.id && ur.role === r);
                      return (
                        <td key={r}>
                          <Checkbox
                            checked={tiene}
                            disabled={!puedeEditar || alternarRol.isPending}
                            onCheckedChange={(v) =>
                              alternarRol.mutate({ userId: p.id, rol: r, activo: v === true })
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="permisos" className="space-y-6 pt-4">
          {porModulo.map(([modulo, lista]) => (
            <div key={modulo} className="overflow-x-auto rounded-xl border border-border bg-card">
              <p className="border-b border-border bg-muted/40 p-3 text-xs font-semibold uppercase tracking-wide">
                {modulo}
              </p>
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Permiso</th>
                    {ROLES.map((r) => (
                      <th key={r} className="capitalize">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map((perm) => (
                    <tr key={perm.code} className="border-t border-border">
                      <td className="p-3">
                        <p className="font-mono text-xs">{perm.code}</p>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </td>
                      {ROLES.map((r) => {
                        const tiene = rolPerm.some((rp) => rp.role === r && rp.permission_code === perm.code);
                        return (
                          <td key={r}>
                            <Checkbox
                              checked={tiene}
                              disabled={!puedeEditar || alternarPermiso.isPending}
                              onCheckedChange={(v) =>
                                alternarPermiso.mutate({ rol: r, code: perm.code, activo: v === true })
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="auditoria" className="space-y-4 pt-4">
          <Select value={moduloAuditoria} onValueChange={setModuloAuditoria}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los módulos</SelectItem>
              {modulos.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th>Usuario</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th className="pr-3">Entidad</th>
                </tr>
              </thead>
              <tbody>
                {auditoriaFiltrada.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-3 text-muted-foreground">{fechaHora(a.created_at)}</td>
                    <td>{a.user_email ?? "—"}</td>
                    <td className="capitalize">{a.module}</td>
                    <td>
                      <Badge variant="outline">{a.action}</Badge>
                    </td>
                    <td className="pr-3 font-mono text-xs text-muted-foreground">
                      {a.entity ?? "—"} {a.entity_id ? `#${a.entity_id.slice(0, 8)}` : ""}
                    </td>
                  </tr>
                ))}
                {auditoriaFiltrada.length === 0 && (
                  <tr>
                    <td className="p-3 text-muted-foreground" colSpan={5}>
                      Sin registros de auditoría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
