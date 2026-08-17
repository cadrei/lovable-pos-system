import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";

import { AppShell } from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { permisosPorRol, usePos, type Usuario } from "../lib/pos-store";

export const Route = createFileRoute("/seguridad")({
  head: () => ({
    meta: [
      { title: "Seguridad — PuntoVenta" },
      {
        name: "description",
        content: "Usuarios, roles con permisos por módulo y bitácora de auditoría del sistema.",
      },
      { property: "og:title", content: "Seguridad — PuntoVenta" },
      { property: "og:description", content: "Usuarios, roles, permisos y bitácora de auditoría." },
    ],
  }),
  component: Seguridad,
});

const modulos = ["Inventario", "Ventas", "Facturación", "Reportes", "Seguridad"];
const roles = Object.keys(permisosPorRol) as Usuario["rol"][];

function Seguridad() {
  const { usuarios, alternarUsuario, bitacora } = usePos();

  return (
    <AppShell title="Seguridad" subtitle="Usuarios, roles y auditoría">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <h2 className="border-b border-border px-5 py-4 text-sm font-semibold">Usuarios</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead className="text-right">Activo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">{u.nombre}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.rol}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{u.ultimoAcceso}</TableCell>
                  <TableCell className="text-right">
                    <Switch checked={u.activo} onCheckedChange={() => alternarUsuario(u.id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <h2 className="border-b border-border px-5 py-4 text-sm font-semibold">
            Matriz de permisos por rol
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Módulo</TableHead>
                {roles.map((r) => (
                  <TableHead key={r} className="text-center text-xs">
                    {r}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {modulos.map((m) => (
                <TableRow key={m}>
                  <TableCell className="font-medium">{m}</TableCell>
                  {roles.map((r) => (
                    <TableCell key={r} className="text-center">
                      {permisosPorRol[r].includes(m) ? (
                        <Check className="mx-auto size-4 text-success" />
                      ) : (
                        <X className="mx-auto size-4 text-muted-foreground/50" />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Bitácora de auditoría</h2>
        <ul className="mt-4 divide-y divide-border">
          {bitacora.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span>{b.accion}</span>
              <span className="text-xs text-muted-foreground">
                {b.usuario} · {b.modulo} · {b.fecha}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
