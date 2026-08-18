CREATE TYPE public.app_role AS ENUM ('administrador','supervisor','cajero','bodega');
CREATE TYPE public.id_type AS ENUM ('cedula','ruc','pasaporte','consumidor_final');
CREATE TYPE public.sale_status AS ENUM ('completada','anulada','devuelta');
CREATE TYPE public.invoice_status AS ENUM ('borrador','pendiente','emitida','autorizada','rechazada','anulada');
CREATE TYPE public.payment_method AS ENUM ('efectivo','tarjeta','transferencia','otro');
CREATE TYPE public.movement_type AS ENUM ('compra','venta','devolucion','ajuste','transferencia','merma','apertura');
CREATE TYPE public.cash_status AS ENUM ('abierta','cerrada');
CREATE TYPE public.cash_movement_type AS ENUM ('venta','ingreso','egreso','retiro','devolucion','apertura');

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, tax_id text NOT NULL, address text, phone text, email text, logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL, name text NOT NULL, address text, phone text, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
CREATE TABLE public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  code text NOT NULL, name text NOT NULL, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, code)
);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '', email text, phone text,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true, last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.permissions (
  code text PRIMARY KEY, module text NOT NULL, description text NOT NULL
);
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  permission_code text NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  UNIQUE (role, permission_code)
);
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, user_email text, action text NOT NULL, module text NOT NULL,
  entity text, entity_id text, old_value jsonb, new_value jsonb, ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs (created_at DESC);

CREATE TABLE public.categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, description text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.brands (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.units (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, name text NOT NULL, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.taxes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, rate numeric(6,4) NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_number text NOT NULL UNIQUE, name text NOT NULL, company text, address text, phone text, email text, contact text,
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_type public.id_type NOT NULL DEFAULT 'cedula', id_number text NOT NULL UNIQUE,
  first_name text NOT NULL, last_name text, company text, address text, phone text, email text,
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, barcode text UNIQUE, name text NOT NULL, description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  tax_id uuid REFERENCES public.taxes(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  cost_price numeric(12,4) NOT NULL DEFAULT 0, sale_price numeric(12,4) NOT NULL DEFAULT 0,
  stock numeric(14,3) NOT NULL DEFAULT 0, min_stock numeric(14,3) NOT NULL DEFAULT 0, max_stock numeric(14,3) NOT NULL DEFAULT 0,
  image_url text, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_name ON public.products (lower(name));

CREATE TABLE public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id),
  user_id uuid, user_name text,
  opened_at timestamptz NOT NULL DEFAULT now(), opening_amount numeric(12,2) NOT NULL DEFAULT 0,
  closed_at timestamptz, expected_amount numeric(12,2), declared_amount numeric(12,2), difference numeric(12,2),
  status public.cash_status NOT NULL DEFAULT 'abierta', notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  type public.cash_movement_type NOT NULL, amount numeric(12,2) NOT NULL, concept text NOT NULL,
  reference text, user_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  branch_id uuid REFERENCES public.branches(id),
  cash_session_id uuid REFERENCES public.cash_sessions(id),
  customer_id uuid REFERENCES public.customers(id),
  user_id uuid, user_name text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0, discount numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0, total numeric(12,2) NOT NULL DEFAULT 0,
  cost_total numeric(12,2) NOT NULL DEFAULT 0,
  status public.sale_status NOT NULL DEFAULT 'completada', notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_created ON public.sales (created_at DESC);
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id), description text NOT NULL,
  quantity numeric(14,3) NOT NULL, unit_price numeric(12,4) NOT NULL,
  unit_cost numeric(12,4) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0, tax_rate numeric(6,4) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL, total numeric(12,2) NOT NULL
);
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL, amount numeric(12,2) NOT NULL,
  received numeric(12,2), change_given numeric(12,2), reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type public.movement_type NOT NULL, document text,
  quantity_in numeric(14,3) NOT NULL DEFAULT 0, quantity_out numeric(14,3) NOT NULL DEFAULT 0,
  balance numeric(14,3) NOT NULL DEFAULT 0, unit_cost numeric(12,4) NOT NULL DEFAULT 0,
  user_id uuid, user_name text, notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_moves_product ON public.inventory_movements (product_id, created_at DESC);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  number text NOT NULL UNIQUE, series text NOT NULL DEFAULT '001-001',
  customer_id uuid REFERENCES public.customers(id),
  status public.invoice_status NOT NULL DEFAULT 'emitida',
  issue_date timestamptz NOT NULL DEFAULT now(),
  subtotal numeric(12,2) NOT NULL DEFAULT 0, discount numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0, total numeric(12,2) NOT NULL DEFAULT 0,
  sri_access_key text, sri_authorization text, sri_message text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id), description text NOT NULL,
  quantity numeric(14,3) NOT NULL, unit_price numeric(12,4) NOT NULL,
  discount numeric(12,2) NOT NULL DEFAULT 0, tax numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL
);
CREATE TABLE public.document_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL, series text NOT NULL DEFAULT '001-001', current_number bigint NOT NULL DEFAULT 0,
  UNIQUE (doc_type, series)
);
CREATE TABLE public.system_settings (
  key text PRIMARY KEY, value jsonb NOT NULL, description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $fn$;

DO $do$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','branches','cash_registers','profiles','categories','brands','units','taxes','suppliers','customers','products','cash_sessions','sales','invoices'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $do$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$fn$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND rp.permission_code = _perm
  );
$fn$;

CREATE OR REPLACE FUNCTION public.can(_perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT public.has_permission(auth.uid(), _perm);
$fn$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE first_user boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO first_user;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN first_user THEN 'administrador'::public.app_role ELSE 'cajero'::public.app_role END);
  RETURN NEW;
END $fn$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.next_document_number(_doc_type text, _series text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE n bigint;
BEGIN
  INSERT INTO public.document_sequences (doc_type, series, current_number)
  VALUES (_doc_type, _series, 1)
  ON CONFLICT (doc_type, series) DO UPDATE SET current_number = public.document_sequences.current_number + 1
  RETURNING current_number INTO n;
  RETURN _series || '-' || lpad(n::text, 9, '0');
END $fn$;

DO $do$ DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('companies','settings'),('branches','settings'),('cash_registers','settings'),
    ('categories','inventory'),('brands','inventory'),('units','inventory'),('taxes','settings'),
    ('suppliers','suppliers'),('customers','customers'),('products','inventory'),
    ('inventory_movements','inventory'),
    ('cash_sessions','cash'),('cash_movements','cash'),
    ('sales','sales'),('sale_items','sales'),('payments','sales'),
    ('invoices','invoice'),('invoice_items','invoice'),
    ('document_sequences','settings'),('system_settings','settings'),
    ('permissions','users'),('role_permissions','users'),('user_roles','users'),('profiles','users')
  ) AS x(tbl, md) LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tbl);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can(%L))', r.tbl||'_sel', r.tbl, r.md||'.view');
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can(%L))', r.tbl||'_ins', r.tbl, r.md||'.create');
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can(%L)) WITH CHECK (public.can(%L))', r.tbl||'_upd', r.tbl, r.md||'.update', r.md||'.update');
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can(%L))', r.tbl||'_del', r.tbl, r.md||'.delete');
  END LOOP;
END $do$;

CREATE POLICY profiles_self_sel ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_self_upd ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY user_roles_self_sel ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY permissions_all_sel ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY role_permissions_all_sel ON public.role_permissions FOR SELECT TO authenticated USING (true);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_sel ON public.audit_logs FOR SELECT TO authenticated USING (public.can('audit.view'));
CREATE POLICY audit_ins ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());