-- Configuração inicial: executar uma única vez em um projeto novo.
-- Cria tabelas, regras de acesso e agenda. Não cria a conta do proprietário.
begin;

create extension if not exists pgcrypto;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('owner')),
  created_at timestamptz not null default now()
);

create table public.shop_settings (
  id integer primary key check (id = 1),
  open_time time not null default '09:00',
  close_time time not null default '19:30',
  closed_days integer[] not null default array[]::integer[],
  whatsapp text not null default '5521982464611',
  address text not null default 'Av. Alcebiades Sabino dos Santos, 353 - Atlantica, Rio das Ostras - RJ, 28890-000',
  saturday_close time not null default '17:00',
  sunday_close time not null default '13:00',
  constraint shop_hours_valid check (open_time < close_time),
  constraint closed_days_valid check (closed_days <@ array[0, 1, 2, 3, 4, 5, 6])
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  duration_min integer not null check (duration_min between 15 and 240),
  price numeric(8, 2) not null check (price >= 0),
  "priceLabel" text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id),
  barber_id uuid not null references public.barbers (id),
  appointment_date date not null,
  start_time time not null,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_phone text not null check (char_length(customer_phone) between 10 and 30),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint appointment_start_half_hour check (
    mod(extract(minute from start_time)::integer, 30) = 0
    and extract(second from start_time) = 0
  )
);

create index appointments_date_barber_idx on public.appointments (appointment_date, barber_id, start_time);
create index appointments_status_idx on public.appointments (status);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

alter table public.profiles enable row level security;
alter table public.shop_settings enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Public can read shop settings"
  on public.shop_settings for select
  to anon, authenticated
  using (true);

create policy "Owner can update shop settings"
  on public.shop_settings for update
  to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

create policy "Public can read active barbers"
  on public.barbers for select
  to anon, authenticated
  using (active or (select public.is_owner()));

create policy "Owner can manage barbers"
  on public.barbers for all
  to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

create policy "Public can read active services"
  on public.services for select
  to anon, authenticated
  using (active or (select public.is_owner()));

create policy "Owner can manage services"
  on public.services for all
  to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

create policy "Owner can read appointments"
  on public.appointments for select
  to authenticated
  using ((select public.is_owner()));

create policy "Owner can update appointments"
  on public.appointments for update
  to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

insert into public.shop_settings (id) values (1);
insert into public.barbers (name) values ('André'), ('Marcos'), ('Natã');
insert into public.services (name, description, duration_min, price, "priceLabel") values
  ('Corte', 'Do clássico ao degradê, com o seu estilo.', 40, 40, 'A partir de R$ 40'),
  ('Barba', 'Acabamento e cuidado com a sua barba.', 40, 35, null),
  ('Cabelo/Barba', 'Cabelo e barba no mesmo atendimento.', 60, 70, null),
  ('Corte infantil até 5 anos', 'Cuidado e atenção para os pequenos.', 40, 50, null),
  ('Barboterapia', 'Um tempo a mais para cuidar de você.', 40, 80, null),
  ('Pente único', 'Praticidade, com acabamento no detalhe.', 20, 30, null),
  ('Hidratação', 'Cuidado para renovar os fios.', 20, 0, 'Consultar'),
  ('Higienização ouvido/nariz', 'Cuidado nos pequenos detalhes.', 20, 20, 'A partir de R$ 20'),
  ('Pézinho', 'O acabamento que faz a diferença.', 20, 0, 'Consultar'),
  ('Platinado/Luzes', 'Uma nova versão do seu visual.', 40, 150, 'A partir de R$ 150'),
  ('Selagem', 'Mais cuidado para os seus fios.', 30, 50, 'A partir de R$ 50'),
  ('Sobrancelha', 'Definição e acabamento.', 20, 0, 'Consultar');

create or replace function public.available_slots(
  p_barber_id uuid,
  p_service_id uuid,
  p_date date
)
returns table (slot time)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_open time;
  v_close time;
  v_closed_days integer[];
  v_duration integer;
  v_index integer := 0;
  v_candidate timestamp without time zone;
begin
  if p_barber_id is null or p_service_id is null or p_date is null then
    raise exception 'Dados do agendamento incompletos.';
  end if;

  select open_time,
      case extract(dow from p_date)::integer when 6 then least(close_time, saturday_close) when 0 then least(close_time, sunday_close) else close_time end,
      closed_days
    into v_open, v_close, v_closed_days
    from public.shop_settings
    where id = 1;

  select duration_min
    into v_duration
    from public.services
    where id = p_service_id and active;

  if v_duration is null then
    raise exception 'Serviço indisponível.';
  end if;

  if not exists (
    select 1 from public.barbers
    where id = p_barber_id and active
  ) then
    raise exception 'Profissional indisponível.';
  end if;

  if p_date < (now() at time zone 'America/Sao_Paulo')::date
    or extract(dow from p_date)::integer = any (v_closed_days) then
    return;
  end if;

  loop
    v_candidate := p_date + v_open + make_interval(mins => v_index * 30);
    exit when v_candidate + make_interval(mins => v_duration) > p_date + v_close;

    if v_candidate > (now() at time zone 'America/Sao_Paulo')
      and not exists (
        select 1
        from public.appointments a
        join public.services existing_service on existing_service.id = a.service_id
        where a.barber_id = p_barber_id
          and a.appointment_date = p_date
          and a.status in ('pending', 'confirmed')
          and v_candidate < p_date + a.start_time + make_interval(mins => existing_service.duration_min)
          and p_date + a.start_time < v_candidate + make_interval(mins => v_duration)
      ) then
      slot := v_candidate::time;
      return next;
    end if;

    v_index := v_index + 1;
  end loop;
end;
$$;

create or replace function public.create_booking(
  p_service_id uuid,
  p_barber_id uuid,
  p_appointment_date date,
  p_start_time time,
  p_customer_name text,
  p_customer_phone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duration integer;
  v_open time;
  v_close time;
  v_closed_days integer[];
  v_appointment_id uuid;
begin
  if p_service_id is null
    or p_barber_id is null
    or p_appointment_date is null
    or p_start_time is null
    or p_customer_name is null
    or p_customer_phone is null then
    raise exception 'Dados do agendamento incompletos.';
  end if;

  if char_length(trim(p_customer_name)) not between 2 and 120
    or char_length(trim(p_customer_phone)) not between 10 and 30 then
    raise exception 'Confira seu nome e telefone.';
  end if;

  select duration_min
    into v_duration
    from public.services
    where id = p_service_id and active;

  if v_duration is null or not exists (
    select 1 from public.barbers
    where id = p_barber_id and active
  ) then
    raise exception 'Serviço ou profissional indisponível.';
  end if;

  select open_time,
      case extract(dow from p_appointment_date)::integer when 6 then least(close_time, saturday_close) when 0 then least(close_time, sunday_close) else close_time end,
      closed_days
    into v_open, v_close, v_closed_days
    from public.shop_settings
    where id = 1;

  if p_appointment_date < (now() at time zone 'America/Sao_Paulo')::date
    or (p_appointment_date + p_start_time) <= (now() at time zone 'America/Sao_Paulo')
    or extract(dow from p_appointment_date)::integer = any (v_closed_days)
    or p_start_time < v_open
    or p_appointment_date + p_start_time + make_interval(mins => v_duration) > p_appointment_date + v_close
    or mod(extract(minute from p_start_time)::integer, 30) <> 0
    or extract(second from p_start_time) <> 0 then
    raise exception 'Horário indisponível.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_barber_id::text), hashtext(p_appointment_date::text));

  if exists (
    select 1
    from public.appointments a
    join public.services existing_service on existing_service.id = a.service_id
    where a.barber_id = p_barber_id
      and a.appointment_date = p_appointment_date
      and a.status in ('pending', 'confirmed')
      and p_appointment_date + p_start_time < a.appointment_date + a.start_time + make_interval(mins => existing_service.duration_min)
      and a.appointment_date + a.start_time < p_appointment_date + p_start_time + make_interval(mins => v_duration)
  ) then
    raise exception 'Horário indisponível.';
  end if;

  insert into public.appointments (
    service_id, barber_id, appointment_date, start_time, customer_name, customer_phone
  ) values (
    p_service_id, p_barber_id, p_appointment_date, p_start_time, trim(p_customer_name), trim(p_customer_phone)
  )
  returning id into v_appointment_id;

  return v_appointment_id;
end;
$$;

revoke all on function public.is_owner() from public;
revoke all on function public.available_slots(uuid, uuid, date) from public;
revoke all on function public.create_booking(uuid, uuid, date, time, text, text) from public;
grant execute on function public.is_owner() to anon, authenticated;
grant execute on function public.available_slots(uuid, uuid, date) to anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, date, time, text, text) to anon, authenticated;

grant select on public.shop_settings, public.barbers, public.services to anon, authenticated;
grant update on public.shop_settings to authenticated;
grant insert, update, delete on public.barbers, public.services to authenticated;
grant select, update on public.appointments to authenticated;
grant select on public.profiles to authenticated;

commit;
