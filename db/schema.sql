-- Esquema de Gelse Gestión. Idempotente: se puede aplicar tantas veces como haga falta.

-- Usuarios. Entran con usuario (no email: la gente de fábrica no siempre tiene) y contraseña.
-- Roles: «direccion» lo ve y lo cambia todo; «fabrica» solo apunta stock y marca muebles hechos.
create table if not exists users (
  id              serial primary key,
  username        text not null unique,
  name            text not null,
  password_hash   text not null,
  role            text not null default 'fabrica' check (role in ('direccion', 'fabrica')),
  active          boolean not null default true,
  failed_logins   int not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now()
);

-- Registro de cambios: quién creó, cambió o borró qué.
create table if not exists activity_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  user_id     int references users(id) on delete set null,
  user_name   text not null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  summary     text not null,
  href        text
);
create index if not exists activity_log_at on activity_log (at desc);

-- Clientes: particulares y profesionales (constructoras, interioristas, promotoras…).
create table if not exists clients (
  id           serial primary key,
  kind         text not null default 'particular' check (kind in ('particular', 'profesional')),
  name         text not null,          -- persona (particular) o empresa (profesional)
  contact      text,                   -- persona de contacto, si es empresa
  nif          text,
  phone        text,
  email        text,
  address      text,
  city         text,
  postal_code  text,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists clients_name on clients (lower(name));

-- Cocinas (proyectos). La fase es el estado; cada cambio queda en kitchen_phases.
create table if not exists kitchens (
  id              serial primary key,
  client_id       int not null references clients(id),
  ref             text,                -- la referencia que ya usan en los planos («PARTI - JOSE RACHE - CUINA»)
  title           text not null,
  address         text,                -- dirección de la obra, si no es la del cliente
  city            text,
  designer        text,                -- interiorista que la lleva
  phase           text not null default 'contacto',
  phase_at        timestamptz not null default now(),
  install_date    date,                -- fecha prevista de montaje
  amount          numeric(10,2),       -- importe total (con IVA)
  deposit         numeric(10,2),       -- paga y señal
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists kitchens_client on kitchens (client_id);
create index if not exists kitchens_phase on kitchens (phase);

create table if not exists kitchen_phases (
  id          bigserial primary key,
  kitchen_id  int not null references kitchens(id) on delete cascade,
  phase       text not null,
  at          timestamptz not null default now(),
  user_name   text not null
);
create index if not exists kitchen_phases_kitchen on kitchen_phases (kitchen_id, at);

-- Catálogo de muebles estándar (bajo 60, alto 80…). Medidas en cm: ancho × alto × fondo, sin patas.
create table if not exists cabinet_types (
  id       serial primary key,
  code     text not null unique,
  family   text not null,           -- bajo, fregadero, cajonero, esquina, lavavajillas, alto, abatible, columna
  name     text not null,
  width    numeric(6,1) not null,
  height   numeric(6,1) not null,
  depth    numeric(6,1) not null,
  notes    text,
  active   boolean not null default true
);

-- Frentes: se compran fuera, ya marcados. Se apunta a quién se piden y cuándo llegan.
alter table kitchens add column if not exists fronts_supplier text;
alter table kitchens add column if not exists fronts_ordered date;
alter table kitchens add column if not exists fronts_received date;

-- Hoja de fábrica. Cada cocina se divide en zonas (bloque desayuno, isla, escritorio…), cada una con su acabado.
create table if not exists kitchen_zones (
  id          serial primary key,
  kitchen_id  int not null references kitchens(id) on delete cascade,
  name        text not null,
  finish      text,                 -- acabado: «ONL - Lacado texturado», «AC - Nogal»…
  sort        int not null default 0
);
create index if not exists kitchen_zones_kitchen on kitchen_zones (kitchen_id, sort);

-- Lo que hay que fabricar de cada zona: muebles (del catálogo o a medida) y piezas sueltas (zócalo, gola, laterales…).
create table if not exists kitchen_items (
  id               serial primary key,
  kitchen_id       int not null references kitchens(id) on delete cascade,
  zone_id          int not null references kitchen_zones(id) on delete cascade,
  kind             text not null default 'mueble' check (kind in ('mueble', 'pieza')),
  cabinet_type_id  int references cabinet_types(id),
  name             text not null,
  width            numeric(6,1),
  height           numeric(6,1),
  depth            numeric(6,1),
  custom           boolean not null default false,   -- a medida (no coincide con el estándar)
  qty              int not null default 1,
  notes            text,
  status           text not null default 'pendiente' check (status in ('pendiente', 'en_curso', 'hecho')),
  assigned_to      text,                             -- operario al que Sergio se lo ha dado
  done_at          timestamptz,
  done_by          text,
  sort             int not null default 0,
  created_at       timestamptz not null default now()
);
create index if not exists kitchen_items_kitchen on kitchen_items (kitchen_id, zone_id, sort);

-- Stock: materiales del almacén. La cantidad se guarda al día (qty) y cada cambio queda en stock_moves.
create table if not exists stock_items (
  id          serial primary key,
  name        text not null,
  category    text not null default 'otros',
  unit        text not null default 'ud',
  qty         numeric(12,2) not null default 0,
  min_qty     numeric(12,2) not null default 0,
  location    text,                  -- estantería o zona del almacén (servirá para el 3D)
  supplier    text,
  ref         text,                  -- referencia del proveedor
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists stock_items_name on stock_items (lower(name));

create table if not exists stock_moves (
  id          bigserial primary key,
  item_id     int not null references stock_items(id) on delete cascade,
  at          timestamptz not null default now(),
  kind        text not null check (kind in ('entrada', 'salida', 'ajuste')),
  delta       numeric(12,2) not null,   -- + entra, − sale (en un ajuste, la diferencia con el recuento)
  kitchen_id  int references kitchens(id) on delete set null,
  user_name   text not null,
  notes       text
);
create index if not exists stock_moves_item on stock_moves (item_id, at desc);
create index if not exists stock_moves_kitchen on stock_moves (kitchen_id);

-- Archivos de cada cocina: planos, renders, fotos de la obra… Al quitarlos solo se marcan (deleted_at): no se pierde nada.
create table if not exists kitchen_files (
  id           serial primary key,
  kitchen_id   int not null references kitchens(id) on delete cascade,
  kind         text not null default 'plano' check (kind in ('plano', 'render', 'foto', 'otro')),
  name         text not null,
  key          text not null,          -- clave en el almacén (sha256 + extensión)
  mime         text not null,
  size         int not null,
  uploaded_by  text not null,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  deleted_by   text
);
create index if not exists kitchen_files_kitchen on kitchen_files (kitchen_id) where deleted_at is null;

-- Naves 3D: en qué zona de la fábrica está cada cocina ahora (corte, canteado, lacado, montaje…). Lo cambia Sergio.
alter table kitchens add column if not exists factory_zone text;

-- Montadores (autónomos, cada uno con su furgoneta).
create table if not exists installers (
  id          serial primary key,
  name        text not null,
  phone       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table kitchens add column if not exists installer_id int references installers(id);
alter table kitchens add column if not exists install_days int not null default 1;

-- Cobros de cada cocina: señal, pagos parciales y pago final. Lo cobrado es la suma; lo pendiente, importe − cobrado.
-- Al quitar un cobro solo se marca (deleted_at).
create table if not exists payments (
  id          serial primary key,
  kitchen_id  int not null references kitchens(id) on delete cascade,
  date        date not null default current_date,
  amount      numeric(10,2) not null,
  kind        text not null default 'parcial' check (kind in ('senal', 'parcial', 'final')),
  method      text,                    -- transferencia, tarjeta, efectivo…
  notes       text,
  user_name   text not null,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  deleted_by  text
);
create index if not exists payments_kitchen on payments (kitchen_id) where deleted_at is null;

-- La señal que antes se apuntaba en la ficha (kitchens.deposit) pasa a ser un cobro. Idempotente.
insert into payments (kitchen_id, date, amount, kind, user_name, notes)
  select id, created_at::date, deposit, 'senal', 'Sistema', 'Señal apuntada en la ficha'
  from kitchens k where deposit > 0 and not exists (select 1 from payments p where p.kitchen_id = k.id);
update kitchens set deposit = null where deposit is not null and exists (select 1 from payments p where p.kitchen_id = kitchens.id);

-- Seguridad en Supabase: sus API públicas (con la clave «publishable») podrían leer las tablas del esquema public.
-- Con RLS activado y sin ninguna política, esas API no ven nada. La web entra con el usuario de la base y no le afecta.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
