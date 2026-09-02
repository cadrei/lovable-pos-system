# Completar el sistema POS: 4 módulos finales + verificación

El menú ya enlaza a Proveedores, Reportes, Seguridad y Configuración, pero esas páginas no existen todavía, así que la app no compila. Este plan las crea y cierra la verificación final.

## 1. Proveedores (`/proveedores`)
- Listado con búsqueda por nombre, RUC/cédula, empresa o contacto.
- Alta y edición en diálogo: identificación, nombre, empresa, dirección, teléfono, email, contacto.
- Activar/desactivar proveedor (no se borra, para conservar historial de compras).
- Acciones de crear/editar visibles solo con el permiso correspondiente.

## 2. Reportes (`/reportes`)
Pestañas con rango de fechas (hoy, 7 días, 30 días, mes actual, personalizado):
- **Ventas**: total facturado, número de ventas, ticket promedio, utilidad bruta, gráfico de evolución diaria y desglose por método de pago.
- **Productos**: más vendidos por cantidad e importe, y productos con margen más alto.
- **Inventario**: valorización del stock a costo y a precio de venta, productos bajo mínimo y sin movimiento.
- **Caja**: sesiones cerradas con montos esperado, declarado y diferencia.
- Exportación a CSV de la tabla visible en cada pestaña.

## 3. Seguridad (`/seguridad`)
- **Usuarios**: lista de perfiles con nombre, correo, sucursal, estado y último acceso; activar/desactivar y asignar sucursal.
- **Roles**: asignar o quitar roles (administrador, supervisor, cajero, bodega) por usuario.
- **Permisos**: matriz rol × permiso, agrupada por módulo, editable por administrador.
- **Auditoría**: bitácora filtrable por módulo, acción y fecha, con detalle del valor anterior/nuevo.
- Todo el módulo solo accesible con permisos de administración de usuarios.

## 4. Configuración (`/configuracion`)
- Datos de la empresa: nombre, RUC, dirección, teléfono, correo, logo.
- Sucursales y cajas: alta, edición y activación.
- Catálogos: categorías, marcas, unidades e impuestos (IVA), en pestañas con CRUD simple.
- Parámetros del sistema: serie de facturación, IVA por defecto, texto al pie del comprobante.

## 5. Verificación
- Revisar tipos generados de la base de datos y alinear cualquier consulta desfasada.
- Compilación y typecheck limpios.
- Prueba en navegador: iniciar sesión, recorrer las diez páginas del menú y confirmar que cargan datos reales sin errores en consola.

## Detalles técnicos
- Mismo patrón que las páginas ya hechas: `createFileRoute` bajo `_authenticated/`, `AppShell`, React Query contra el cliente Supabase del navegador, RLS aplicando permisos, `sonner` para avisos e invalidación de caché tras cada mutación.
- Formato monetario y de fechas vía `src/lib/format.ts`; gráficos con Recharts como en el panel.
- Cada acción sensible se oculta con `can(...)` de `useSession`, además del control real que ya hace RLS en el servidor.
- Pendiente de seguridad: cuatro funciones `SECURITY DEFINER` (`has_role`, `has_permission`, `can`, `next_document_number`) siguen siendo ejecutables por usuarios autenticados. Son necesarias para RLS y numeración; lo revisaré para restringir lo que se pueda y documentar el resto.
