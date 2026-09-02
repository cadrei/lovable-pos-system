import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { fecha, fechaHora, money, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — PuntoVenta" },
      { name: "description", content: "Reportes de ventas, productos, inventario y caja con exportación a CSV." },
      { property: "og:title", content: "Reportes — PuntoVenta" },
      { property: "og:description", content: "Analítica comercial del punto de venta." },
    ],
  }),
  component: Reportes;
});

function Reportes() {
  return null;
}
