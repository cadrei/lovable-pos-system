import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Rol = "administrador" | "supervisor" | "cajero" | "bodega";

type SessionCtx = {
  session: Session | null;
  loading: boolean;
  userId: string | null;
  nombre: string;
  email: string;
  roles: Rol[];
  permisos: string[];
  can: (perm: string) => boolean;
  refresh: () => void;
};

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session ?? null,
    staleTime: 30_000,
  });

  const session = sessionQuery.data ?? null;
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      qc.invalidateQueries({ queryKey: ["auth-session"] });
      if (event !== "SIGNED_OUT") qc.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const perfilQuery = useQuery({
    queryKey: ["perfil", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: perfil }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      const rolesList = (roles ?? []).map((r) => r.role as Rol);
      let permisos: string[] = [];
      if (rolesList.length) {
        const { data: perms } = await supabase
          .from("role_permissions")
          .select("permission_code")
          .in("role", rolesList);
        permisos = [...new Set((perms ?? []).map((p) => p.permission_code))];
      }
      return { perfil, roles: rolesList, permisos };
    },
  });

  const permisos = perfilQuery.data?.permisos ?? [];
  const can = useCallback((perm: string) => permisos.includes(perm), [permisos]);

  const value = useMemo<SessionCtx>(
    () => ({
      session,
      loading: sessionQuery.isLoading || (!!userId && perfilQuery.isLoading),
      userId,
      nombre: perfilQuery.data?.perfil?.full_name || session?.user.email?.split("@")[0] || "",
      email: session?.user.email ?? "",
      roles: perfilQuery.data?.roles ?? [],
      permisos,
      can,
      refresh: () => qc.invalidateQueries({ queryKey: ["perfil"] }),
    }),
    [session, sessionQuery.isLoading, perfilQuery.isLoading, perfilQuery.data, userId, permisos, can, qc],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
