export const money = (n: number | null | undefined) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(Number(n ?? 0));

export const num = (n: number | null | undefined, d = 0) =>
  new Intl.NumberFormat("es-EC", { minimumFractionDigits: d, maximumFractionDigits: d }).format(
    Number(n ?? 0),
  );

export const fecha = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export const fechaHora = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("es-EC", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const IVA = 0.15;
