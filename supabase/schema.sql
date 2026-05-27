-- ============================================================
-- FSVOICE – CAR ONE · Schema SQL
-- Ejecutar completo en Supabase > SQL Editor
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA: perfiles de usuario (extiende auth.users)
-- ============================================================
create table public.perfiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nombre text not null,
  email text not null,
  rol text not null check (rol in ('operador', 'admin')),
  activo boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- TABLA: clientes Car One
-- ============================================================
create table public.clientes (
  id uuid default uuid_generate_v4() primary key,
  -- Datos personales
  nombre text not null,
  apellido text not null,
  dni text,
  email text,
  email_alternativo text,
  telefono text,
  telefono_alternativo text,
  direccion text,
  ciudad text,
  provincia text,
  -- Datos del vehículo
  concesionaria text,
  marca text,
  modelo text,
  version text,
  anio integer,
  patente text,
  fecha_compra date,
  -- Control
  operador_asignado uuid references public.perfiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLA: gestiones (una por llamado/intento)
-- ============================================================
create table public.gestiones (
  id uuid default uuid_generate_v4() primary key,
  cliente_id uuid references public.clientes(id) on delete cascade not null,
  operador_id uuid references public.perfiles(id) not null,
  -- Estado
  estado text not null default 'pendiente' check (
    estado in ('pendiente','encuestado','fin_gestion','no_acepta_encuesta','rellamar','no_es_titular')
  ),
  fecha_rellamar timestamptz,
  motivo_rellamar text,
  observaciones text,
  -- Validación de datos del cliente
  nombre_verificado boolean,
  nombre_corregido text,
  email_verificado boolean,
  email_corregido text,
  telefono_verificado boolean,
  telefono_corregido text,
  direccion_verificada boolean,
  direccion_corregida text,
  patente_verificada boolean,
  patente_corregida text,
  marca_verificada boolean,
  marca_corregida text,
  modelo_verificado boolean,
  modelo_corregido text,
  -- Encuesta: experiencia de compra
  score_vendedor integer check (score_vendedor between 1 and 5),
  vendedor_respondio_consultas text check (vendedor_respondio_consultas in ('si','parcialmente','no')),
  score_administrativo integer check (score_administrativo between 1 and 5),
  info_vehiculo_clara text check (info_vehiculo_clara in ('si','parcialmente','no')),
  explicaron_funciones text check (explicaron_funciones in ('si','no')),
  info_postventa text check (info_postventa in ('si','no')),
  -- Encuesta: post-compra
  volvio_contactar text check (volvio_contactar in ('si','no')),
  score_contacto_posterior integer check (score_contacto_posterior between 1 and 5),
  score_recomendacion integer check (score_recomendacion between 1 and 5),
  -- Control
  completado boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TABLA: historial de cambios
-- ============================================================
create table public.historial_cambios (
  id uuid default uuid_generate_v4() primary key,
  gestion_id uuid references public.gestiones(id) on delete cascade not null,
  operador_id uuid references public.perfiles(id) not null,
  campo_modificado text not null,
  valor_anterior text,
  valor_nuevo text,
  created_at timestamptz default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index idx_gestiones_cliente on public.gestiones(cliente_id);
create index idx_gestiones_operador on public.gestiones(operador_id);
create index idx_gestiones_estado on public.gestiones(estado);
create index idx_historial_gestion on public.historial_cambios(gestion_id);
create index idx_clientes_concesionaria on public.clientes(concesionaria);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.perfiles enable row level security;
alter table public.clientes enable row level security;
alter table public.gestiones enable row level security;
alter table public.historial_cambios enable row level security;

-- Perfiles: cada uno ve el suyo; admin ve todos
create policy "perfil_propio" on public.perfiles
  for select using (auth.uid() = id);

create policy "admin_ve_perfiles" on public.perfiles
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );

-- Clientes: operadores ven los asignados a ellos; admin ve todos
create policy "operador_ve_sus_clientes" on public.clientes
  for select using (
    operador_asignado = auth.uid() or
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );

create policy "admin_gestiona_clientes" on public.clientes
  for all using (
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );

-- Gestiones: operador ve las suyas; admin ve todas
create policy "operador_ve_sus_gestiones" on public.gestiones
  for select using (
    operador_id = auth.uid() or
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );

create policy "operador_crea_gestiones" on public.gestiones
  for insert with check (operador_id = auth.uid());

create policy "operador_edita_sus_gestiones" on public.gestiones
  for update using (
    operador_id = auth.uid() or
    exists (select 1 from public.perfiles p where p.id = auth.uid() and p.rol = 'admin')
  );

-- Historial: solo lectura para todos los autenticados; inserción automática
create policy "ver_historial" on public.historial_cambios
  for select using (auth.uid() is not null);

create policy "insertar_historial" on public.historial_cambios
  for insert with check (auth.uid() is not null);

-- ============================================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.handle_updated_at();

create trigger gestiones_updated_at before update on public.gestiones
  for each row execute function public.handle_updated_at();

-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrar usuario
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuario'),
    new.email,
    coalesce(new.raw_user_meta_data->>'rol', 'operador')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
