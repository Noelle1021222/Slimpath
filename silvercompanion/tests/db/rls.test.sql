-- Behavioural tests for the schema: RLS, column privileges, triggers and RPCs.
-- Run with `npm run test:db` (scripts/test-db.sh). Each block acts as a real
-- signed-in user through `tests.login()` + `set local role authenticated`.

\set ON_ERROR_STOP on
set client_min_messages = warning;
\o /dev/null

create schema tests;
grant usage on schema tests to public;

create table tests.results (n serial, name text, ok boolean, detail text);
grant all on tests.results to public;
grant usage on sequence tests.results_n_seq to public;

create function tests.login(p_user uuid) returns void
language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

create function tests.check(p_name text, p_ok boolean, p_detail text default null) returns void
language plpgsql as $$
begin
  insert into tests.results (name, ok, detail) values (p_name, coalesce(p_ok, false), p_detail);
end;
$$;

-- Runs p_sql and records whether it failed with the expected SQLSTATE / hint.
create function tests.throws(p_name text, p_sql text, p_expect text) returns void
language plpgsql as $$
declare
  v_state text;
  v_hint  text;
  v_msg   text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_hint = pg_exception_hint, v_msg = message_text;
    perform tests.check(p_name, v_state = p_expect or v_hint = p_expect, v_state || ' / ' || coalesce(v_hint, '') || ' / ' || v_msg);
    return;
  end;
  perform tests.check(p_name, false, 'expected ' || p_expect || ' but statement succeeded');
end;
$$;

grant execute on all functions in schema tests to public;

-- ---------------------------------------------------------------------------
-- Fixture: fresh users independent of the seed
-- ---------------------------------------------------------------------------
\set S1 '''d0000000-0000-4000-8000-000000000001'''
\set S2 '''d0000000-0000-4000-8000-000000000002'''
\set P1 '''e0000000-0000-4000-8000-000000000001'''
\set P2 '''e0000000-0000-4000-8000-000000000002'''
\set P3 '''e0000000-0000-4000-8000-000000000003'''

insert into auth.users (id, email, aud, role) values
  (:S1, 's1@test.local', 'authenticated', 'authenticated'),
  (:S2, 's2@test.local', 'authenticated', 'authenticated'),
  (:P1, 'p1@test.local', 'authenticated', 'authenticated'),
  (:P2, 'p2@test.local', 'authenticated', 'authenticated'),
  (:P3, 'p3@test.local', 'authenticated', 'authenticated');

-- Profiles are created by the users themselves (onboarding).
begin;
select tests.login(:S1); set local role authenticated;
insert into public.profiles (id, role, full_name, nickname, phone) values (:S1, 'seeker', '測試家屬一', '家屬一', '0911000001');
select tests.throws('profiles: cannot create a profile for someone else',
  $$insert into public.profiles (id, role, full_name, phone) values ('d0000000-0000-4000-8000-000000000002', 'seeker', '冒名者', '0911000099')$$, '42501');
commit;

begin;
select tests.login(:S2); set local role authenticated;
insert into public.profiles (id, role, full_name, phone) values (:S2, 'seeker', '測試家屬二', '0911000002');
commit;

begin;
select tests.login(:P1); set local role authenticated;
insert into public.profiles (id, role, full_name, nickname, phone) values (:P1, 'provider', '測試陪伴一', '陪伴一', '0922000001');
select tests.check('provider profile creates provider_details automatically',
  (select count(*) = 1 from public.provider_details where provider_id = 'e0000000-0000-4000-8000-000000000001'));
select tests.throws('provider cannot self-verify', $$update public.provider_details set is_verified = true$$, '42501');
select tests.throws('provider cannot set own balance', $$update public.provider_details set available_balance = 999999$$, '42501');
select tests.throws('provider cannot change own rating', $$update public.provider_details set rating_avg = 5$$, '42501');
select tests.throws('unverified provider cannot go online', $$update public.provider_details set service_switch_is_online = true$$, 'provider_not_verified');
select tests.throws('hourly rate must be in $50 steps', $$update public.provider_details set hourly_rate = 375$$, '23514');
select tests.throws('hourly rate upper bound', $$update public.provider_details set hourly_rate = 1050$$, '23514');
select tests.throws('availability must use whole hours', $$update public.provider_details set availability_slots = '{"2026-10-15": ["09:30"]}'$$, '23514');
commit;

begin;
select tests.login(:P2); set local role authenticated;
insert into public.profiles (id, role, full_name, phone) values (:P2, 'provider', '測試陪伴二', '0922000002');
commit;
begin;
select tests.login(:P3); set local role authenticated;
insert into public.profiles (id, role, full_name, phone) values (:P3, 'provider', '測試陪伴三', '0922000003');
commit;

-- Platform staff verify P1 and P3 (service role / dashboard).
update public.provider_details set is_verified = true where provider_id in (:P1, :P3);

-- Availability: today + tomorrow, every hour, so the tests do not depend on the clock.
do $$
declare
  v_today date := (now() at time zone 'Asia/Taipei')::date;
  v_all jsonb := (select jsonb_agg(lpad(h::text, 2, '0') || ':00' order by h) from generate_series(0, 23) h);
begin
  update public.provider_details
     set availability_slots = jsonb_build_object(
           to_char(v_today, 'YYYY-MM-DD'), v_all,
           to_char(v_today + 1, 'YYYY-MM-DD'), v_all,
           to_char(v_today + 2, 'YYYY-MM-DD'), '["09:00","10:00","11:00"]'::jsonb),
         hourly_rate = case provider_id when 'e0000000-0000-4000-8000-000000000001' then 400 else 300 end,
         service_types = array['chat','medical','walk'],
         city = '台北市', districts = array['大安區'],
         service_switch_is_online = true
   where provider_id in ('e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003');
end;
$$;

-- ---------------------------------------------------------------------------
-- Seeker side
-- ---------------------------------------------------------------------------
begin;
select tests.login(:S1); set local role authenticated;

insert into public.kinship_recipients (seeker_id, name, age, mobility, address, lat, lng)
values (:S1, '測試長輩', 80, '需攙扶', '台北市大安區測試路 1 號', 25.03, 121.55);
insert into public.health_logs (seeker_id, bp_high, bp_low, heart_rate) values (:S1, 128, 82, 72);

select tests.check('seeker sees only own profile', (select count(*) = 1 from public.profiles));
select tests.check('provider_details of others are invisible', (select count(*) = 0 from public.provider_details));
select tests.check('provider_public lists verified companions only',
  (select count(*) = 2 from public.provider_public where provider_id in ('e0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000003')));
select tests.check('provider_public never exposes bank data',
  not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'provider_public'
              and column_name in ('bank_code','bank_account','available_balance','last_withdraw_month','full_name')));
select tests.check('provider_public shows nickname, not legal name',
  (select nickname = '陪伴一' from public.provider_public where provider_id = 'e0000000-0000-4000-8000-000000000001'));
select tests.check('masked name when no nickname',
  (select nickname = '測○○○○' from public.provider_public where provider_id = 'e0000000-0000-4000-8000-000000000003'));
commit;

-- Book P1 for tomorrow 09:00–11:00 and try to tamper with the price.
begin;
select tests.login(:S1); set local role authenticated;
insert into public.orders (id, seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time,
                           location_address, hourly_rate, total_amount, platform_fee, provider_earning, payment_method)
select 'f0000000-0000-4000-8000-000000000001', :S1, :P1, r.id, 'medical', (now() at time zone 'Asia/Taipei')::date + 1, '09:00', '11:00',
       r.address, 200, 1, 0, 1, 'linepay'
from public.kinship_recipients r where r.seeker_id = :S1;

select tests.check('price is computed by the database (2h × $400)',
  (select total_amount = 800 and platform_fee = 120 and provider_earning = 680 and hourly_rate = 400 and hours = 2
     from public.orders where id = 'f0000000-0000-4000-8000-000000000001'));
select tests.check('new orders start pending and unpaid',
  (select order_status = 'pending' and payment_status = 'unpaid' from public.orders where id = 'f0000000-0000-4000-8000-000000000001'));

select tests.throws('double booking is impossible',
  $$insert into public.orders (seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, payment_method)
    select 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', id, 'chat', (now() at time zone 'Asia/Taipei')::date + 1, '10:00', '12:00', address, 'cash'
    from public.kinship_recipients where seeker_id = 'd0000000-0000-4000-8000-000000000001'$$, '23P01');
select tests.throws('booking outside opening hours is rejected',
  $$insert into public.orders (seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, payment_method)
    select 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', id, 'chat', (now() at time zone 'Asia/Taipei')::date + 2, '11:00', '13:00', address, 'cash'
    from public.kinship_recipients where seeker_id = 'd0000000-0000-4000-8000-000000000001'$$, 'slot_unavailable');
select tests.throws('unverified companion cannot be booked',
  $$insert into public.orders (seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, payment_method)
    select 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', id, 'chat', (now() at time zone 'Asia/Taipei')::date + 1, '13:00', '14:00', address, 'cash'
    from public.kinship_recipients where seeker_id = 'd0000000-0000-4000-8000-000000000001'$$, 'provider_offline');
select tests.throws('service must be offered',
  $$insert into public.orders (seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, payment_method)
    select 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', id, 'tech', (now() at time zone 'Asia/Taipei')::date + 1, '13:00', '14:00', address, 'cash'
    from public.kinship_recipients where seeker_id = 'd0000000-0000-4000-8000-000000000001'$$, 'service_not_offered');
select tests.throws('credit card is not yet available',
  $$insert into public.orders (seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, payment_method)
    select 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', id, 'chat', (now() at time zone 'Asia/Taipei')::date + 1, '13:00', '14:00', address, 'credit_card'
    from public.kinship_recipients where seeker_id = 'd0000000-0000-4000-8000-000000000001'$$, 'payment_method_unavailable');
select tests.throws('cannot book in the past',
  $$insert into public.orders (seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, payment_method)
    select 'd0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', id, 'chat', (now() at time zone 'Asia/Taipei')::date - 1, '13:00', '14:00', address, 'cash'
    from public.kinship_recipients where seeker_id = 'd0000000-0000-4000-8000-000000000001'$$, 'start_in_past');
select tests.throws('seeker cannot mark own order as paid', $$update public.orders set payment_status = 'paid'$$, '42501');
select tests.throws('cannot order for an elder of another family',
  $$insert into public.orders (seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, payment_method)
    values ('d0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 999999, 'chat', (now() at time zone 'Asia/Taipei')::date + 1, '13:00', '14:00', 'x 路 1 號', 'cash')$$, '23503');
select tests.throws('cannot order on behalf of another seeker',
  $$insert into public.orders (seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, payment_method)
    values ('d0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 1, 'chat', (now() at time zone 'Asia/Taipei')::date + 1, '13:00', '14:00', 'x 路 1 號', 'cash')$$, '42501');
commit;

-- ---------------------------------------------------------------------------
-- Companion request hall & payment gate
-- ---------------------------------------------------------------------------
begin;
select tests.login(:P1); set local role authenticated;
select tests.check('unpaid LINE Pay orders are hidden from the request hall',
  not exists (select 1 from public.get_provider_requests() where order_id = 'f0000000-0000-4000-8000-000000000001'));
select tests.throws('cannot accept an unpaid LINE Pay order', $$select public.accept_order('f0000000-0000-4000-8000-000000000001')$$, 'unpaid');
select tests.check('assigned companion may read the elder profile while pending',
  (select count(*) = 1 from public.kinship_recipients));
select tests.check('health data stays private before acceptance', (select count(*) = 0 from public.health_logs));
commit;

-- LINE Pay confirm (edge function, service role)
update public.orders set payment_status = 'paid', paid_at = now(), linepay_transaction_id = '1234567890123456789'
 where id = 'f0000000-0000-4000-8000-000000000001';

begin;
select tests.login(:S1); set local role authenticated;
select tests.throws('blood pressure must be a valid pair',
  $$insert into public.health_logs (seeker_id, bp_high, bp_low) values ('d0000000-0000-4000-8000-000000000001', 70, 90)$$, '23514');
select tests.throws('empty health log is rejected',
  $$insert into public.health_logs (seeker_id) values ('d0000000-0000-4000-8000-000000000001')$$, '23514');
select tests.throws('paid LINE Pay order needs the refund flow to cancel',
  $$select public.cancel_order('f0000000-0000-4000-8000-000000000001')$$, 'refund_required');
commit;

begin;
select tests.login(:P1); set local role authenticated;
select tests.check('companion was notified about the paid booking',
  exists (select 1 from public.notifications where type = 'order_paid' and order_id = 'f0000000-0000-4000-8000-000000000001'));
select tests.check('paid order appears in the request hall',
  exists (select 1 from public.get_provider_requests() where order_id = 'f0000000-0000-4000-8000-000000000001' and not is_open));
select public.accept_order('f0000000-0000-4000-8000-000000000001');
select tests.check('accepted', (select order_status = 'accepted' from public.orders where id = 'f0000000-0000-4000-8000-000000000001'));
select tests.check('after acceptance the companion can read health data', (select count(*) = 1 from public.health_logs));
select tests.throws('navigation cannot start a day early', $$select public.start_navigation('f0000000-0000-4000-8000-000000000001')$$, 'too_early');
commit;

begin;
select tests.login(:P3); set local role authenticated;
select tests.check('other companions cannot read the elder', (select count(*) = 0 from public.kinship_recipients));
select tests.check('other companions cannot read health data', (select count(*) = 0 from public.health_logs));
select tests.check('other companions cannot see the order', (select count(*) = 0 from public.orders));
select tests.throws('other companions cannot accept it', $$select public.accept_order('f0000000-0000-4000-8000-000000000001')$$, 'invalid_status');
commit;

begin;
select tests.login(:S1); set local role authenticated;
select tests.check('family notified of acceptance', exists (select 1 from public.notifications where type = 'order_accepted'));
select tests.check('order_details joins names for participants',
  (select provider_name = '陪伴一' and recipient_name = '測試長輩' from public.order_details where id = 'f0000000-0000-4000-8000-000000000001'));
select tests.check('booked slots expose times only',
  (select count(*) = 1 from public.get_booked_slots('e0000000-0000-4000-8000-000000000001', (now() at time zone 'Asia/Taipei')::date, (now() at time zone 'Asia/Taipei')::date + 7)));
select tests.check('search hides a booked hour',
  not exists (select 1 from public.search_providers(null, null, null, null, (now() at time zone 'Asia/Taipei')::date + 1, 10, null) where provider_id = 'e0000000-0000-4000-8000-000000000001'));
select tests.check('search shows a free hour',
  exists (select 1 from public.search_providers(null, null, null, null, (now() at time zone 'Asia/Taipei')::date + 1, 14, null) where provider_id = 'e0000000-0000-4000-8000-000000000001'));
select tests.check('search filters by budget',
  not exists (select 1 from public.search_providers(null, null, null, null, null, null, 350) where provider_id = 'e0000000-0000-4000-8000-000000000001'));
select tests.check('search filters by district',
  exists (select 1 from public.search_providers('medical', '台北市', '大安區', null, null, null, null) where provider_id = 'e0000000-0000-4000-8000-000000000001')
  and not exists (select 1 from public.search_providers('medical', '台北市', '信義區', null, null, null, null)
                  where provider_id in ('e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003')));
commit;

-- ---------------------------------------------------------------------------
-- A live trip: today, starting within the next hours
-- ---------------------------------------------------------------------------
do $$
declare
  v_start timestamp := date_trunc('hour', now() at time zone 'Asia/Taipei') + interval '1 hour';
begin
  perform set_config('tests.trip_date', v_start::date::text, false);
  perform set_config('tests.trip_start', to_char(v_start, 'HH24:00'), false);
  perform set_config('tests.trip_end', (extract(hour from v_start)::integer + 1)::text || ':00', false);
end;
$$;

begin;
select tests.login(:S1); set local role authenticated;
insert into public.orders (id, seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, payment_method)
select 'f0000000-0000-4000-8000-000000000002', :S1, :P1, r.id, 'walk',
       current_setting('tests.trip_date')::date,
       current_setting('tests.trip_start')::time,
       current_setting('tests.trip_end')::time,
       r.address, 'cash'
from public.kinship_recipients r where r.seeker_id = :S1;
commit;

begin;
select tests.login(:P1); set local role authenticated;
select tests.check('cash booking notifies the companion immediately',
  exists (select 1 from public.notifications where type = 'order_new' and order_id = 'f0000000-0000-4000-8000-000000000002'));
select public.accept_order('f0000000-0000-4000-8000-000000000002');
select public.start_navigation('f0000000-0000-4000-8000-000000000002');
select tests.check('navigating', (select order_status = 'navigating' from public.orders where id = 'f0000000-0000-4000-8000-000000000002'));
select tests.check('contact phone is available during the trip',
  (select phone = '0911000001' from public.get_order_contact('f0000000-0000-4000-8000-000000000002')));

-- Realtime broadcast authorisation on tracking:order_{id}
select set_config('realtime.topic', 'tracking:order_f0000000-0000-4000-8000-000000000002', true);
insert into realtime.messages (topic, extension, event, payload)
values ('tracking:order_f0000000-0000-4000-8000-000000000002', 'broadcast', 'location', '{"lat":25.03,"lng":121.55}');
select tests.check('companion may broadcast GPS on the order channel', true);
commit;

begin;
select tests.login(:S1); set local role authenticated;
select set_config('realtime.topic', 'tracking:order_f0000000-0000-4000-8000-000000000002', true);
select tests.check('family may listen on the tracking channel', (select count(*) >= 1 from realtime.messages));
select tests.throws('family cannot broadcast a fake position',
  $$insert into realtime.messages (topic, extension, event, payload) values ('tracking:order_f0000000-0000-4000-8000-000000000002', 'broadcast', 'location', '{}')$$, '42501');
select tests.check('family notified that the companion is on the way', exists (select 1 from public.notifications where type = 'order_navigating'));
select tests.throws('cannot cancel once the companion set off', $$select public.cancel_order('f0000000-0000-4000-8000-000000000002')$$, 'invalid_status');
commit;

begin;
select tests.login(:S2); set local role authenticated;
select set_config('realtime.topic', 'tracking:order_f0000000-0000-4000-8000-000000000002', true);
select tests.check('strangers cannot listen to the tracking channel', (select count(*) = 0 from realtime.messages));
select set_config('realtime.topic', 'tracking:order_not-a-uuid', true);
select tests.check('malformed topics are rejected safely', (select count(*) = 0 from realtime.messages));
commit;

begin;
select tests.login(:P1); set local role authenticated;
select public.mark_arrived('f0000000-0000-4000-8000-000000000002');
select tests.check('in progress after arrival', (select order_status = 'in_progress' from public.orders where id = 'f0000000-0000-4000-8000-000000000002'));

insert into storage.objects (bucket_id, name) values ('care-photos', 'f0000000-0000-4000-8000-000000000002/walk.jpg');
select tests.check('companion uploads care photos during the service', true);
select tests.throws('cannot upload photos to another order folder',
  $$insert into storage.objects (bucket_id, name) values ('care-photos', 'f0000000-0000-4000-8000-000000000001/x.jpg')$$, '42501');
select tests.throws('care log photos must belong to the order',
  $$select public.submit_care_log('f0000000-0000-4000-8000-000000000002', 'happy', '今天很好', array['f0000000-0000-4000-8000-000000000001/x.jpg'])$$, 'invalid_photo_path');

select public.submit_care_log('f0000000-0000-4000-8000-000000000002', 'happy', '今天天氣很好，我們繞了公園兩圈。',
                              array['f0000000-0000-4000-8000-000000000002/walk.jpg']);
select tests.check('care log completes the order and marks cash as paid',
  (select order_status = 'completed' and payment_status = 'paid' from public.orders where id = 'f0000000-0000-4000-8000-000000000002'));
select tests.check('cash order deducts the platform fee from the balance (1h × $400 → −$60)',
  (select available_balance = -60 and completed_orders = 1 from public.provider_details));
select tests.throws('care log can only be written once',
  $$select public.submit_care_log('f0000000-0000-4000-8000-000000000002', 'happy', '再一次')$$, 'invalid_status');
commit;

begin;
select tests.login(:S2); set local role authenticated;
select tests.check('strangers cannot read care photos',
  (select count(*) = 0 from storage.objects where bucket_id = 'care-photos'));
commit;

begin;
select tests.login(:S1); set local role authenticated;
select tests.check('family reads care photos', (select count(*) = 1 from storage.objects where bucket_id = 'care-photos'));
select tests.check('care_log_details visible to the family',
  (select mood = 'happy' and provider_name = '陪伴一' from public.care_log_details where order_id = 'f0000000-0000-4000-8000-000000000002'));
update public.care_logs set seeker_rating = 4, seeker_tags = array['準時抵達'], seeker_comment = '很用心'
 where order_id = 'f0000000-0000-4000-8000-000000000002';
select tests.throws('rating is a one-time action',
  $$update public.care_logs set seeker_rating = 1 where order_id = 'f0000000-0000-4000-8000-000000000002'$$, 'already_rated');
select tests.throws('family cannot rewrite the care log text',
  $$update public.care_logs set message = '竄改' where order_id = 'f0000000-0000-4000-8000-000000000002'$$, '42501');
select tests.check('rating recalculates the public average',
  (select rating_avg = 4.00 and review_count = 1 from public.provider_public where provider_id = 'e0000000-0000-4000-8000-000000000001'));
select tests.check('review is public with a masked reviewer',
  (select reviewer = '測家屬' and rating = 4 from public.provider_reviews where provider_id = 'e0000000-0000-4000-8000-000000000001'));
commit;

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
begin;
select tests.login(:S1); set local role authenticated;
insert into public.messages (sender_id, receiver_id, content) values (:S1, :P1, '謝謝妳今天的陪伴！');
select tests.throws('cannot message strangers',
  $$insert into public.messages (sender_id, receiver_id, content) values ('d0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003', 'hi')$$, '42501');
select tests.throws('cannot send as someone else',
  $$insert into public.messages (sender_id, receiver_id, content) values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'hi')$$, '42501');
commit;

begin;
select tests.login(:P1); set local role authenticated;
select tests.check('conversation list shows unread count',
  (select unread_count = 1 and partner_name = '家屬一' and partner_role = 'seeker' from public.get_conversations()));
update public.messages set is_read = true where receiver_id = :P1;
select tests.check('receiver marks messages read', (select unread_count = 0 from public.get_conversations()));
select tests.throws('cannot edit message content', $$update public.messages set content = 'x'$$, '42501');
commit;

-- ---------------------------------------------------------------------------
-- Withdrawals: bank first, once a month, full balance
-- ---------------------------------------------------------------------------
update public.provider_details set available_balance = 5000 where provider_id = :P1;  -- staff top-up for the test

begin;
select tests.login(:P1); set local role authenticated;
select tests.throws('bank account required', $$select public.request_withdrawal()$$, 'bank_not_set');
update public.provider_details set bank_code = '822', bank_account = '0123456789';
select public.request_withdrawal();
select tests.check('withdrawal takes the full balance under the legal name',
  (select amount = 5000 and account_name = '測試陪伴一' and status = 'requested' from public.withdrawals));
select tests.check('balance is zero and the month is recorded',
  (select available_balance = 0 and last_withdraw_month = to_char(now() at time zone 'Asia/Taipei', 'YYYY-MM') from public.provider_details));
commit;

update public.provider_details set available_balance = 800 where provider_id = :P1;
begin;
select tests.login(:P1); set local role authenticated;
select tests.throws('only one withdrawal per month', $$select public.request_withdrawal()$$, 'already_withdrawn');
select tests.throws('verified legal name is locked', $$update public.profiles set full_name = '別人的名字'$$, 'full_name_locked');
select tests.check('stats reflect this month', (select month_orders = 1 and month_hours = 1 from public.get_provider_stats()));
commit;

-- ---------------------------------------------------------------------------
-- Cash booking declined, then open requests
-- ---------------------------------------------------------------------------
begin;
select tests.login(:S2); set local role authenticated;
insert into public.kinship_recipients (seeker_id, name, age, mobility, address, lat, lng)
values (:S2, '二號長輩', 88, '需輪椅', '台北市大安區另一路 2 號', 25.0345, 121.5432);
insert into public.orders (id, seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, location_lat, location_lng, payment_method)
select 'f0000000-0000-4000-8000-000000000003', :S2, :P3, r.id, 'chat', (now() at time zone 'Asia/Taipei')::date + 1, '15:00', '16:00', r.address, r.lat, r.lng, 'cash'
from public.kinship_recipients r where r.seeker_id = :S2;
insert into public.orders (id, seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, location_lat, location_lng, hourly_rate, payment_method)
select 'f0000000-0000-4000-8000-000000000004', :S2, null, r.id, 'chat', (now() at time zone 'Asia/Taipei')::date + 1, '18:00', '20:00', r.address, r.lat, r.lng, 350, 'cash'
from public.kinship_recipients r where r.seeker_id = :S2;
select tests.check('open request priced from the budget',
  (select total_amount = 700 from public.orders where id = 'f0000000-0000-4000-8000-000000000004'));
commit;

begin;
select tests.login(:P3); set local role authenticated;
select public.decline_order('f0000000-0000-4000-8000-000000000003', '那天要回診');
select tests.check('declined order is cancelled', (select order_status = 'cancelled' and cancel_reason = '那天要回診' from public.orders where id = 'f0000000-0000-4000-8000-000000000003'));
select tests.check('open request visible without the street address',
  (select is_open and location_address is null and area = '台北市大安區' and recipient_name = '二長輩'
     from public.get_provider_requests() where order_id = 'f0000000-0000-4000-8000-000000000004'));
select public.decline_order('f0000000-0000-4000-8000-000000000004');
select tests.check('dismissed open request disappears for that companion',
  not exists (select 1 from public.get_provider_requests() where order_id = 'f0000000-0000-4000-8000-000000000004'));
commit;

begin;
select tests.login(:S2); set local role authenticated;
select tests.check('family told about the decline', exists (select 1 from public.notifications where type = 'order_declined'));
insert into public.orders (seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time, location_address, payment_method)
select :S2, :P3, r.id, 'chat', (now() at time zone 'Asia/Taipei')::date + 1, '15:00', '16:00', r.address, 'cash'
from public.kinship_recipients r where r.seeker_id = :S2;
select tests.check('a declined slot can be booked again', true);
commit;

begin;
select tests.login(:P1); set local role authenticated;
select tests.check('open request visible to another companion',
  exists (select 1 from public.get_provider_requests() where order_id = 'f0000000-0000-4000-8000-000000000004'));
select public.accept_order('f0000000-0000-4000-8000-000000000004');
select tests.check('claiming an open request assigns it',
  (select provider_id = 'e0000000-0000-4000-8000-000000000001' and order_status = 'accepted' from public.orders where id = 'f0000000-0000-4000-8000-000000000004'));
commit;

-- ---------------------------------------------------------------------------
-- SOS, notifications, role switching
-- ---------------------------------------------------------------------------
begin;
select tests.login(:S1); set local role authenticated;
insert into public.sos_alerts (user_id, lat, lng, accuracy_m) values (:S1, 25.0375, 121.5509, 12);
select tests.throws('cannot raise SOS for someone else',
  $$insert into public.sos_alerts (user_id, lat, lng) values ('d0000000-0000-4000-8000-000000000002', 25, 121)$$, '42501');
update public.notifications set is_read = true where user_id = :S1;
select tests.check('mark all notifications read', not exists (select 1 from public.notifications where not is_read));
select tests.throws('cannot rewrite notification text', $$update public.notifications set title = 'x'$$, '42501');
update public.profiles set role = 'provider' where id = :S1;
select tests.check('switching role creates provider details', (select count(*) = 1 from public.provider_details));
commit;

begin;
select tests.login(:S2); set local role authenticated;
select tests.check('others cannot see my SOS alerts', (select count(*) = 0 from public.sos_alerts));
select tests.check('others cannot see my notifications', not exists (select 1 from public.notifications where user_id <> 'd0000000-0000-4000-8000-000000000002'));
commit;

-- Anonymous visitors see nothing.
begin;
set local role anon;
select tests.throws('anon cannot read profiles', $$select * from public.profiles$$, '42501');
select tests.throws('anon cannot call RPCs', $$select * from public.search_providers()$$, '42501');
commit;

-- Stale unpaid LINE Pay checkouts release their slot.
update public.orders set created_at = now() - interval '1 hour', payment_status = 'unpaid', order_status = 'pending', provider_id = null,
       linepay_transaction_id = null, payment_method = 'linepay'
 where id = 'f0000000-0000-4000-8000-000000000004';
select tests.check('stale unpaid checkouts are cancelled', private.cancel_stale_unpaid_orders() >= 1);

-- Seed sanity
select tests.check('seed: demo companion has a trip in progress',
  exists (select 1 from public.orders where provider_id = 'b2222222-0000-4000-8000-000000000001' and order_status = 'navigating'));
select tests.check('seed: new ratings fold into the imported average',
  (select review_count = 114 and rating_avg = 4.97 from public.provider_details where provider_id = 'b2222222-0000-4000-8000-000000000003'));

-- ---------------------------------------------------------------------------
\o
select case when ok then '  ✓ ' else '  ✗ ' end || name || case when ok then '' else E'\n      ' || coalesce(detail, '') end as result
from tests.results order by n;

do $$
declare
  v_failed integer := (select count(*) from tests.results where not ok);
  v_total  integer := (select count(*) from tests.results);
begin
  if v_failed > 0 then
    raise exception '% of % database tests failed', v_failed, v_total;
  end if;
  raise notice 'All % database tests passed', v_total;
end;
$$;
