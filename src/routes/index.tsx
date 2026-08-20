import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Boxes, Receipt, ScanLine, ShieldCheck, Wallet } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PuntoVenta — Sistema POS para tu negocio" },
      {
        name: "description",
        content:
          "Controla ventas, inventario, facturación, caja y reportes desde un solo sistema de punto de venta.",
      },
      { property: "og:title", content: "PuntoVenta — Sistema POS para tu negocio" },
      {
        property: "og:description",
        content: "Ventas rápidas, inventario en tiempo real, facturación y reportes.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: ScanLine, title: "Ventas rápidas", desc: "POS con búsqueda por código de barras, descuentos y pagos mixtos." },
  { icon: Boxes, title: "Inventario y kardex", desc: "Stock en tiempo real, alertas de mínimos y trazabilidad de movimientos." },
  { icon: Receipt, title: "Facturación", desc: "Emisión, anulación y numeración secuencial lista para el SRI." },
  { icon: Wallet, title: "Control de caja", desc: "Apertura, arqueo, ingresos, egresos y cierre con diferencias." },
  { icon: BarChart3, title: "Reportes", desc: "Ventas por período, productos más vendidos, márgenes y utilidades." },
  { icon: ShieldCheck, title: "Seguridad", desc: "Roles, permisos granulares y auditoría de cada acción." },
];

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/panel", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-primary font-mono text-sm font-bold text-primary-foreground">
            PV
          </div>
          <span className="font-semibold">PuntoVenta</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild>
            <Link to="/auth">Ingresar</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="py-16 md:py-24">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Sistema POS empresarial
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
            Vende, factura y controla tu inventario desde un solo lugar
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Una plataforma completa para comercios: punto de venta, facturación, caja, clientes,
            proveedores, reportes y seguridad por roles.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Crear cuenta o iniciar sesión</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="stat-tile">
              <Icon className="size-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
