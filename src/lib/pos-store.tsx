import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Producto = {
  id: string;
  sku: string;
  nombre: string;
  categoria: string;
  precio: number;
  costo: number;
  stock: number;
  minimo: number;
};

export type LineaVenta = {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
};

export type Factura = {
  id: string;
  numero: string;
  fecha: string;
  cliente: string;
  metodoPago: "Efectivo" | "Tarjeta" | "Transferencia";
  lineas: LineaVenta[];
  subtotal: number;
  impuesto: number;
  total: number;
  estado: "Emitida" | "Anulada";
  cajero: string;
};

export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: "Administrador" | "Cajero" | "Supervisor" | "Auditor";
  activo: boolean;
  ultimoAcceso: string;
};

export type Bitacora = {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  modulo: string;
};

export const IVA = 0.15;

const productosIniciales: Producto[] = [
  { id: "p1", sku: "BEB-001", nombre: "Café molido 500g", categoria: "Bebidas", precio: 8.5, costo: 5.1, stock: 42, minimo: 10 },
  { id: "p2", sku: "BEB-002", nombre: "Té verde 20 sobres", categoria: "Bebidas", precio: 4.2, costo: 2.3, stock: 8, minimo: 12 },
  { id: "p3", sku: "ABA-010", nombre: "Arroz premium 2kg", categoria: "Abarrotes", precio: 3.9, costo: 2.6, stock: 120, minimo: 25 },
  { id: "p4", sku: "ABA-011", nombre: "Aceite girasol 1L", categoria: "Abarrotes", precio: 5.75, costo: 3.9, stock: 18, minimo: 20 },
  { id: "p5", sku: "LAC-004", nombre: "Leche entera 1L", categoria: "Lácteos", precio: 1.35, costo: 0.95, stock: 64, minimo: 30 },
  { id: "p6", sku: "LAC-007", nombre: "Queso fresco 500g", categoria: "Lácteos", precio: 6.4, costo: 4.5, stock: 5, minimo: 10 },
  { id: "p7", sku: "LIM-002", nombre: "Detergente 3kg", categoria: "Limpieza", precio: 9.8, costo: 6.7, stock: 31, minimo: 8 },
  { id: "p8", sku: "SNK-021", nombre: "Galletas surtidas", categoria: "Snacks", precio: 2.15, costo: 1.2, stock: 90, minimo: 20 },
];

const facturasIniciales: Factura[] = [
  {
    id: "f1",
    numero: "001-001-000001842",
    fecha: "2026-08-16T14:12:00",
    cliente: "Consumidor final",
    metodoPago: "Efectivo",
    lineas: [{ productoId: "p3", nombre: "Arroz premium 2kg", precio: 3.9, cantidad: 4 }],
    subtotal: 15.6,
    impuesto: 2.34,
    total: 17.94,
    estado: "Emitida",
    cajero: "María Cedeño",
  },
  {
    id: "f2",
    numero: "001-001-000001843",
    fecha: "2026-08-16T17:45:00",
    cliente: "Distribuidora Andina S.A.",
    metodoPago: "Transferencia",
    lineas: [{ productoId: "p1", nombre: "Café molido 500g", precio: 8.5, cantidad: 12 }],
    subtotal: 102,
    impuesto: 15.3,
    total: 117.3,
    estado: "Emitida",
    cajero: "Luis Paredes",
  },
  {
    id: "f3",
    numero: "001-001-000001844",
    fecha: "2026-08-17T10:05:00",
    cliente: "Consumidor final",
    metodoPago: "Tarjeta",
    lineas: [{ productoId: "p7", nombre: "Detergente 3kg", precio: 9.8, cantidad: 2 }],
    subtotal: 19.6,
    impuesto: 2.94,
    total: 22.54,
    estado: "Anulada",
    cajero: "María Cedeño",
  },
];

const usuariosIniciales: Usuario[] = [
  { id: "u1", nombre: "Ana Villacís", email: "ana@puntoventa.ec", rol: "Administrador", activo: true, ultimoAcceso: "2026-08-17 09:41" },
  { id: "u2", nombre: "María Cedeño", email: "maria@puntoventa.ec", rol: "Cajero", activo: true, ultimoAcceso: "2026-08-17 10:02" },
  { id: "u3", nombre: "Luis Paredes", email: "luis@puntoventa.ec", rol: "Supervisor", activo: true, ultimoAcceso: "2026-08-16 18:20" },
  { id: "u4", nombre: "Jorge Ruiz", email: "jorge@puntoventa.ec", rol: "Auditor", activo: false, ultimoAcceso: "2026-07-28 11:15" },
];

export const permisosPorRol: Record<Usuario["rol"], string[]> = {
  Administrador: ["Inventario", "Ventas", "Facturación", "Reportes", "Seguridad"],
  Cajero: ["Ventas", "Facturación"],
  Supervisor: ["Inventario", "Ventas", "Facturación", "Reportes"],
  Auditor: ["Reportes", "Facturación"],
};

type Ctx = {
  productos: Producto[];
  facturas: Factura[];
  usuarios: Usuario[];
  bitacora: Bitacora[];
  agregarProducto: (p: Omit<Producto, "id">) => void;
  ajustarStock: (id: string, delta: number) => void;
  registrarVenta: (input: {
    lineas: LineaVenta[];
    cliente: string;
    metodoPago: Factura["metodoPago"];
  }) => Factura;
  anularFactura: (id: string) => void;
  alternarUsuario: (id: string) => void;
};

const PosContext = createContext<Ctx | null>(null);

let seq = 1845;

export function PosProvider({ children }: { children: ReactNode }) {
  const [productos, setProductos] = useState(productosIniciales);
  const [facturas, setFacturas] = useState(facturasIniciales);
  const [usuarios, setUsuarios] = useState(usuariosIniciales);
  const [bitacora, setBitacora] = useState<Bitacora[]>([
    { id: "b1", fecha: "2026-08-17 10:02", usuario: "María Cedeño", accion: "Inicio de sesión", modulo: "Seguridad" },
    { id: "b2", fecha: "2026-08-17 10:05", usuario: "María Cedeño", accion: "Anulación de factura 001-001-000001844", modulo: "Facturación" },
    { id: "b3", fecha: "2026-08-16 18:20", usuario: "Luis Paredes", accion: "Ajuste de inventario: Arroz premium 2kg", modulo: "Inventario" },
  ]);

  const log = useCallback((accion: string, modulo: string, usuario = "Ana Villacís") => {
    setBitacora((b) => [
      { id: crypto.randomUUID(), fecha: new Date().toLocaleString("es-EC"), usuario, accion, modulo },
      ...b,
    ]);
  }, []);

  const agregarProducto: Ctx["agregarProducto"] = useCallback(
    (p) => {
      setProductos((prev) => [{ ...p, id: crypto.randomUUID() }, ...prev]);
      log(`Producto creado: ${p.nombre}`, "Inventario");
    },
    [log],
  );

  const ajustarStock: Ctx["ajustarStock"] = useCallback(
    (id, delta) => {
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, p.stock + delta) } : p)),
      );
      log(`Ajuste de stock (${delta > 0 ? "+" : ""}${delta})`, "Inventario");
    },
    [log],
  );

  const registrarVenta: Ctx["registrarVenta"] = useCallback(
    ({ lineas, cliente, metodoPago }) => {
      const subtotal = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
      const impuesto = +(subtotal * IVA).toFixed(2);
      const factura: Factura = {
        id: crypto.randomUUID(),
        numero: `001-001-${String(seq++).padStart(9, "0")}`,
        fecha: new Date().toISOString(),
        cliente: cliente || "Consumidor final",
        metodoPago,
        lineas,
        subtotal: +subtotal.toFixed(2),
        impuesto,
        total: +(subtotal + impuesto).toFixed(2),
        estado: "Emitida",
        cajero: "María Cedeño",
      };
      setFacturas((prev) => [factura, ...prev]);
      setProductos((prev) =>
        prev.map((p) => {
          const l = lineas.find((x) => x.productoId === p.id);
          return l ? { ...p, stock: Math.max(0, p.stock - l.cantidad) } : p;
        }),
      );
      log(`Venta registrada ${factura.numero}`, "Ventas", "María Cedeño");
      return factura;
    },
    [log],
  );

  const anularFactura: Ctx["anularFactura"] = useCallback(
    (id) => {
      setFacturas((prev) =>
        prev.map((f) => (f.id === id ? { ...f, estado: "Anulada" as const } : f)),
      );
      log("Factura anulada", "Facturación");
    },
    [log],
  );

  const alternarUsuario: Ctx["alternarUsuario"] = useCallback(
    (id) => {
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u)));
      log("Cambio de estado de usuario", "Seguridad");
    },
    [log],
  );

  const value = useMemo(
    () => ({
      productos,
      facturas,
      usuarios,
      bitacora,
      agregarProducto,
      ajustarStock,
      registrarVenta,
      anularFactura,
      alternarUsuario,
    }),
    [productos, facturas, usuarios, bitacora, agregarProducto, ajustarStock, registrarVenta, anularFactura, alternarUsuario],
  );

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos debe usarse dentro de PosProvider");
  return ctx;
}

export const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);
