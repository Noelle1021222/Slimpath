-- =============================================================================
--  銀髮伴 SilverCompanion — initial schema
--
--  Tables      profiles · provider_details · kinship_recipients · health_logs
--              orders · care_logs · messages · sos_alerts
--              (+ withdrawals · notifications · order_dismissals)
--  Security    RLS on every table, column-level grants for sensitive columns,
--              state changes only through SECURITY DEFINER RPCs.
--  Realtime    postgres_changes on orders / messages / notifications / care_logs,
--              private Broadcast channels `tracking:order_{id}` for live GPS.
--
--  Conventions
--  * Every SECURITY DEFINER function pins `search_path = ''` and schema-qualifies
--    every object it touches.
--  * Internal helpers live in schema `private`, which PostgREST does not expose.
--  * All money is integer NTD. Times are local Asia/Taipei wall-clock times.
-- =============================================================================

create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 0. Small helpers
-- -----------------------------------------------------------------------------

create or replace function private.taipei_now()
returns timestamp
language sql stable
set search_path = ''
as $$ select (pg_catalog.now() at time zone 'Asia/Taipei') $$;

create or replace function private.taipei_month()
returns text
language sql stable
set search_path = ''
as $$ select pg_catalog.to_char(private.taipei_now(), 'YYYY-MM') $$;

-- Platform commission. Change here and every new order picks it up.
create or replace function private.platform_fee_rate()
returns numeric
language sql immutable
set search_path = ''
as $$ select 0.15::numeric $$;

-- Public-facing name: the nickname if set, otherwise the surname followed by ○.
create or replace function private.display_name(p_nickname text, p_full_name text)
returns text
language sql immutable
set search_path = ''
as $$
  select coalesce(
    nullif(pg_catalog.btrim(p_nickname), ''),
    pg_catalog.left(p_full_name, 1) || pg_catalog.repeat('○', greatest(pg_catalog.char_length(p_full_name) - 1, 1))
  )
$$;

-- "台北市大安區復興南路一段 1 號" → "台北市大安區"
create or replace function private.address_area(p_address text)
returns text
language sql immutable
set search_path = ''
as $$
  select coalesce(
    pg_catalog.substring(p_address, '^(.{2,3}[市縣].{1,4}?[區鄉鎮市])'),
    pg_catalog.left(p_address, 6)
  )
$$;

create or replace function private.try_uuid(p_text text)
returns uuid
language plpgsql immutable
set search_path = ''
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;

-- availability_slots: {"2026-10-15": ["09:00", "10:00"], ...}
create or replace function private.is_valid_availability(p_slots jsonb)
returns boolean
language sql immutable
set search_path = ''
as $$
  select pg_catalog.jsonb_typeof(p_slots) = 'object'
     and not exists (
       select 1
       from pg_catalog.jsonb_each(p_slots) as e(day, hours)
       where e.day !~ '^\d{4}-\d{2}-\d{2}$'
          or pg_catalog.jsonb_typeof(e.hours) <> 'array'
          or exists (
            select 1 from pg_catalog.jsonb_array_elements(e.hours) as h(v)
            where pg_catalog.jsonb_typeof(h.v) <> 'string'
               or (h.v #>> '{}') !~ '^([01]\d|2[0-3]):00$'
          )
     )
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

-- True when the current request comes from a signed-in end user (not the
-- service role, a migration or the seed script).
create or replace function private.is_end_user()
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce(
    nullif(pg_catalog.current_setting('request.jwt.claim.role', true), ''),
    nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  ) = 'authenticated'
$$;

-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

-- 3.1 profiles ---------------------------------------------------------------
create table public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  role                     text not null check (role in ('seeker', 'provider')),
  full_name                text not null check (pg_catalog.char_length(pg_catalog.btrim(full_name)) between 2 and 50),
  nickname                 text check (nickname is null or pg_catalog.char_length(nickname) <= 20),
  phone                    text not null check (phone ~ '^\+?[0-9][0-9 -]{7,19}$'),
  avatar_url               text,
  emergency_contact_name   text check (emergency_contact_name is null or pg_catalog.char_length(emergency_contact_name) <= 50),
  emergency_contact_phone  text check (emergency_contact_phone is null or emergency_contact_phone ~ '^\+?[0-9][0-9 -]{7,19}$'),
  created_at               timestamptz not null default pg_catalog.now(),
  updated_at               timestamptz not null default pg_catalog.now()
);
comment on table public.profiles is '使用者基本資料（實名制）。role 為目前使用中的身分，可在 seeker / provider 間切換。';
comment on column public.profiles.full_name is '真實姓名，提領時核對戶名；陪伴者通過審核後鎖定。';

-- 3.2 provider_details -------------------------------------------------------
create table public.provider_details (
  provider_id               uuid primary key references public.profiles (id) on delete cascade,
  bio                       text check (bio is null or pg_catalog.char_length(bio) <= 1000),
  hourly_rate               integer not null default 350
                            check (hourly_rate between 200 and 1000 and hourly_rate % 50 = 0),
  service_types             text[] not null default array['chat']::text[]
                            check (pg_catalog.cardinality(service_types) >= 1
                                   and service_types <@ array['chat','medical','walk','tech','read','clean','custom']::text[]),
  tags                      text[] not null default '{}'::text[] check (pg_catalog.cardinality(tags) <= 12),
  -- spec: service_Switch_is_online (Postgres folds unquoted identifiers to lower case)
  service_switch_is_online  boolean not null default false,
  youtube_video_id          text check (youtube_video_id is null or youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  is_verified               boolean not null default false,
  rating_avg                numeric(3,2) not null default 5.00 check (rating_avg between 0 and 5),
  review_count              integer not null default 0 check (review_count >= 0),
  bank_code                 text check (bank_code is null or bank_code ~ '^[0-9]{3}$'),
  bank_account              text check (bank_account is null or bank_account ~ '^[0-9]{6,16}$'),
  available_balance         integer not null default 0,
  last_withdraw_month       text check (last_withdraw_month is null or last_withdraw_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  availability_slots        jsonb not null default '{}'::jsonb check (private.is_valid_availability(availability_slots)),
  -- extensions to the spec: where the provider works, and a public track record
  city                      text,
  districts                 text[] not null default '{}'::text[],
  offers_online             boolean not null default false,
  completed_orders          integer not null default 0 check (completed_orders >= 0),
  updated_at                timestamptz not null default pg_catalog.now()
);
comment on table public.provider_details is '陪伴者擴充資料。銀行帳號、餘額僅本人可讀；公開資訊請查 provider_public。';

-- 3.3 kinship_recipients -----------------------------------------------------
create table public.kinship_recipients (
  id                bigint generated always as identity primary key,
  seeker_id         uuid not null references public.profiles (id) on delete cascade,
  name              text not null check (pg_catalog.char_length(pg_catalog.btrim(name)) between 1 and 50),
  nickname          text check (nickname is null or pg_catalog.char_length(nickname) <= 20),
  age               integer not null check (age between 1 and 130),
  mobility          text not null check (mobility in ('可自理', '需攙扶', '需輪椅', '臥床')),
  chronic_diseases  text[] not null default '{}'::text[],
  notes             text check (notes is null or pg_catalog.char_length(notes) <= 1000),
  address           text not null check (pg_catalog.char_length(pg_catalog.btrim(address)) >= 4),
  lat               double precision check (lat between -90 and 90),
  lng               double precision check (lng between -180 and 180),
  created_at        timestamptz not null default pg_catalog.now(),
  updated_at        timestamptz not null default pg_catalog.now(),
  unique (id, seeker_id)
);

-- 3.4 health_logs ------------------------------------------------------------
create table public.health_logs (
  id            uuid primary key default gen_random_uuid(),
  seeker_id     uuid not null references public.profiles (id) on delete cascade,
  -- extension: which elder the reading belongs to (a family may care for several)
  recipient_id  bigint,
  bp_high       integer check (bp_high between 50 and 260),
  bp_low        integer check (bp_low between 30 and 180),
  heart_rate    integer check (heart_rate between 25 and 250),
  temperature   numeric(4,1) check (temperature between 30 and 45),
  steps         integer check (steps between 0 and 100000),
  weight        numeric(5,2) check (weight between 10 and 300),
  source        text not null default 'manual' check (source in ('manual', 'device')),
  recorded_at   timestamptz not null default pg_catalog.now(),
  created_at    timestamptz not null default pg_catalog.now(),
  constraint health_logs_has_value check (pg_catalog.num_nonnulls(bp_high, bp_low, heart_rate, temperature, steps, weight) > 0),
  constraint health_logs_bp_pair check ((bp_high is null) = (bp_low is null) and (bp_high is null or bp_high > bp_low)),
  constraint health_logs_recipient_fk foreign key (recipient_id, seeker_id)
    references public.kinship_recipients (id, seeker_id) on delete cascade
);

-- 3.5 orders -----------------------------------------------------------------
create table public.orders (
  id                      uuid primary key default gen_random_uuid(),
  seeker_id               uuid not null references public.profiles (id) on delete restrict,
  -- null while the request is open to every nearby companion (公開媒合)
  provider_id             uuid references public.profiles (id) on delete restrict,
  recipient_id            bigint not null,
  service_type            text not null check (service_type in ('chat','medical','walk','tech','read','clean','custom')),
  service_date            date not null,
  start_time              time not null check (pg_catalog.date_part('minute', start_time) = 0 and pg_catalog.date_part('second', start_time) = 0),
  end_time                time not null check (pg_catalog.date_part('minute', end_time) = 0 and pg_catalog.date_part('second', end_time) = 0),
  hours                   integer generated always as (
                            (pg_catalog.date_part('hour', end_time) - pg_catalog.date_part('hour', start_time))::integer
                          ) stored,
  location_address        text not null,
  location_lat            double precision check (location_lat between -90 and 90),
  location_lng            double precision check (location_lng between -180 and 180),
  is_online               boolean not null default false,
  notes                   text check (notes is null or pg_catalog.char_length(notes) <= 1000),
  hourly_rate             integer not null check (hourly_rate between 200 and 1000),
  total_amount            integer not null check (total_amount > 0),
  platform_fee            integer not null check (platform_fee >= 0),
  provider_earning        integer not null check (provider_earning >= 0),
  payment_method          text not null check (payment_method in ('linepay', 'credit_card', 'cash')),
  payment_status          text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  linepay_transaction_id  text unique,
  order_status            text not null default 'pending'
                          check (order_status in ('pending','accepted','navigating','in_progress','completed','cancelled')),
  cancel_reason           text,
  cancelled_by            uuid references public.profiles (id) on delete set null,
  paid_at                 timestamptz,
  accepted_at             timestamptz,
  navigation_started_at   timestamptz,
  arrived_at              timestamptz,
  completed_at            timestamptz,
  cancelled_at            timestamptz,
  created_at              timestamptz not null default pg_catalog.now(),
  updated_at              timestamptz not null default pg_catalog.now(),
  constraint orders_time_order check (end_time > start_time),
  constraint orders_amount_split check (platform_fee + provider_earning = total_amount),
  constraint orders_not_self check (provider_id is null or provider_id <> seeker_id),
  constraint orders_recipient_fk foreign key (recipient_id, seeker_id)
    references public.kinship_recipients (id, seeker_id) on delete restrict,
  -- A companion can never be booked twice for overlapping hours.
  constraint orders_no_overlap exclude using gist (
    provider_id with =,
    tsrange(service_date + start_time, service_date + end_time, '[)') with &&
  ) where (provider_id is not null and order_status <> 'cancelled')
);
comment on column public.orders.hours is '服務時數（end_time - start_time，以小時為單位）。';
comment on column public.orders.hourly_rate is '下單當下的時薪快照，金額由資料庫計算，前端無法竄改。';

-- 3.6 care_logs --------------------------------------------------------------
create table public.care_logs (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null unique references public.orders (id) on delete cascade,
  mood            text not null check (mood in ('happy', 'neutral', 'sad')),
  message         text not null check (pg_catalog.char_length(pg_catalog.btrim(message)) between 1 and 2000),
  -- object paths inside the private `care-photos` bucket ("{order_id}/{file}")
  photos          text[] not null default '{}'::text[] check (pg_catalog.cardinality(photos) <= 9),
  seeker_rating   integer check (seeker_rating between 1 and 5),
  seeker_tags     text[] not null default '{}'::text[] check (pg_catalog.cardinality(seeker_tags) <= 8),
  seeker_comment  text check (seeker_comment is null or pg_catalog.char_length(seeker_comment) <= 500),
  rated_at        timestamptz,
  created_at      timestamptz not null default pg_catalog.now()
);

-- 3.7 messages ---------------------------------------------------------------
create table public.messages (
  id           bigint generated always as identity primary key,
  sender_id    uuid not null references public.profiles (id) on delete cascade,
  receiver_id  uuid not null references public.profiles (id) on delete cascade,
  content      text not null check (pg_catalog.char_length(pg_catalog.btrim(content)) between 1 and 2000),
  is_read      boolean not null default false,
  created_at   timestamptz not null default pg_catalog.now(),
  constraint messages_not_self check (sender_id <> receiver_id)
);

-- 3.8 sos_alerts -------------------------------------------------------------
create table public.sos_alerts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  lat              double precision not null check (lat between -90 and 90),
  lng              double precision not null check (lng between -180 and 180),
  accuracy_m       double precision,
  -- 'gps' (fresh fix) · 'last_known' (cached fix) · 'home' (elder's address)
  location_source  text not null default 'gps' check (location_source in ('gps', 'last_known', 'home')),
  order_id         uuid references public.orders (id) on delete set null,
  status           text not null default 'triggered' check (status in ('triggered', 'resolved')),
  notified_at      timestamptz,
  notify_channel   text,
  notify_error     text,
  resolved_at      timestamptz,
  created_at       timestamptz not null default pg_catalog.now()
);

-- Withdrawal requests (spec 4.3.1: 「寫入提領申請紀錄表」) ---------------------
create table public.withdrawals (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references public.profiles (id) on delete cascade,
  amount        integer not null check (amount > 0),
  month         text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  bank_code     text not null,
  bank_account  text not null,
  account_name  text not null,
  status        text not null default 'requested' check (status in ('requested', 'processing', 'paid', 'rejected')),
  created_at    timestamptz not null default pg_catalog.now(),
  processed_at  timestamptz,
  -- 每月僅能提領一次 — enforced here as well as in request_withdrawal()
  constraint withdrawals_once_per_month unique (provider_id, month)
);

-- In-app notification centre --------------------------------------------------
create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null check (type in (
                'order_new','order_paid','order_accepted','order_declined','order_cancelled',
                'order_navigating','order_arrived','order_completed','order_refunded',
                'rating','withdrawal','sos','system')),
  title       text not null,
  body        text,
  order_id    uuid references public.orders (id) on delete cascade,
  is_read     boolean not null default false,
  created_at  timestamptz not null default pg_catalog.now()
);

-- Open requests a companion chose to hide from their request hall -------------
create table public.order_dismissals (
  order_id     uuid not null references public.orders (id) on delete cascade,
  provider_id  uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default pg_catalog.now(),
  primary key (order_id, provider_id)
);

-- -----------------------------------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------------------------------
create index provider_details_search_idx on public.provider_details (is_verified, service_switch_is_online, hourly_rate);
create index provider_details_service_types_idx on public.provider_details using gin (service_types);
create index provider_details_districts_idx on public.provider_details using gin (districts);
create index kinship_recipients_seeker_idx on public.kinship_recipients (seeker_id);
create index health_logs_seeker_recorded_idx on public.health_logs (seeker_id, recorded_at desc);
create index orders_seeker_idx on public.orders (seeker_id, service_date desc);
create index orders_provider_idx on public.orders (provider_id, service_date desc);
create index orders_open_idx on public.orders (service_date) where provider_id is null and order_status = 'pending';
create index orders_recipient_idx on public.orders (recipient_id);
create index care_logs_created_idx on public.care_logs (created_at desc);
create index messages_pair_idx on public.messages (sender_id, receiver_id, created_at desc);
create index messages_unread_idx on public.messages (receiver_id) where not is_read;
create index sos_alerts_user_idx on public.sos_alerts (user_id, created_at desc);
create index withdrawals_provider_idx on public.withdrawals (provider_id, created_at desc);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. updated_at triggers
-- -----------------------------------------------------------------------------
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger provider_details_updated_at before update on public.provider_details
  for each row execute function private.set_updated_at();
create trigger kinship_recipients_updated_at before update on public.kinship_recipients
  for each row execute function private.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. RLS helper predicates (SECURITY DEFINER so they can look across tables
--    without recursing into the callers' own policies)
-- -----------------------------------------------------------------------------

create or replace function private.is_order_participant(p_order_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (select auth.uid()) in (o.seeker_id, o.provider_id)
  )
$$;

create or replace function private.is_order_provider(p_order_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.provider_id = (select auth.uid())
  )
$$;

-- Companion assigned to an unfinished order for this elder (spec 7.2:
-- 「有成立訂單關係的陪伴者在服務期間內讀取」).
create or replace function private.provider_serves_recipient(p_recipient_id bigint)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.recipient_id = p_recipient_id
      and o.provider_id = (select auth.uid())
      and o.order_status in ('pending', 'accepted', 'navigating', 'in_progress')
  )
$$;

-- Health data is shared only once the companion has accepted the job.
create or replace function private.provider_serves_seeker(p_seeker_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.seeker_id = p_seeker_id
      and o.provider_id = (select auth.uid())
      and o.order_status in ('accepted', 'navigating', 'in_progress')
  )
$$;

create or replace function private.has_order_relationship(p_other uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where (o.seeker_id = (select auth.uid()) and o.provider_id = p_other)
       or (o.provider_id = (select auth.uid()) and o.seeker_id = p_other)
  )
$$;

grant execute on function
  private.is_order_participant(uuid),
  private.is_order_provider(uuid),
  private.provider_serves_recipient(bigint),
  private.provider_serves_seeker(uuid),
  private.has_order_relationship(uuid),
  private.try_uuid(text),
  private.display_name(text, text),
  private.address_area(text),
  private.is_valid_availability(jsonb),
  private.taipei_now(),
  private.taipei_month(),
  private.platform_fee_rate(),
  private.is_end_user()
to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. Business-rule triggers
-- -----------------------------------------------------------------------------

-- Every provider profile gets a provider_details row (also when an existing
-- seeker switches on their companion identity).
create or replace function private.ensure_provider_details()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.role = 'provider' then
    insert into public.provider_details (provider_id) values (new.id)
    on conflict (provider_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger profiles_ensure_provider_details
  after insert or update of role on public.profiles
  for each row execute function private.ensure_provider_details();

-- 實名制: once a companion is verified their legal name is locked, because
-- withdrawals are only paid to a bank account under that exact name.
create or replace function private.lock_verified_full_name()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.full_name is distinct from old.full_name
     and private.is_end_user()
     and exists (select 1 from public.provider_details d where d.provider_id = old.id and d.is_verified) then
    raise exception '已完成實名認證，真實姓名無法自行修改，請聯絡客服。'
      using errcode = 'P0001', hint = 'full_name_locked';
  end if;
  return new;
end;
$$;

create trigger profiles_lock_verified_full_name
  before update of full_name on public.profiles
  for each row execute function private.lock_verified_full_name();

-- Only verified companions can switch on 上線接案.
create or replace function private.guard_provider_details()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.service_switch_is_online and not new.is_verified and private.is_end_user() then
    raise exception '完成實名與背景審核後才能上線接案。'
      using errcode = 'P0001', hint = 'provider_not_verified';
  end if;
  return new;
end;
$$;

create trigger provider_details_guard
  before insert or update on public.provider_details
  for each row execute function private.guard_provider_details();

-- Orders: prices are always computed here from the companion's current rate,
-- so a tampered client cannot change what is charged.
create or replace function private.prepare_order()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_provider public.provider_details;
  v_hours    integer := (pg_catalog.date_part('hour', new.end_time) - pg_catalog.date_part('hour', new.start_time))::integer;
  v_slots    jsonb;
  v_hour     integer;
begin
  if v_hours < 1 or v_hours > 12 then
    raise exception '單次服務時數需介於 1 到 12 小時。' using errcode = 'P0001', hint = 'invalid_hours';
  end if;

  if new.provider_id is not null then
    select * into v_provider from public.provider_details d where d.provider_id = new.provider_id;
    if not found then
      raise exception '找不到這位陪伴者。' using errcode = 'P0001', hint = 'provider_not_found';
    end if;
    new.hourly_rate := v_provider.hourly_rate;
  elsif new.hourly_rate is null or new.hourly_rate not between 200 and 1000 or new.hourly_rate % 50 <> 0 then
    raise exception '公開需求的時薪預算需介於 $200 到 $1000，且以 $50 為單位。' using errcode = 'P0001', hint = 'invalid_budget';
  end if;

  if private.is_end_user() then
    if new.payment_method = 'credit_card' then
      raise exception '信用卡付款即將開放，請先選擇 LINE Pay 或現金。' using errcode = 'P0001', hint = 'payment_method_unavailable';
    end if;

    if (new.service_date + new.start_time) <= private.taipei_now() then
      raise exception '服務開始時間必須晚於現在。' using errcode = 'P0001', hint = 'start_in_past';
    end if;

    if new.provider_id is not null then
      if not v_provider.is_verified or not v_provider.service_switch_is_online then
        raise exception '這位陪伴者目前沒有開放預約。' using errcode = 'P0001', hint = 'provider_offline';
      end if;
      if not (new.service_type = any (v_provider.service_types)) then
        raise exception '這位陪伴者沒有提供此項服務。' using errcode = 'P0001', hint = 'service_not_offered';
      end if;
      v_slots := v_provider.availability_slots -> pg_catalog.to_char(new.service_date, 'YYYY-MM-DD');
      for v_hour in pg_catalog.date_part('hour', new.start_time)::integer .. pg_catalog.date_part('hour', new.end_time)::integer - 1 loop
        if v_slots is null or not (v_slots ? (pg_catalog.lpad(v_hour::text, 2, '0') || ':00')) then
          raise exception '所選時段不在陪伴者的可預約時間內。' using errcode = 'P0001', hint = 'slot_unavailable';
        end if;
      end loop;
    end if;
  end if;

  new.total_amount     := new.hourly_rate * v_hours;
  new.platform_fee     := pg_catalog.round(new.total_amount * private.platform_fee_rate())::integer;
  new.provider_earning := new.total_amount - new.platform_fee;

  if private.is_end_user() then
    new.payment_status := 'unpaid';
    new.order_status := 'pending';
    new.linepay_transaction_id := null;
    new.cancel_reason := null;
    new.cancelled_by := null;
    new.paid_at := null;
    new.accepted_at := null;
    new.navigation_started_at := null;
    new.arrived_at := null;
    new.completed_at := null;
    new.cancelled_at := null;
  end if;
  return new;
end;
$$;

create trigger orders_prepare
  before insert on public.orders
  for each row execute function private.prepare_order();

-- Notify the other side whenever an order moves.
create or replace function private.notify_order_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_seeker   text;
  v_provider text;
  v_when     text := pg_catalog.to_char(new.service_date, 'MM/DD') || ' ' || pg_catalog.to_char(new.start_time, 'HH24:MI');
  v_service  text := case new.service_type
                       when 'chat' then '傾聽陪伴' when 'medical' then '陪同就醫' when 'walk' then '外出散步'
                       when 'tech' then '手機教學' when 'read' then '讀報唸書' when 'clean' then '居家整理'
                       else '客製服務' end;
begin
  select private.display_name(p.nickname, p.full_name) into v_seeker from public.profiles p where p.id = new.seeker_id;
  select private.display_name(p.nickname, p.full_name) into v_provider from public.profiles p where p.id = new.provider_id;

  if tg_op = 'INSERT' then
    if new.provider_id is not null and new.payment_method = 'cash' then
      insert into public.notifications (user_id, type, title, body, order_id)
      values (new.provider_id, 'order_new', '新的預約請求', v_seeker || ' 預約了 ' || v_when || ' 的' || v_service || '（現金付款）', new.id);
    end if;
    return new;
  end if;

  if new.payment_status is distinct from old.payment_status then
    if new.payment_status = 'paid' and new.payment_method <> 'cash' and new.provider_id is not null and new.order_status = 'pending' then
      insert into public.notifications (user_id, type, title, body, order_id)
      values (new.provider_id, 'order_paid', '新的預約請求（已付款）', v_seeker || ' 預約了 ' || v_when || ' 的' || v_service || '，已完成 LINE Pay 付款。', new.id);
    elsif new.payment_status = 'refunded' then
      insert into public.notifications (user_id, type, title, body, order_id)
      values (new.seeker_id, 'order_refunded', '退款完成', v_when || ' 的' || v_service || '款項 $' || new.total_amount || ' 已退回原付款方式。', new.id);
    end if;
  end if;

  if new.order_status is distinct from old.order_status then
    case new.order_status
      when 'accepted' then
        insert into public.notifications (user_id, type, title, body, order_id)
        values (new.seeker_id, 'order_accepted', v_provider || ' 已接受預約', v_when || ' 的' || v_service || '已確認，可以在「我的訂單」查看細節。', new.id);
      when 'navigating' then
        insert into public.notifications (user_id, type, title, body, order_id)
        values (new.seeker_id, 'order_navigating', v_provider || ' 正在前往', '點擊首頁的即時位置，就能看到陪伴者離家還有多遠。', new.id);
      when 'in_progress' then
        insert into public.notifications (user_id, type, title, body, order_id)
        values (new.seeker_id, 'order_arrived', v_provider || ' 已抵達', v_service || '開始囉，服務結束後會收到數位聯絡簿。', new.id);
      when 'completed' then
        insert into public.notifications (user_id, type, title, body, order_id)
        values (new.seeker_id, 'order_completed', '服務完成，聯絡簿已更新', v_provider || ' 寫下了今天的陪伴紀錄，也歡迎給予評價。', new.id);
      when 'cancelled' then
        if new.cancelled_by is not null and new.cancelled_by = new.provider_id then
          insert into public.notifications (user_id, type, title, body, order_id)
          values (new.seeker_id, case when old.order_status = 'pending' then 'order_declined' else 'order_cancelled' end,
                  case when old.order_status = 'pending' then v_provider || ' 無法接受這次預約' else v_provider || ' 取消了行程' end,
                  coalesce(new.cancel_reason, v_when || ' 的' || v_service || '已取消。'), new.id);
        elsif new.provider_id is not null and (new.cancelled_by is null or new.cancelled_by = new.seeker_id)
              and (new.payment_method = 'cash' or old.payment_status = 'paid') then
          insert into public.notifications (user_id, type, title, body, order_id)
          values (new.provider_id, 'order_cancelled', '行程已取消', v_seeker || ' 取消了 ' || v_when || ' 的' || v_service || '。', new.id);
        end if;
      else null;
    end case;
  end if;
  return new;
end;
$$;

create trigger orders_notify
  after insert or update on public.orders
  for each row execute function private.notify_order_change();

-- care_logs: the family may rate exactly once, and only finished services.
create or replace function private.guard_care_log_rating()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.seeker_rating is distinct from old.seeker_rating
     or new.seeker_tags is distinct from old.seeker_tags
     or new.seeker_comment is distinct from old.seeker_comment then
    if old.seeker_rating is not null and private.is_end_user() then
      raise exception '這筆服務已經評價過了。' using errcode = 'P0001', hint = 'already_rated';
    end if;
    if new.seeker_rating is null then
      raise exception '請先選擇星等。' using errcode = 'P0001', hint = 'rating_required';
    end if;
    new.rated_at := pg_catalog.now();
  end if;
  return new;
end;
$$;

create trigger care_logs_guard_rating
  before update on public.care_logs
  for each row execute function private.guard_care_log_rating();

-- Spec 4.2.4: a new rating updates the companion's average. Incremental, so a
-- track record imported from the prototype (rating_avg / review_count) is kept.
create or replace function private.refresh_provider_rating()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_provider uuid;
begin
  if new.seeker_rating is null or old.seeker_rating is not null then
    return new;
  end if;
  select o.provider_id into v_provider from public.orders o where o.id = new.order_id;
  if v_provider is null then
    return new;
  end if;

  update public.provider_details d
     set rating_avg   = pg_catalog.round(((d.rating_avg * d.review_count) + new.seeker_rating)::numeric / (d.review_count + 1), 2),
         review_count = d.review_count + 1
   where d.provider_id = v_provider;

  insert into public.notifications (user_id, type, title, body, order_id)
  values (v_provider, 'rating', '收到 ' || new.seeker_rating || ' 顆星的評價',
          coalesce(nullif(new.seeker_comment, ''), '家屬留下了評價，謝謝您用心的陪伴。'), new.order_id);
  return new;
end;
$$;

create trigger care_logs_refresh_rating
  after update of seeker_rating on public.care_logs
  for each row execute function private.refresh_provider_rating();

revoke all on function
  private.ensure_provider_details(),
  private.lock_verified_full_name(),
  private.guard_provider_details(),
  private.prepare_order(),
  private.notify_order_change(),
  private.guard_care_log_rating(),
  private.refresh_provider_rating(),
  private.set_updated_at()
from public;

-- -----------------------------------------------------------------------------
-- 6. RPCs (the only way to move an order through its life-cycle)
-- -----------------------------------------------------------------------------

-- Companion accepts an assigned request, or claims an open one.
create or replace function public.accept_order(p_order_id uuid)
returns public.orders
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders;
  v_me    public.provider_details;
begin
  if v_uid is null then
    raise exception '請先登入。' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception '找不到這筆訂單。' using errcode = 'P0002';
  end if;
  if v_order.order_status <> 'pending' then
    raise exception '這筆訂單已經無法接單了。' using errcode = 'P0001', hint = 'invalid_status';
  end if;
  if v_order.payment_method = 'linepay' and v_order.payment_status <> 'paid' then
    raise exception '案主尚未完成付款。' using errcode = 'P0001', hint = 'unpaid';
  end if;

  select * into v_me from public.provider_details where provider_id = v_uid;
  if not found or not v_me.is_verified then
    raise exception '完成實名與背景審核後才能接單。' using errcode = 'P0001', hint = 'provider_not_verified';
  end if;

  if v_order.provider_id is null then
    if not v_me.service_switch_is_online then
      raise exception '請先開啟「上線接案」。' using errcode = 'P0001', hint = 'provider_offline';
    end if;
    if not (v_order.service_type = any (v_me.service_types)) then
      raise exception '您沒有提供這項服務。' using errcode = 'P0001', hint = 'service_not_offered';
    end if;
    if v_order.seeker_id = v_uid then
      raise exception '不能接自己發布的需求。' using errcode = 'P0001';
    end if;
  elsif v_order.provider_id <> v_uid then
    raise exception '這筆訂單不是指派給您的。' using errcode = '42501';
  end if;

  update public.orders
     set provider_id = v_uid,
         order_status = 'accepted',
         accepted_at = pg_catalog.now()
   where id = p_order_id
  returning * into v_order;
  return v_order;
exception
  when exclusion_violation then
    raise exception '您在這個時段已經有其他行程了。' using errcode = 'P0001', hint = 'schedule_conflict';
end;
$$;

-- 婉拒: an assigned request is cancelled; an open request is just hidden.
create or replace function public.decline_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception '找不到這筆訂單。' using errcode = 'P0002';
  end if;
  if v_order.order_status <> 'pending' then
    raise exception '這筆訂單已經無法婉拒了。' using errcode = 'P0001', hint = 'invalid_status';
  end if;

  if v_order.provider_id is null then
    insert into public.order_dismissals (order_id, provider_id) values (p_order_id, v_uid)
    on conflict do nothing;
    return v_order;
  end if;

  if v_order.provider_id <> v_uid then
    raise exception '這筆訂單不是指派給您的。' using errcode = '42501';
  end if;
  if v_order.payment_status = 'paid' and v_order.payment_method <> 'cash' then
    raise exception '已付款的訂單需透過退款流程取消。' using errcode = 'P0001', hint = 'refund_required';
  end if;

  update public.orders
     set order_status = 'cancelled',
         cancelled_at = pg_catalog.now(),
         cancelled_by = v_uid,
         cancel_reason = coalesce(nullif(pg_catalog.btrim(p_reason), ''), '陪伴者該時段無法服務')
   where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;

-- Either side cancels before the companion sets off.
create or replace function public.cancel_order(p_order_id uuid, p_reason text default null)
returns public.orders
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_uid is null
     or v_uid not in (v_order.seeker_id, coalesce(v_order.provider_id, '00000000-0000-0000-0000-000000000000'::uuid)) then
    raise exception '找不到這筆訂單。' using errcode = 'P0002';
  end if;
  if v_order.order_status not in ('pending', 'accepted') then
    raise exception '陪伴者已出發或服務已開始，無法線上取消，請直接聯絡對方。' using errcode = 'P0001', hint = 'invalid_status';
  end if;
  if v_order.payment_status = 'paid' and v_order.payment_method <> 'cash' then
    raise exception '已付款的訂單需透過退款流程取消。' using errcode = 'P0001', hint = 'refund_required';
  end if;

  update public.orders
     set order_status = 'cancelled',
         cancelled_at = pg_catalog.now(),
         cancelled_by = v_uid,
         cancel_reason = nullif(pg_catalog.btrim(p_reason), '')
   where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;

-- 開始導航: accepted → navigating (from 6 hours before the start time).
create or replace function public.start_navigation(p_order_id uuid)
returns public.orders
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.provider_id is distinct from v_uid then
    raise exception '找不到這筆訂單。' using errcode = 'P0002';
  end if;
  if v_order.order_status = 'navigating' then
    return v_order;
  end if;
  if v_order.order_status <> 'accepted' then
    raise exception '只有已接單的行程可以開始導航。' using errcode = 'P0001', hint = 'invalid_status';
  end if;
  if private.taipei_now() < (v_order.service_date + v_order.start_time) - interval '6 hours' then
    raise exception '服務開始前 6 小時內才能開始導航。' using errcode = 'P0001', hint = 'too_early';
  end if;

  update public.orders
     set order_status = 'navigating', navigation_started_at = pg_catalog.now()
   where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;

-- 我已抵達 / 開始服務: navigating (or accepted, e.g. online services) → in_progress.
create or replace function public.mark_arrived(p_order_id uuid)
returns public.orders
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.provider_id is distinct from v_uid then
    raise exception '找不到這筆訂單。' using errcode = 'P0002';
  end if;
  if v_order.order_status = 'in_progress' then
    return v_order;
  end if;
  if v_order.order_status not in ('accepted', 'navigating') then
    raise exception '目前的行程狀態無法開始服務。' using errcode = 'P0001', hint = 'invalid_status';
  end if;

  update public.orders
     set order_status = 'in_progress', arrived_at = pg_catalog.now()
   where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;

-- 填寫聯絡簿: writes the care log, completes the order and settles the money.
--   online payments → balance += provider_earning
--   cash            → the companion already holds the cash, so the platform fee
--                     is deducted from the balance instead.
create or replace function public.submit_care_log(
  p_order_id uuid,
  p_mood     text,
  p_message  text,
  p_photos   text[] default '{}'::text[]
)
returns public.care_logs
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders;
  v_log   public.care_logs;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.provider_id is distinct from v_uid then
    raise exception '找不到這筆訂單。' using errcode = 'P0002';
  end if;
  if v_order.order_status <> 'in_progress' then
    raise exception '服務開始後才能填寫聯絡簿。' using errcode = 'P0001', hint = 'invalid_status';
  end if;
  if exists (
    select 1 from pg_catalog.unnest(coalesce(p_photos, '{}'::text[])) as ph(path)
    where pg_catalog.split_part(ph.path, '/', 1) <> p_order_id::text
  ) then
    raise exception '照片路徑不屬於這筆訂單。' using errcode = 'P0001', hint = 'invalid_photo_path';
  end if;

  insert into public.care_logs (order_id, mood, message, photos)
  values (p_order_id, p_mood, p_message, coalesce(p_photos, '{}'::text[]))
  returning * into v_log;

  update public.orders
     set order_status = 'completed',
         completed_at = pg_catalog.now(),
         payment_status = case when payment_method = 'cash' then 'paid' else payment_status end,
         paid_at = case when payment_method = 'cash' then pg_catalog.now() else paid_at end
   where id = p_order_id;

  update public.provider_details
     set available_balance = available_balance
                             + case when v_order.payment_method = 'cash' then -v_order.platform_fee
                                    else v_order.provider_earning end,
         completed_orders = completed_orders + 1
   where provider_id = v_uid;

  return v_log;
exception
  when unique_violation then
    raise exception '這筆服務的聯絡簿已經送出了。' using errcode = 'P0001', hint = 'care_log_exists';
end;
$$;

-- 提領: full balance, once per calendar month (Asia/Taipei), only to a bank
-- account held under the companion's verified legal name.
create or replace function public.request_withdrawal()
returns public.withdrawals
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_month   text := private.taipei_month();
  v_details public.provider_details;
  v_name    text;
  v_row     public.withdrawals;
begin
  select * into v_details from public.provider_details where provider_id = v_uid for update;
  if not found then
    raise exception '只有陪伴者可以申請提領。' using errcode = '42501';
  end if;
  if v_details.bank_code is null or v_details.bank_account is null then
    raise exception '請先設定收款銀行帳戶。' using errcode = 'P0001', hint = 'bank_not_set';
  end if;
  if v_details.last_withdraw_month = v_month then
    raise exception '本月已經提領過了，下個月 1 日起可再次申請。' using errcode = 'P0001', hint = 'already_withdrawn';
  end if;
  if v_details.available_balance <= 0 then
    raise exception '目前沒有可提領的餘額。' using errcode = 'P0001', hint = 'no_balance';
  end if;

  select p.full_name into v_name from public.profiles p where p.id = v_uid;

  insert into public.withdrawals (provider_id, amount, month, bank_code, bank_account, account_name)
  values (v_uid, v_details.available_balance, v_month, v_details.bank_code, v_details.bank_account, v_name)
  returning * into v_row;

  update public.provider_details
     set available_balance = 0, last_withdraw_month = v_month
   where provider_id = v_uid;

  insert into public.notifications (user_id, type, title, body)
  values (v_uid, 'withdrawal', '提領申請已送出',
          '$' || v_row.amount || ' 將於 3–5 個工作天內匯入 ' || v_row.bank_code || ' 帳戶末四碼 ' || pg_catalog.right(v_row.bank_account, 4) || '。');
  return v_row;
end;
$$;

-- Booked hours of a companion (no personal data) for AvailabilityCalendar.
create or replace function public.get_booked_slots(p_provider_id uuid, p_from date, p_to date)
returns table (service_date date, start_time time, end_time time)
language sql stable security definer
set search_path = ''
as $$
  select o.service_date, o.start_time, o.end_time
  from public.orders o
  where o.provider_id = p_provider_id
    and o.order_status <> 'cancelled'
    and o.service_date between p_from and p_to
  order by 1, 2
$$;

-- -----------------------------------------------------------------------------
-- 7. Read models (definer views filtered to the caller)
-- -----------------------------------------------------------------------------

-- Public companion card — never exposes bank data, balance or legal name.
create view public.provider_public
with (security_barrier = true)
as
select
  d.provider_id,
  private.display_name(p.nickname, p.full_name) as nickname,
  p.avatar_url,
  d.bio,
  d.hourly_rate,
  d.service_types,
  d.tags,
  d.service_switch_is_online,
  d.youtube_video_id,
  d.is_verified,
  d.rating_avg,
  d.review_count,
  d.completed_orders,
  d.city,
  d.districts,
  d.offers_online,
  d.availability_slots,
  p.created_at as member_since
from public.provider_details d
join public.profiles p on p.id = d.provider_id
where d.is_verified or d.provider_id = (select auth.uid());

comment on view public.provider_public is '公開陪伴者資料（暱稱、時薪、評價、時段），不含銀行帳號與餘額。';

create view public.provider_reviews
with (security_barrier = true)
as
select
  c.id,
  o.provider_id,
  o.service_type,
  c.seeker_rating as rating,
  c.seeker_tags as tags,
  c.seeker_comment as comment,
  c.rated_at,
  pg_catalog.left(sp.full_name, 1) || '家屬' as reviewer
from public.care_logs c
join public.orders o on o.id = c.order_id
join public.profiles sp on sp.id = o.seeker_id
where c.seeker_rating is not null;

create view public.order_details
with (security_barrier = true)
as
select
  o.*,
  private.display_name(sp.nickname, sp.full_name) as seeker_name,
  sp.avatar_url as seeker_avatar_url,
  private.display_name(pp.nickname, pp.full_name) as provider_name,
  pp.avatar_url as provider_avatar_url,
  r.name as recipient_name,
  r.nickname as recipient_nickname,
  r.age as recipient_age,
  r.mobility as recipient_mobility,
  r.chronic_diseases as recipient_chronic_diseases,
  r.notes as recipient_notes,
  c.id as care_log_id,
  c.mood as care_log_mood,
  c.seeker_rating
from public.orders o
join public.profiles sp on sp.id = o.seeker_id
left join public.profiles pp on pp.id = o.provider_id
join public.kinship_recipients r on r.id = o.recipient_id
left join public.care_logs c on c.order_id = o.id
where (select auth.uid()) in (o.seeker_id, o.provider_id);

create view public.care_log_details
with (security_barrier = true)
as
select
  c.*,
  o.seeker_id,
  o.provider_id,
  o.service_type,
  o.service_date,
  o.start_time,
  o.end_time,
  o.recipient_id,
  private.display_name(pp.nickname, pp.full_name) as provider_name,
  pp.avatar_url as provider_avatar_url,
  r.name as recipient_name,
  r.nickname as recipient_nickname
from public.care_logs c
join public.orders o on o.id = c.order_id
left join public.profiles pp on pp.id = o.provider_id
join public.kinship_recipients r on r.id = o.recipient_id
where (select auth.uid()) in (o.seeker_id, o.provider_id);

-- Search (spec 4.2.2). Offline companions are hidden (spec 4.3.1).
create or replace function public.search_providers(
  p_service   text    default null,
  p_city      text    default null,
  p_district  text    default null,
  p_online    boolean default null,
  p_date      date    default null,
  p_hour      integer default null,
  p_max_rate  integer default null
)
returns setof public.provider_public
language sql stable security definer
set search_path = ''
as $$
  select pp.*
  from public.provider_public pp
  where pp.is_verified
    and pp.service_switch_is_online
    and (p_service is null or p_service = any (pp.service_types))
    and (p_max_rate is null or pp.hourly_rate <= p_max_rate)
    and (case
           when coalesce(p_online, false) then pp.offers_online
           else (p_city is null or pp.city = p_city)
                and (p_district is null or p_district = any (pp.districts))
         end)
    and (p_date is null or (
          pg_catalog.jsonb_array_length(coalesce(pp.availability_slots -> pg_catalog.to_char(p_date, 'YYYY-MM-DD'), '[]'::jsonb)) > 0
          and (p_hour is null or (
                (pp.availability_slots -> pg_catalog.to_char(p_date, 'YYYY-MM-DD')) ? (pg_catalog.lpad(p_hour::text, 2, '0') || ':00')
                and not exists (
                  select 1 from public.orders o
                  where o.provider_id = pp.provider_id
                    and o.order_status <> 'cancelled'
                    and o.service_date = p_date
                    and o.start_time <= pg_catalog.make_time(p_hour, 0, 0)
                    and o.end_time > pg_catalog.make_time(p_hour, 0, 0)
                )))
        ))
  order by pp.rating_avg desc, pp.review_count desc, pp.hourly_rate asc
$$;

-- 接案大廳: requests assigned to me plus open requests I have not dismissed.
-- Open requests only reveal the district, never the street address.
create or replace function public.get_provider_requests()
returns table (
  order_id               uuid,
  is_open                boolean,
  seeker_name            text,
  service_type           text,
  service_date           date,
  start_time             time,
  end_time               time,
  hours                  integer,
  hourly_rate            integer,
  total_amount           integer,
  provider_earning       integer,
  payment_method         text,
  payment_status         text,
  is_online              boolean,
  notes                  text,
  area                   text,
  location_address       text,
  approx_lat             double precision,
  approx_lng             double precision,
  recipient_name         text,
  recipient_age          integer,
  recipient_mobility     text,
  recipient_chronic_diseases text[],
  created_at             timestamptz
)
language sql stable security definer
set search_path = ''
as $$
  select
    o.id,
    o.provider_id is null,
    private.display_name(sp.nickname, sp.full_name),
    o.service_type, o.service_date, o.start_time, o.end_time, o.hours,
    o.hourly_rate, o.total_amount, o.provider_earning,
    o.payment_method, o.payment_status, o.is_online, o.notes,
    private.address_area(o.location_address),
    case when o.provider_id is null then null else o.location_address end,
    case when o.provider_id is null then pg_catalog.round(o.location_lat::numeric, 2)::double precision else o.location_lat end,
    case when o.provider_id is null then pg_catalog.round(o.location_lng::numeric, 2)::double precision else o.location_lng end,
    coalesce(r.nickname, pg_catalog.left(r.name, 1) || '長輩'),
    r.age, r.mobility, r.chronic_diseases,
    o.created_at
  from public.orders o
  join public.profiles sp on sp.id = o.seeker_id
  join public.kinship_recipients r on r.id = o.recipient_id
  join public.provider_details me on me.provider_id = (select auth.uid())
  where o.order_status = 'pending'
    and (o.payment_method = 'cash' or o.payment_status = 'paid')
    and (o.service_date + o.end_time) > private.taipei_now()
    and (
      o.provider_id = (select auth.uid())
      or (
        o.provider_id is null
        and me.is_verified
        and me.service_switch_is_online
        and o.service_type = any (me.service_types)
        and o.seeker_id <> me.provider_id
        and not exists (select 1 from public.order_dismissals x where x.order_id = o.id and x.provider_id = me.provider_id)
      )
    )
  order by o.provider_id is null, o.service_date, o.start_time
$$;

-- Phone number of the other side, only while the job is live.
create or replace function public.get_order_contact(p_order_id uuid)
returns table (user_id uuid, display_name text, phone text, avatar_url text)
language sql stable security definer
set search_path = ''
as $$
  select p.id, private.display_name(p.nickname, p.full_name), p.phone, p.avatar_url
  from public.orders o
  join public.profiles p
    on p.id = case when o.seeker_id = (select auth.uid()) then o.provider_id else o.seeker_id end
  where o.id = p_order_id
    and (select auth.uid()) in (o.seeker_id, o.provider_id)
    and o.order_status in ('accepted', 'navigating', 'in_progress')
$$;

-- Conversation list: everyone I share an order with, newest message first.
create or replace function public.get_conversations()
returns table (
  partner_id       uuid,
  partner_name     text,
  partner_avatar   text,
  partner_role     text,
  last_message     text,
  last_message_at  timestamptz,
  last_sender_id   uuid,
  unread_count     integer,
  active_order_id  uuid
)
language sql stable security definer
set search_path = ''
as $$
  with me as (select auth.uid() as id),
  partners as (
    select distinct case when o.seeker_id = me.id then o.provider_id else o.seeker_id end as partner_id
    from public.orders o, me
    where me.id in (o.seeker_id, o.provider_id) and o.provider_id is not null
  )
  select
    p.id,
    private.display_name(p.nickname, p.full_name),
    p.avatar_url,
    case when exists (select 1 from public.orders o, me where o.provider_id = p.id and o.seeker_id = me.id) then 'provider' else 'seeker' end,
    last.content,
    last.created_at,
    last.sender_id,
    (select count(*)::integer from public.messages m, me
      where m.receiver_id = me.id and m.sender_id = p.id and not m.is_read),
    (select o.id from public.orders o, me
      where ((o.seeker_id = me.id and o.provider_id = p.id) or (o.provider_id = me.id and o.seeker_id = p.id))
        and o.order_status in ('pending', 'accepted', 'navigating', 'in_progress')
      order by o.service_date, o.start_time limit 1)
  from partners pr
  join public.profiles p on p.id = pr.partner_id
  left join lateral (
    select m.content, m.created_at, m.sender_id
    from public.messages m, me
    where (m.sender_id = me.id and m.receiver_id = p.id) or (m.sender_id = p.id and m.receiver_id = me.id)
    order by m.created_at desc
    limit 1
  ) last on true
  order by last.created_at desc nulls last, p.id
$$;

-- Dashboard numbers for 陪伴者儀表板.
create or replace function public.get_provider_stats()
returns table (
  month_hours        integer,
  month_orders       integer,
  month_earning      integer,
  total_orders       integer,
  available_balance  integer,
  last_withdraw_month text,
  rating_avg         numeric,
  review_count       integer
)
language sql stable security definer
set search_path = ''
as $$
  select
    coalesce(sum(o.hours) filter (where o.order_status = 'completed' and pg_catalog.to_char(o.service_date, 'YYYY-MM') = private.taipei_month()), 0)::integer,
    count(*) filter (where o.order_status = 'completed' and pg_catalog.to_char(o.service_date, 'YYYY-MM') = private.taipei_month())::integer,
    coalesce(sum(o.provider_earning) filter (where o.order_status = 'completed' and pg_catalog.to_char(o.service_date, 'YYYY-MM') = private.taipei_month()), 0)::integer,
    count(*) filter (where o.order_status in ('accepted', 'navigating', 'in_progress', 'completed'))::integer,
    d.available_balance,
    d.last_withdraw_month,
    d.rating_avg,
    d.review_count
  from public.provider_details d
  left join public.orders o on o.provider_id = d.provider_id
  where d.provider_id = (select auth.uid())
  group by d.provider_id
$$;

-- -----------------------------------------------------------------------------
-- 8. Privileges
-- -----------------------------------------------------------------------------

-- Functions: nothing is callable by anonymous visitors.
revoke execute on function
  public.accept_order(uuid),
  public.decline_order(uuid, text),
  public.cancel_order(uuid, text),
  public.start_navigation(uuid),
  public.mark_arrived(uuid),
  public.submit_care_log(uuid, text, text, text[]),
  public.request_withdrawal(),
  public.get_booked_slots(uuid, date, date),
  public.search_providers(text, text, text, boolean, date, integer, integer),
  public.get_provider_requests(),
  public.get_order_contact(uuid),
  public.get_conversations(),
  public.get_provider_stats()
from public, anon;

grant execute on function
  public.accept_order(uuid),
  public.decline_order(uuid, text),
  public.cancel_order(uuid, text),
  public.start_navigation(uuid),
  public.mark_arrived(uuid),
  public.submit_care_log(uuid, text, text, text[]),
  public.request_withdrawal(),
  public.get_booked_slots(uuid, date, date),
  public.search_providers(text, text, text, boolean, date, integer, integer),
  public.get_provider_requests(),
  public.get_order_contact(uuid),
  public.get_conversations(),
  public.get_provider_stats()
to authenticated, service_role;

-- Tables: start from nothing for anon, then grant exactly what each role needs.
revoke all on
  public.profiles, public.provider_details, public.kinship_recipients, public.health_logs,
  public.orders, public.care_logs, public.messages, public.sos_alerts,
  public.withdrawals, public.notifications, public.order_dismissals,
  public.provider_public, public.provider_reviews, public.order_details, public.care_log_details
from anon, authenticated;

grant all on
  public.profiles, public.provider_details, public.kinship_recipients, public.health_logs,
  public.orders, public.care_logs, public.messages, public.sos_alerts,
  public.withdrawals, public.notifications, public.order_dismissals,
  public.provider_public, public.provider_reviews, public.order_details, public.care_log_details
to service_role;

grant select on public.provider_public, public.provider_reviews, public.order_details, public.care_log_details to authenticated;

grant select, insert on public.profiles to authenticated;
grant update (role, full_name, nickname, phone, avatar_url, emergency_contact_name, emergency_contact_phone)
  on public.profiles to authenticated;

-- Balance, rating, verification and withdrawal month are never client-writable.
grant select on public.provider_details to authenticated;
grant update (bio, hourly_rate, service_types, tags, service_switch_is_online, youtube_video_id,
              bank_code, bank_account, availability_slots, city, districts, offers_online)
  on public.provider_details to authenticated;

grant select, insert, update, delete on public.kinship_recipients to authenticated;
grant select, insert, delete on public.health_logs to authenticated;

grant select on public.orders to authenticated;
grant insert (id, seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time,
              location_address, location_lat, location_lng, is_online, notes, hourly_rate,
              total_amount, platform_fee, provider_earning, payment_method)
  on public.orders to authenticated;

grant select on public.care_logs to authenticated;
grant update (seeker_rating, seeker_tags, seeker_comment) on public.care_logs to authenticated;

grant select, insert on public.messages to authenticated;
grant update (is_read) on public.messages to authenticated;

grant select, insert on public.sos_alerts to authenticated;
grant update (status, resolved_at) on public.sos_alerts to authenticated;

grant select on public.withdrawals to authenticated;

grant select, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

grant select on public.order_dismissals to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.provider_details   enable row level security;
alter table public.kinship_recipients enable row level security;
alter table public.health_logs        enable row level security;
alter table public.orders             enable row level security;
alter table public.care_logs          enable row level security;
alter table public.messages           enable row level security;
alter table public.sos_alerts         enable row level security;
alter table public.withdrawals        enable row level security;
alter table public.notifications      enable row level security;
alter table public.order_dismissals   enable row level security;

-- profiles: only yourself (others are reached through the read models above)
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: create own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- provider_details: bank account & balance are visible to the owner only
create policy "provider_details: owner reads" on public.provider_details
  for select to authenticated using (provider_id = (select auth.uid()));
create policy "provider_details: owner updates" on public.provider_details
  for update to authenticated using (provider_id = (select auth.uid())) with check (provider_id = (select auth.uid()));

-- kinship_recipients: the family, plus the companion while serving this elder
create policy "kinship: family manages" on public.kinship_recipients
  for all to authenticated using (seeker_id = (select auth.uid())) with check (seeker_id = (select auth.uid()));
create policy "kinship: companion reads during service" on public.kinship_recipients
  for select to authenticated using (private.provider_serves_recipient(id));

-- health_logs: same rule
create policy "health: family manages" on public.health_logs
  for all to authenticated using (seeker_id = (select auth.uid())) with check (seeker_id = (select auth.uid()));
create policy "health: companion reads during service" on public.health_logs
  for select to authenticated using (private.provider_serves_seeker(seeker_id));

-- orders: participants read; families create; every transition goes through RPCs
create policy "orders: participants read" on public.orders
  for select to authenticated using ((select auth.uid()) in (seeker_id, provider_id));
create policy "orders: family creates" on public.orders
  for insert to authenticated with check (seeker_id = (select auth.uid()));

-- care_logs: participants read; the family rates
create policy "care_logs: participants read" on public.care_logs
  for select to authenticated using (private.is_order_participant(order_id));
create policy "care_logs: family rates" on public.care_logs
  for update to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.seeker_id = (select auth.uid()) and o.order_status = 'completed'))
  with check (exists (select 1 from public.orders o where o.id = order_id and o.seeker_id = (select auth.uid()) and o.order_status = 'completed'));

-- messages: only between people who share an order
create policy "messages: read own conversations" on public.messages
  for select to authenticated using ((select auth.uid()) in (sender_id, receiver_id));
create policy "messages: send to order partners" on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and private.has_order_relationship(receiver_id));
create policy "messages: receiver marks read" on public.messages
  for update to authenticated using (receiver_id = (select auth.uid())) with check (receiver_id = (select auth.uid()));

-- sos_alerts
create policy "sos: read own" on public.sos_alerts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "sos: trigger own" on public.sos_alerts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "sos: resolve own" on public.sos_alerts
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- withdrawals (written by request_withdrawal only)
create policy "withdrawals: read own" on public.withdrawals
  for select to authenticated using (provider_id = (select auth.uid()));

-- notifications
create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: mark own read" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications: clear own" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- order_dismissals
create policy "order_dismissals: read own" on public.order_dismissals
  for select to authenticated using (provider_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 10. Storage
--   avatars/{user_id}/…             public read, owner write
--   care-photos/{order_id}/…        order participants read, companion writes during service
--   provider-documents/{user_id}/…  良民證、證照 — owner only (staff review with the service role)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('care-photos', 'care-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('provider-documents', 'provider-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "avatars: public read" on storage.objects
  for select to public using (bucket_id = 'avatars');
create policy "avatars: owner writes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner updates" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "care-photos: participants read" on storage.objects
  for select to authenticated
  using (bucket_id = 'care-photos' and private.is_order_participant(private.try_uuid((storage.foldername(name))[1])));
create policy "care-photos: companion uploads during service" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'care-photos'
    and exists (
      select 1 from public.orders o
      where o.id = private.try_uuid((storage.foldername(name))[1])
        and o.provider_id = (select auth.uid())
        and o.order_status = 'in_progress'
    )
  );

create policy "provider-documents: owner reads" on storage.objects
  for select to authenticated
  using (bucket_id = 'provider-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "provider-documents: owner uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'provider-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "provider-documents: owner deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'provider-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- -----------------------------------------------------------------------------
-- 11. Realtime
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.orders, public.messages, public.notifications, public.care_logs;

-- GPS broadcast on private channels `tracking:order_{uuid}`:
-- both participants may listen, only the assigned companion may send.
create policy "tracking: participants listen" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select realtime.topic()) like 'tracking:order_%'
    and private.is_order_participant(private.try_uuid(pg_catalog.substr((select realtime.topic()), 16)))
  );
create policy "tracking: companion broadcasts" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select realtime.topic()) like 'tracking:order_%'
    and private.is_order_provider(private.try_uuid(pg_catalog.substr((select realtime.topic()), 16)))
  );

-- -----------------------------------------------------------------------------
-- 12. Housekeeping: release hours held by abandoned LINE Pay checkouts.
--     Scheduled automatically when pg_cron is enabled
--     (Dashboard → Database → Extensions → pg_cron).
-- -----------------------------------------------------------------------------
create or replace function private.cancel_stale_unpaid_orders()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.orders
     set order_status = 'cancelled',
         cancelled_at = pg_catalog.now(),
         cancel_reason = '付款逾時，系統已釋出時段'
   where payment_method = 'linepay'
     and payment_status = 'unpaid'
     and order_status = 'pending'
     and created_at < pg_catalog.now() - interval '30 minutes';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function private.cancel_stale_unpaid_orders() from public;

do $$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    perform cron.schedule('silvercompanion-cancel-stale-unpaid', '*/10 * * * *',
                          'select private.cancel_stale_unpaid_orders()');
  end if;
end;
$$;
