INSERT INTO public.permissions (code, module, description) VALUES
('sales.view','sales','Ver ventas'),('sales.create','sales','Registrar ventas'),('sales.update','sales','Editar ventas'),('sales.delete','sales','Eliminar ventas'),('sales.cancel','sales','Anular ventas'),('sales.refund','sales','Registrar devoluciones'),
('invoice.view','invoice','Ver facturas'),('invoice.create','invoice','Emitir facturas'),('invoice.update','invoice','Editar facturas'),('invoice.delete','invoice','Eliminar facturas'),('invoice.cancel','invoice','Anular facturas'),
('inventory.view','inventory','Ver inventario'),('inventory.create','inventory','Crear productos'),('inventory.update','inventory','Editar productos'),('inventory.delete','inventory','Eliminar productos'),('inventory.adjust','inventory','Ajustar existencias'),
('customers.view','customers','Ver clientes'),('customers.create','customers','Crear clientes'),('customers.update','customers','Editar clientes'),('customers.delete','customers','Eliminar clientes'),
('suppliers.view','suppliers','Ver proveedores'),('suppliers.create','suppliers','Crear proveedores'),('suppliers.update','suppliers','Editar proveedores'),('suppliers.delete','suppliers','Eliminar proveedores'),
('cash.view','cash','Ver caja'),('cash.create','cash','Abrir caja y registrar movimientos'),('cash.update','cash','Cerrar y ajustar caja'),('cash.delete','cash','Eliminar movimientos de caja'),
('reports.view','reports','Ver reportes'),('reports.create','reports','Generar reportes'),('reports.update','reports','Editar reportes'),('reports.delete','reports','Eliminar reportes'),('reports.export','reports','Exportar reportes'),
('users.view','users','Ver usuarios y roles'),('users.create','users','Crear usuarios'),('users.update','users','Editar usuarios y permisos'),('users.delete','users','Eliminar usuarios'),
('settings.view','settings','Ver configuración'),('settings.create','settings','Crear parámetros'),('settings.update','settings','Editar configuración'),('settings.delete','settings','Eliminar parámetros'),
('audit.view','audit','Ver auditoría'),('audit.create','audit','Registrar auditoría'),('audit.update','audit','Editar auditoría'),('audit.delete','audit','Eliminar auditoría');

INSERT INTO public.role_permissions (role, permission_code)
SELECT 'administrador'::public.app_role, code FROM public.permissions;
INSERT INTO public.role_permissions (role, permission_code)
SELECT 'supervisor'::public.app_role, code FROM public.permissions
WHERE module IN ('sales','inventory','customers','suppliers','cash','reports')
   OR code IN ('invoice.view','invoice.create','invoice.cancel','audit.view','settings.view');
INSERT INTO public.role_permissions (role, permission_code)
SELECT 'cajero'::public.app_role, code FROM public.permissions
WHERE code IN ('sales.view','sales.create','invoice.view','invoice.create','customers.view','customers.create','customers.update','cash.view','cash.create','cash.update','inventory.view','audit.create');
INSERT INTO public.role_permissions (role, permission_code)
SELECT 'bodega'::public.app_role, code FROM public.permissions
WHERE module IN ('inventory','suppliers') OR code IN ('reports.view','audit.create');

INSERT INTO public.companies (id, name, tax_id, address, phone, email) VALUES
('11111111-1111-1111-1111-111111111111','Mi Empresa POS','0992345678001','Av. Francisco de Orellana 123, Guayaquil','+593 4 250 1234','info@miempresapos.ec');
INSERT INTO public.branches (id, company_id, code, name, address, phone) VALUES
('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','SUC-01','Matriz Guayaquil','Av. Francisco de Orellana 123','+593 4 250 1234'),
('22222222-2222-2222-2222-222222222223','11111111-1111-1111-1111-111111111111','SUC-02','Sucursal Norte','Av. Benjamín Carrión 45','+593 4 250 5566');
INSERT INTO public.cash_registers (id, branch_id, code, name) VALUES
('33333333-3333-3333-3333-333333333331','22222222-2222-2222-2222-222222222222','CAJA-01','Caja 01'),
('33333333-3333-3333-3333-333333333332','22222222-2222-2222-2222-222222222222','CAJA-02','Caja 02'),
('33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222223','CAJA-03','Caja Norte');

INSERT INTO public.taxes (id, name, rate) VALUES
('44444444-4444-4444-4444-444444444441','IVA 15%',0.15),
('44444444-4444-4444-4444-444444444442','IVA 0%',0.00);
INSERT INTO public.units (code, name) VALUES ('UND','Unidad'),('KG','Kilogramo'),('LT','Litro'),('CJA','Caja'),('PQT','Paquete');
INSERT INTO public.brands (name) VALUES ('Genérica'),('AndinaFoods'),('LimpioMax'),('LácteosSur'),('SnackCo'),('TecnoHogar');
INSERT INTO public.categories (name, description) VALUES
('Bebidas','Bebidas frías y calientes'),('Abarrotes','Productos de despensa'),('Lácteos','Refrigerados y derivados'),('Limpieza','Higiene y limpieza del hogar'),('Snacks','Golosinas y pasabocas');

INSERT INTO public.suppliers (id_number, name, company, address, phone, email, contact) VALUES
('0992111111001','Distribuidora Andina','Distribuidora Andina S.A.','Km 12 vía Daule','+593 4 211 1111','ventas@andina.ec','Rocío Mera'),
('0992222222001','Lácteos del Sur','Lácteos del Sur Cía. Ltda.','Cuenca, Parque Industrial','+593 7 222 2222','pedidos@lacteossur.ec','Iván Cabrera'),
('0992333333001','LimpioMax','LimpioMax S.A.','Quito, Calderón','+593 2 233 3333','contacto@limpiomax.ec','Sofía Naranjo'),
('0992444444001','SnackCo','SnackCo del Ecuador','Machala, Zona Franca','+593 7 244 4444','info@snackco.ec','Pablo Terán'),
('0992555555001','TecnoHogar','TecnoHogar Import','Guayaquil, Urdesa','+593 4 255 5555','import@tecnohogar.ec','Karla Vinces');

INSERT INTO public.products (code, barcode, name, category_id, brand_id, unit_id, tax_id, supplier_id, cost_price, sale_price, stock, min_stock, max_stock)
SELECT v.code, v.barcode, v.name,
  (SELECT id FROM public.categories WHERE name = v.cat),
  (SELECT id FROM public.brands WHERE name = v.brand),
  (SELECT id FROM public.units WHERE code = v.unit),
  '44444444-4444-4444-4444-444444444441',
  (SELECT id FROM public.suppliers WHERE name = v.sup),
  v.cost, v.price, v.stock, v.minst, v.maxst
FROM (VALUES
('BEB-001','7860001000011','Café molido 500g','Bebidas','AndinaFoods','UND','Distribuidora Andina',5.10,8.50,42,10,120),
('BEB-002','7860001000028','Té verde 20 sobres','Bebidas','AndinaFoods','CJA','Distribuidora Andina',2.30,4.20,8,12,80),
('BEB-003','7860001000035','Agua mineral 1L','Bebidas','Genérica','LT','Distribuidora Andina',0.35,0.75,240,50,400),
('BEB-004','7860001000042','Gaseosa cola 2L','Bebidas','Genérica','LT','Distribuidora Andina',1.10,1.95,96,30,200),
('BEB-005','7860001000059','Jugo de naranja 1L','Bebidas','AndinaFoods','LT','Distribuidora Andina',0.90,1.60,54,20,150),
('BEB-006','7860001000066','Energizante 500ml','Bebidas','Genérica','UND','Distribuidora Andina',1.35,2.40,33,15,90),
('ABA-010','7860002000010','Arroz premium 2kg','Abarrotes','AndinaFoods','PQT','Distribuidora Andina',2.60,3.90,120,25,300),
('ABA-011','7860002000027','Aceite girasol 1L','Abarrotes','AndinaFoods','LT','Distribuidora Andina',3.90,5.75,18,20,120),
('ABA-012','7860002000034','Azúcar blanca 2kg','Abarrotes','Genérica','PQT','Distribuidora Andina',1.85,2.80,74,25,200),
('ABA-013','7860002000041','Fideos largos 400g','Abarrotes','Genérica','PQT','Distribuidora Andina',0.65,1.15,150,40,300),
('ABA-014','7860002000058','Atún en aceite 170g','Abarrotes','AndinaFoods','UND','Distribuidora Andina',1.05,1.75,88,30,240),
('ABA-015','7860002000065','Sal yodada 1kg','Abarrotes','Genérica','PQT','Distribuidora Andina',0.40,0.80,110,30,250),
('ABA-016','7860002000072','Lenteja 500g','Abarrotes','Genérica','PQT','Distribuidora Andina',0.85,1.45,62,20,180),
('ABA-017','7860002000089','Harina de trigo 2kg','Abarrotes','AndinaFoods','PQT','Distribuidora Andina',1.70,2.65,45,20,150),
('LAC-004','7860003000014','Leche entera 1L','Lácteos','LácteosSur','LT','Lácteos del Sur',0.95,1.35,64,30,220),
('LAC-005','7860003000021','Yogurt natural 1L','Lácteos','LácteosSur','LT','Lácteos del Sur',1.45,2.30,37,15,120),
('LAC-006','7860003000038','Mantequilla 250g','Lácteos','LácteosSur','UND','Lácteos del Sur',1.90,3.10,26,12,90),
('LAC-007','7860003000045','Queso fresco 500g','Lácteos','LácteosSur','UND','Lácteos del Sur',4.50,6.40,5,10,60),
('LAC-008','7860003000052','Crema de leche 250ml','Lácteos','LácteosSur','UND','Lácteos del Sur',1.10,1.90,41,12,90),
('LIM-001','7860004000013','Jabón de manos 400ml','Limpieza','LimpioMax','UND','LimpioMax',1.55,2.65,58,20,150),
('LIM-002','7860004000020','Detergente 3kg','Limpieza','LimpioMax','PQT','LimpioMax',6.70,9.80,31,8,80),
('LIM-003','7860004000037','Cloro 1L','Limpieza','LimpioMax','LT','LimpioMax',0.80,1.45,72,20,180),
('LIM-004','7860004000044','Papel higiénico x12','Limpieza','LimpioMax','PQT','LimpioMax',4.20,6.30,44,15,120),
('LIM-005','7860004000051','Lavavajilla 500g','Limpieza','LimpioMax','UND','LimpioMax',1.25,2.10,63,20,160),
('LIM-006','7860004000068','Desinfectante 1L','Limpieza','LimpioMax','LT','LimpioMax',1.95,3.20,29,12,100),
('SNK-021','7860005000012','Galletas surtidas','Snacks','SnackCo','PQT','SnackCo',1.20,2.15,90,20,240),
('SNK-022','7860005000029','Papas fritas 150g','Snacks','SnackCo','PQT','SnackCo',0.95,1.80,120,30,260),
('SNK-023','7860005000036','Chocolate barra 90g','Snacks','SnackCo','UND','SnackCo',0.70,1.40,140,30,300),
('SNK-024','7860005000043','Maní salado 200g','Snacks','SnackCo','PQT','SnackCo',0.85,1.60,76,20,200),
('SNK-025','7860005000050','Caramelos surtidos 300g','Snacks','SnackCo','PQT','SnackCo',1.10,2.00,53,15,160)
) AS v(code, barcode, name, cat, brand, unit, sup, cost, price, stock, minst, maxst);

INSERT INTO public.inventory_movements (product_id, movement_type, document, quantity_in, balance, unit_cost, user_name, notes, created_at)
SELECT id, 'apertura', 'INV-INICIAL', stock, stock, cost_price, 'Sistema', 'Carga inicial de inventario', now() - interval '35 days'
FROM public.products;

INSERT INTO public.customers (id_type, id_number, first_name, last_name, company, address, phone, email) VALUES
('consumidor_final','9999999999999','Consumidor','Final',NULL,NULL,NULL,NULL),
('cedula','0912345678','María','Cedeño',NULL,'Alborada 5ta etapa','+593 99 111 2233','maria.cedeno@mail.com'),
('cedula','0923456789','Luis','Paredes',NULL,'Sauces 8','+593 99 222 3344','luis.paredes@mail.com'),
('cedula','0934567890','Ana','Villacís',NULL,'Urdesa Central','+593 99 333 4455','ana.villacis@mail.com'),
('cedula','0945678901','Jorge','Ruiz',NULL,'Kennedy Norte','+593 99 444 5566','jorge.ruiz@mail.com'),
('cedula','0956789012','Verónica','Salas',NULL,'Ceibos','+593 99 555 6677','veronica.salas@mail.com'),
('ruc','0992777777001','Distribuidora','Andina','Distribuidora Andina S.A.','Km 12 vía Daule','+593 4 277 7777','compras@andina.ec'),
('ruc','0992888888001','Comercial','Pacífico','Comercial Pacífico Cía. Ltda.','Av. 9 de Octubre 1200','+593 4 288 8888','pagos@pacifico.ec'),
('ruc','0992999999001','Hotel','Riviera','Hotel Riviera S.A.','Malecón 2000','+593 4 299 9999','admin@riviera.ec'),
('pasaporte','X1234567','Michael','Brown',NULL,'Samborondón','+1 305 555 0199','m.brown@mail.com');

INSERT INTO public.system_settings (key, value, description) VALUES
('pos', '{"allow_negative_stock": false, "allow_discounts": true, "max_discount_percent": 15, "require_customer": false, "auto_print": false}', 'Parámetros del punto de venta'),
('invoicing', '{"provider": "none", "environment": "pruebas", "series": "001-001", "sri_enabled": false}', 'Configuración de facturación electrónica'),
('payment_methods', '{"efectivo": true, "tarjeta": true, "transferencia": true, "otro": false}', 'Métodos de pago habilitados');

INSERT INTO public.document_sequences (doc_type, series, current_number) VALUES ('venta','V001-001',0),('factura','001-001',0);

DO $do$
DECLARE
  i int; j int; n_items int;
  v_sale uuid; v_inv uuid; v_num text; v_when timestamptz;
  v_sub numeric; v_tax numeric; v_disc numeric; v_total numeric; v_cost numeric;
  p record; qty numeric; line_sub numeric; line_disc numeric;
  cashiers text[] := ARRAY['María Cedeño','Luis Paredes','Ana Villacís'];
  v_cashier text; v_customer uuid; v_method public.payment_method; v_session uuid; v_reg uuid;
  v_status public.sale_status;
BEGIN
  FOR i IN 1..8 LOOP
    v_reg := CASE WHEN i % 2 = 0 THEN '33333333-3333-3333-3333-333333333331' ELSE '33333333-3333-3333-3333-333333333332' END;
    INSERT INTO public.cash_sessions (id, cash_register_id, user_name, opened_at, opening_amount, closed_at, expected_amount, declared_amount, difference, status, notes)
    VALUES (gen_random_uuid(), v_reg, cashiers[1 + (i % 3)], now() - make_interval(days => 30 - i*3, hours => 8), 100,
      CASE WHEN i < 8 THEN now() - make_interval(days => 30 - i*3, hours => -10) END,
      NULL, NULL, NULL, CASE WHEN i < 8 THEN 'cerrada' ELSE 'abierta' END::public.cash_status, NULL)
    RETURNING id INTO v_session;

    INSERT INTO public.cash_movements (cash_session_id, type, amount, concept)
    VALUES (v_session, 'apertura', 100, 'Apertura de caja');

    FOR j IN 1..6 LOOP
      v_when := now() - make_interval(days => 30 - i*3, hours => (10 - j));
      v_cashier := cashiers[1 + ((i+j) % 3)];
      SELECT id INTO v_customer FROM public.customers ORDER BY (id_number || i::text || j::text) LIMIT 1;
      v_method := (ARRAY['efectivo','tarjeta','transferencia','efectivo']::public.payment_method[])[1 + ((i+j) % 4)];
      v_status := CASE WHEN (i*j) % 23 = 0 THEN 'anulada' ELSE 'completada' END::public.sale_status;
      v_num := 'V001-001-' || lpad(((i-1)*6 + j)::text, 9, '0');
      v_sub := 0; v_tax := 0; v_disc := 0; v_cost := 0;

      INSERT INTO public.sales (id, number, branch_id, cash_session_id, customer_id, user_name, subtotal, discount, tax, total, cost_total, status, created_at)
      VALUES (gen_random_uuid(), v_num, '22222222-2222-2222-2222-222222222222', v_session, v_customer, v_cashier, 0,0,0,0,0, v_status, v_when)
      RETURNING id INTO v_sale;

      n_items := 1 + ((i + j) % 4);
      FOR p IN SELECT * FROM public.products ORDER BY md5(code || i::text || j::text) LIMIT n_items LOOP
        qty := 1 + ((i + j + length(p.code)) % 5);
        line_sub := round(qty * p.sale_price, 2);
        line_disc := CASE WHEN (i+j) % 5 = 0 THEN round(line_sub * 0.05, 2) ELSE 0 END;
        INSERT INTO public.sale_items (sale_id, product_id, description, quantity, unit_price, unit_cost, discount, tax_rate, subtotal, total)
        VALUES (v_sale, p.id, p.name, qty, p.sale_price, p.cost_price, line_disc, 0.15, line_sub, round((line_sub - line_disc) * 1.15, 2));
        v_sub := v_sub + line_sub; v_disc := v_disc + line_disc; v_cost := v_cost + round(qty * p.cost_price, 2);

        IF v_status = 'completada' THEN
          UPDATE public.products SET stock = GREATEST(0, stock - qty) WHERE id = p.id;
          INSERT INTO public.inventory_movements (product_id, movement_type, document, quantity_out, balance, unit_cost, user_name, created_at)
          VALUES (p.id, 'venta', v_num, qty, (SELECT stock FROM public.products WHERE id = p.id), p.cost_price, v_cashier, v_when);
        END IF;
      END LOOP;

      v_tax := round((v_sub - v_disc) * 0.15, 2);
      v_total := round(v_sub - v_disc + v_tax, 2);
      UPDATE public.sales SET subtotal = v_sub, discount = v_disc, tax = v_tax, total = v_total, cost_total = v_cost WHERE id = v_sale;

      INSERT INTO public.payments (sale_id, method, amount, received, change_given, created_at)
      VALUES (v_sale, v_method, v_total, CASE WHEN v_method = 'efectivo' THEN ceil(v_total) ELSE NULL END,
              CASE WHEN v_method = 'efectivo' THEN ceil(v_total) - v_total ELSE NULL END, v_when);

      IF v_method = 'efectivo' AND v_status = 'completada' THEN
        INSERT INTO public.cash_movements (cash_session_id, type, amount, concept, reference, created_at)
        VALUES (v_session, 'venta', v_total, 'Venta en efectivo', v_num, v_when);
      END IF;

      INSERT INTO public.invoices (id, sale_id, number, series, customer_id, status, issue_date, subtotal, discount, tax, total)
      VALUES (gen_random_uuid(), v_sale, '001-001-' || lpad(((i-1)*6 + j)::text, 9, '0'), '001-001', v_customer,
              CASE WHEN v_status = 'anulada' THEN 'anulada' WHEN (i+j) % 7 = 0 THEN 'pendiente' ELSE 'autorizada' END::public.invoice_status,
              v_when, v_sub, v_disc, v_tax, v_total)
      RETURNING id INTO v_inv;

      INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit_price, discount, tax, total)
      SELECT v_inv, si.product_id, si.description, si.quantity, si.unit_price, si.discount, round(si.subtotal * 0.15, 2), si.total
      FROM public.sale_items si WHERE si.sale_id = v_sale;
    END LOOP;

    IF i < 8 THEN
      UPDATE public.cash_sessions cs SET
        expected_amount = 100 + COALESCE((SELECT sum(amount) FROM public.cash_movements cm WHERE cm.cash_session_id = cs.id AND cm.type = 'venta'), 0),
        declared_amount = 100 + COALESCE((SELECT sum(amount) FROM public.cash_movements cm WHERE cm.cash_session_id = cs.id AND cm.type = 'venta'), 0) - (i % 3),
        difference = -(i % 3)
      WHERE cs.id = v_session;
    END IF;
  END LOOP;

  UPDATE public.document_sequences SET current_number = 48 WHERE doc_type IN ('venta','factura');
END $do$;