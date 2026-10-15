-- =============================================================================
--  銀髮伴 SilverCompanion — local development seed
--  Runs after the migrations on `supabase db reset`. Never run in production.
--
--  Demo accounts (password for all: SilverDemo#2026)
--    家屬  yijun@silvercompanion.test     陳怡君（照顧 陳媽媽、陳爸爸）
--    陪伴  xiaojun@silvercompanion.test   林小君（已審核、上線中）
--  Dates are relative to the day the seed runs, so the demo always has a trip
--  in progress, upcoming visits and recent care logs.
-- =============================================================================

do $seed$
declare
  v_today   date := (now() at time zone 'Asia/Taipei')::date;
  v_hour    integer := least(extract(hour from (now() at time zone 'Asia/Taipei'))::integer + 1, 21);
  v_pw      text := extensions.crypt('SilverDemo#2026', extensions.gen_salt('bf'));
  u         record;
  r_mom     bigint;
  r_dad     bigint;
  r_meiling bigint;
  r_grandma bigint;
  o_now     uuid := 'c3333333-0000-4000-8000-000000000001';
  o_next    uuid := 'c3333333-0000-4000-8000-000000000002';
  o_done1   uuid := 'c3333333-0000-4000-8000-000000000003';
  o_done2   uuid := 'c3333333-0000-4000-8000-000000000004';
  o_done3   uuid := 'c3333333-0000-4000-8000-000000000005';
  o_cancel  uuid := 'c3333333-0000-4000-8000-000000000006';
  o_req1    uuid := 'c3333333-0000-4000-8000-000000000007';
  o_open1   uuid := 'c3333333-0000-4000-8000-000000000008';
  o_req2    uuid := 'c3333333-0000-4000-8000-000000000009';
begin
  -- ---------------------------------------------------------------- accounts
  for u in
    select * from (values
      ('a1111111-0000-4000-8000-000000000001'::uuid, 'yijun@silvercompanion.test',    '陳怡君', '怡君',   '0912345678', 'seeker'),
      ('a1111111-0000-4000-8000-000000000002'::uuid, 'meiling@silvercompanion.test',  '王美玲', '美玲',   '0933456789', 'seeker'),
      ('a1111111-0000-4000-8000-000000000003'::uuid, 'wenhua@silvercompanion.test',   '張文華', '文華',   '0955123987', 'seeker'),
      ('b2222222-0000-4000-8000-000000000001'::uuid, 'xiaojun@silvercompanion.test',  '林小君', '小君',   '0987654321', 'provider'),
      ('b2222222-0000-4000-8000-000000000002'::uuid, 'ahong@silvercompanion.test',    '王建宏', '阿宏',   '0920111333', 'provider'),
      ('b2222222-0000-4000-8000-000000000003'::uuid, 'yating@silvercompanion.test',   '張雅婷', '雅婷',   '0921222444', 'provider'),
      ('b2222222-0000-4000-8000-000000000004'::uuid, 'zhihao@silvercompanion.test',   '黃志豪', '志豪',   '0922333555', 'provider'),
      ('b2222222-0000-4000-8000-000000000005'::uuid, 'shufen@silvercompanion.test',   '李淑芬', '淑芬老師', '0923444666', 'provider'),
      ('b2222222-0000-4000-8000-000000000006'::uuid, 'xiaowu@silvercompanion.test',   '吳承恩', '小吳',   '0924555777', 'provider'),
      ('b2222222-0000-4000-8000-000000000007'::uuid, 'peishan@silvercompanion.test',  '蔡佩珊', '佩珊',   '0925666888', 'provider'),
      ('b2222222-0000-4000-8000-000000000008'::uuid, 'mingde@silvercompanion.test',   '鄭明德', '明德大哥', '0926777999', 'provider'),
      ('b2222222-0000-4000-8000-000000000009'::uuid, 'jingyi@silvercompanion.test',   '許靜宜', '靜宜',   '0927888000', 'provider'),
      ('b2222222-0000-4000-8000-000000000010'::uuid, 'ajie@silvercompanion.test',     '劉文傑', '阿傑',   '0928999111', 'provider')
    ) as t(id, email, full_name, nickname, phone, role)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, v_pw, now(),
            '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', u.full_name),
            now() - interval '200 days', now(), '', '', '', '')
    on conflict (id) do nothing;

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now())
    on conflict (provider_id, provider) do nothing;

    insert into public.profiles (id, role, full_name, nickname, phone, created_at)
    values (u.id, u.role, u.full_name, u.nickname, u.phone, now() - interval '200 days')
    on conflict (id) do nothing;
  end loop;

  update public.profiles
     set emergency_contact_name = '陳志明（哥哥）', emergency_contact_phone = '0922111222'
   where id = 'a1111111-0000-4000-8000-000000000001';

  -- ------------------------------------------------------- companion profiles
  update public.provider_details d
     set bio = s.bio, hourly_rate = s.rate, service_types = s.services, tags = s.tags,
         city = s.city, districts = s.districts, offers_online = s.online,
         youtube_video_id = s.video, is_verified = true, service_switch_is_online = true,
         completed_orders = s.done, rating_avg = s.rating, review_count = s.reviews
    from (values
      ('b2222222-0000-4000-8000-000000000001'::uuid, 400, array['chat','medical','walk','read'],
       array['護理系畢業','會講台語','CPR 證照'], '台北市', array['大安區','信義區','中正區'], false, 'aqz-KE-bpKQ', 126,
       '護理系畢業，在醫院病房工作過三年。我相信陪伴不只是照顧身體，更是讓長輩覺得自己被好好聽見。陪診時我會幫忙記下醫囑、整理藥袋，回家後再仔細跟家屬報告。', 4.92, 79),
      ('b2222222-0000-4000-8000-000000000002'::uuid, 300, array['tech','walk','chat'],
       array['手機教學達人','耐心十足','會講台語'], '台北市', array['中山區','松山區','大同區'], true, null, 61,
       '在通訊行工作八年，最喜歡看到長輩第一次用 LINE 視訊打給孫子時的笑容。教學會準備放大字體的步驟小卡，下次忘記也能自己看。', 4.88, 54),
      ('b2222222-0000-4000-8000-000000000003'::uuid, 450, array['medical','chat','clean'],
       array['照服員證照','陪診經驗豐富','會講客語'], '新北市', array['板橋區','中和區','永和區'], false, null, 152,
       '照顧服務員資歷十年，熟悉雙和、亞東醫院的看診動線。陪診時會主動向醫師說明近況，回家後幫忙分裝一週藥盒。', 4.97, 113),
      ('b2222222-0000-4000-8000-000000000004'::uuid, 250, array['walk','read','chat'],
       array['大學生','體育系','會下象棋'], '台北市', array['文山區','大安區'], false, null, 23,
       '體育系大三，喜歡陪爺爺奶奶到公園散步、下象棋。力氣大、腳步穩，上下樓梯可以放心交給我。', 4.7, 18),
      ('b2222222-0000-4000-8000-000000000005'::uuid, 500, array['chat','read','custom'],
       array['退休國小老師','會講台語','書法'], '台北市', array['士林區','北投區'], true, null, 188,
       '教了三十年書，退休後最喜歡的事就是陪長輩讀報、寫書法、聊聊從前。說話慢、聲音清楚，重聽的長輩也聽得懂。', 4.99, 167),
      ('b2222222-0000-4000-8000-000000000006'::uuid, 350, array['tech','chat'],
       array['資訊工程背景','視訊教學','一對一講義'], '新北市', array['新店區','永和區'], true, null, 41,
       '軟體工程師，週末兼職陪伴。可以到府或用視訊教手機、平板、叫車與網路掛號，每次都會留下一張圖解小講義。', 4.82, 33),
      ('b2222222-0000-4000-8000-000000000007'::uuid, 400, array['medical','walk','clean'],
       array['社工系','失智症照護訓練','會說日文'], '台北市', array['信義區','南港區','內湖區'], false, null, 74,
       '社工系畢業，受過失智症照護訓練。陪伴時會配合長輩的步調，用懷舊照片和老歌幫助回憶，讓每一次見面都更安心。', 4.91, 61),
      ('b2222222-0000-4000-8000-000000000008'::uuid, 550, array['medical','walk','custom'],
       array['退役消防員','EMT-1','可協助輪椅'], '桃園市', array['桃園區','中壢區','八德區'], false, null, 49,
       '退役消防員，具 EMT-1 救護技術員資格。協助輪椅上下車、復健散步都很熟練，緊急狀況處理經驗豐富。', 4.93, 41),
      ('b2222222-0000-4000-8000-000000000009'::uuid, 350, array['chat','read','tech'],
       array['心理系','傾聽練習','會講粵語'], '台中市', array['西屯區','南屯區','北屯區'], true, null, 32,
       '心理系研究生，專長是傾聽。很多時候長輩需要的不是建議，而是有人願意聽完他的故事。也可以視訊陪聊。', 4.86, 27),
      ('b2222222-0000-4000-8000-000000000010'::uuid, 300, array['walk','clean','chat'],
       array['居家整理','力氣大','會講台語'], '高雄市', array['苓雅區','前鎮區','鳳山區'], false, null, 37,
       '做過搬家與居家整理，衣櫃換季、雜物分類、陪長輩去市場買菜都沒問題。一起整理家裡，也一起聊天。', 4.78, 30)
    ) as s(id, rate, services, tags, city, districts, online, video, done, bio, rating, reviews)
   where d.provider_id = s.id;

  -- 14 days of opening hours, each companion with their own rhythm
  update public.provider_details d
     set availability_slots = coalesce((
           select jsonb_object_agg(to_char(day, 'YYYY-MM-DD'), (
                    select jsonb_agg(lpad(h::text, 2, '0') || ':00' order by h) from unnest(s.hours) h))
           from generate_series(v_today, v_today + 13, interval '1 day') as day
           where extract(isodow from day)::integer <> all (s.days_off)
         ), '{}'::jsonb)
    from (values
      ('b2222222-0000-4000-8000-000000000001'::uuid, array[8,9,10,11,13,14,15,16,17,18,19,20,21], array[7]),
      ('b2222222-0000-4000-8000-000000000002'::uuid, array[10,11,12,13,14,15,16,17], array[1]),
      ('b2222222-0000-4000-8000-000000000003'::uuid, array[7,8,9,10,11,12,13,14,15,16], array[6,7]),
      ('b2222222-0000-4000-8000-000000000004'::uuid, array[16,17,18,19,20], array[3]),
      ('b2222222-0000-4000-8000-000000000005'::uuid, array[9,10,11,14,15,16], array[6,7]),
      ('b2222222-0000-4000-8000-000000000006'::uuid, array[19,20,21,22], array[]::integer[]),
      ('b2222222-0000-4000-8000-000000000007'::uuid, array[8,9,10,11,12,13,14,15,16,17], array[2]),
      ('b2222222-0000-4000-8000-000000000008'::uuid, array[6,7,8,9,10,11,12,13,14], array[5]),
      ('b2222222-0000-4000-8000-000000000009'::uuid, array[13,14,15,16,17,18,19,20,21,22,23], array[1,2]),
      ('b2222222-0000-4000-8000-000000000010'::uuid, array[8,9,10,11,12,13,14,15,16,17], array[7])
    ) as s(id, hours, days_off)
   where d.provider_id = s.id;

  update public.provider_details
     set bank_code = '822', bank_account = '123456789012', available_balance = 12450,
         last_withdraw_month = to_char(v_today - interval '1 month', 'YYYY-MM')
   where provider_id = 'b2222222-0000-4000-8000-000000000001';

  insert into public.withdrawals (provider_id, amount, month, bank_code, bank_account, account_name, status, created_at, processed_at)
  values
    ('b2222222-0000-4000-8000-000000000001', 18620, to_char(v_today - interval '1 month', 'YYYY-MM'), '822', '123456789012', '林小君', 'paid', now() - interval '25 days', now() - interval '22 days'),
    ('b2222222-0000-4000-8000-000000000001', 15980, to_char(v_today - interval '2 months', 'YYYY-MM'), '822', '123456789012', '林小君', 'paid', now() - interval '55 days', now() - interval '52 days')
  on conflict do nothing;

  -- --------------------------------------------------------------- the elders
  insert into public.kinship_recipients (seeker_id, name, nickname, age, mobility, chronic_diseases, notes, address, lat, lng)
  values ('a1111111-0000-4000-8000-000000000001', '林秀英', '陳媽媽', 78, '需攙扶', array['高血壓','輕微失智'],
          '右耳重聽，說話請靠左側、放慢速度。喜歡聽鄧麗君的老歌，聊到台南老家會特別開心。',
          '台北市大安區仁愛路四段 300 巷 12 號 3 樓', 25.0375, 121.5509)
  returning id into r_mom;

  insert into public.kinship_recipients (seeker_id, name, nickname, age, mobility, chronic_diseases, notes, address, lat, lng)
  values ('a1111111-0000-4000-8000-000000000001', '陳國雄', '陳爸爸', 82, '需輪椅', array['糖尿病','關節退化'],
          '每天下午三點量血糖，飯後要提醒吃藥。喜歡下象棋、看棒球轉播。',
          '台北市大安區仁愛路四段 300 巷 12 號 3 樓', 25.0375, 121.5509)
  returning id into r_dad;

  insert into public.kinship_recipients (seeker_id, name, nickname, age, mobility, chronic_diseases, notes, address, lat, lng)
  values ('a1111111-0000-4000-8000-000000000002', '王李月娥', '王奶奶', 86, '可自理', array['重聽'],
          '獨居，喜歡有人陪她去市場。', '台北市信義區松仁路 100 號', 25.0330, 121.5680)
  returning id into r_meiling;

  insert into public.kinship_recipients (seeker_id, name, nickname, age, mobility, chronic_diseases, notes, address, lat, lng)
  values ('a1111111-0000-4000-8000-000000000003', '黃阿嬌', '黃阿嬤', 85, '需輪椅', array['心臟病','高血壓'],
          '需輪椅，計程車需預約無障礙車。', '台北市中正區羅斯福路一段 50 號', 25.0310, 121.5180)
  returning id into r_grandma;

  -- ------------------------------------------------------------ health data
  insert into public.health_logs (seeker_id, recipient_id, bp_high, bp_low, heart_rate, temperature, steps, weight, source, recorded_at)
  select 'a1111111-0000-4000-8000-000000000001', r_mom,
         122 + (random() * 14)::integer, 76 + (random() * 9)::integer, 68 + (random() * 10)::integer,
         round((36.3 + random() * 0.5)::numeric, 1), 2400 + (random() * 2600)::integer,
         round((52 + random() * 0.8)::numeric, 1),
         case when d % 3 = 0 then 'device' else 'manual' end,
         ((v_today - d) + time '08:30') at time zone 'Asia/Taipei'
  from generate_series(0, 13) as d;

  -- ---------------------------------------------------------------- orders
  -- happening now: 小君 is on her way to 陳媽媽 (paid with LINE Pay)
  insert into public.orders (id, seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time,
                             location_address, location_lat, location_lng, notes, hourly_rate, total_amount, platform_fee, provider_earning,
                             payment_method, payment_status, linepay_transaction_id, order_status, paid_at, accepted_at, navigation_started_at, created_at)
  values (o_now, 'a1111111-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-000000000001', r_mom, 'medical',
          v_today, make_time(v_hour, 0, 0), ((v_hour + 3)::text || ':00')::time,
          '台北市大安區仁愛路四段 300 巷 12 號 3 樓', 25.0375, 121.5509,
          '台大醫院神經內科回診，掛號單在客廳桌上的藍色資料夾。', 0, 0, 0, 0,
          'linepay', 'paid', '2026101400000000001', 'navigating', now() - interval '3 days', now() - interval '3 days', now() - interval '6 minutes', now() - interval '3 days');

  insert into public.orders (id, seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time,
                             location_address, location_lat, location_lng, notes, hourly_rate, total_amount, platform_fee, provider_earning,
                             payment_method, payment_status, order_status, accepted_at, created_at)
  values (o_next, 'a1111111-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-000000000001', r_dad, 'walk',
          v_today + 3, '09:00', '11:00', '台北市大安區仁愛路四段 300 巷 12 號 3 樓', 25.0375, 121.5509,
          '陳爸爸坐輪椅，想去大安森林公園曬太陽。', 0, 0, 0, 0, 'cash', 'unpaid', 'accepted', now() - interval '1 day', now() - interval '2 days');

  insert into public.orders (id, seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time,
                             location_address, location_lat, location_lng, hourly_rate, total_amount, platform_fee, provider_earning,
                             payment_method, payment_status, order_status, paid_at, accepted_at, navigation_started_at, arrived_at, completed_at, created_at)
  values
    (o_done1, 'a1111111-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-000000000003', r_mom, 'chat',
     v_today - 2, '14:00', '17:00', '台北市大安區仁愛路四段 300 巷 12 號 3 樓', 25.0375, 121.5509, 0, 0, 0, 0,
     'linepay', 'paid', 'completed', now() - interval '5 days', now() - interval '5 days', now() - interval '2 days 3 hours',
     now() - interval '2 days 2 hours 40 minutes', now() - interval '2 days', now() - interval '6 days'),
    (o_done2, 'a1111111-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-000000000001', r_mom, 'medical',
     v_today - 5, '08:00', '12:00', '台北市大安區仁愛路四段 300 巷 12 號 3 樓', 25.0375, 121.5509, 0, 0, 0, 0,
     'linepay', 'paid', 'completed', now() - interval '8 days', now() - interval '8 days', now() - interval '5 days 4 hours',
     now() - interval '5 days 3 hours 45 minutes', now() - interval '5 days', now() - interval '9 days'),
    (o_done3, 'a1111111-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-000000000002', r_dad, 'tech',
     v_today - 9, '15:00', '17:00', '台北市大安區仁愛路四段 300 巷 12 號 3 樓', 25.0375, 121.5509, 0, 0, 0, 0,
     'cash', 'paid', 'completed', now() - interval '9 days', now() - interval '11 days', now() - interval '9 days 2 hours',
     now() - interval '9 days 1 hour 50 minutes', now() - interval '9 days', now() - interval '12 days');

  insert into public.orders (id, seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time,
                             location_address, location_lat, location_lng, hourly_rate, total_amount, platform_fee, provider_earning,
                             payment_method, payment_status, order_status, cancelled_at, cancelled_by, cancel_reason, created_at)
  values (o_cancel, 'a1111111-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-000000000004', r_dad, 'walk',
          v_today - 4, '16:00', '18:00', '台北市大安區仁愛路四段 300 巷 12 號 3 樓', 25.0375, 121.5509, 0, 0, 0, 0,
          'cash', 'unpaid', 'cancelled', now() - interval '6 days', 'a1111111-0000-4000-8000-000000000001', '當天下雨，改期再約。', now() - interval '7 days');

  -- requests waiting in 小君's request hall
  insert into public.orders (id, seeker_id, provider_id, recipient_id, service_type, service_date, start_time, end_time,
                             location_address, location_lat, location_lng, notes, hourly_rate, total_amount, platform_fee, provider_earning,
                             payment_method, payment_status, order_status, paid_at, created_at)
  values
    (o_req1, 'a1111111-0000-4000-8000-000000000002', 'b2222222-0000-4000-8000-000000000001', r_meiling, 'chat',
     v_today + 1, '15:00', '17:00', '台北市信義區松仁路 100 號', 25.0330, 121.5680,
     '奶奶獨居，平常很少出門，想找人陪她聊聊天、一起看老照片。', 0, 0, 0, 0, 'cash', 'unpaid', 'pending', null, now() - interval '40 minutes'),
    (o_req2, 'a1111111-0000-4000-8000-000000000002', 'b2222222-0000-4000-8000-000000000001', r_meiling, 'walk',
     v_today + 5, '09:00', '11:00', '台北市信義區松仁路 100 號', 25.0330, 121.5680,
     '想去象山步道入口附近走走，奶奶走路還算穩。', 0, 0, 0, 0, 'linepay', 'paid', 'pending', now() - interval '2 hours', now() - interval '2 hours'),
    (o_open1, 'a1111111-0000-4000-8000-000000000003', null, r_grandma, 'medical',
     v_today + 2, '08:00', '12:00', '台北市中正區羅斯福路一段 50 號', 25.0310, 121.5180,
     '需輪椅！台大醫院心臟內科回診，需協助推輪椅與批價領藥。', 400, 0, 0, 0, 'linepay', 'paid', 'pending', now() - interval '1 hour', now() - interval '1 hour');

  -- ------------------------------------------------------------- care logs
  insert into public.care_logs (order_id, mood, message, created_at) values
    (o_done1, 'happy',
     '今天陪陳媽媽聊了好多年輕時在台南的故事，她說最懷念外婆做的碗粿。我們一起聽了〈月亮代表我的心〉，媽媽跟著哼了兩段，心情很好！午餐吃了半碗飯和青菜，飯後量血壓 126/80。',
     now() - interval '2 days'),
    (o_done2, 'neutral',
     '今天陪同至台大醫院神經內科回診。醫師表示記憶狀況穩定，藥量維持不變，下次回診 11/20 上午 9:30。候診約一小時，媽媽有點累，回程在車上小睡了一下。藥袋已放在客廳桌上，早晚各一包，已用便條紙標示。',
     now() - interval '5 days'),
    (o_done3, 'happy',
     '教陳爸爸用 LINE 視訊打給孫子！練習了三次，已經能自己按綠色的視訊按鈕。也幫他把字體調大、把常用聯絡人放到桌面。他說下週想學怎麼傳照片給家人。',
     now() - interval '9 days');

  update public.care_logs set seeker_rating = 5, seeker_tags = array['態度親切','細心耐心','長輩很開心'],
         seeker_comment = '雅婷很有耐心，媽媽一直說下次還要找她！'
   where order_id = o_done1;
  update public.care_logs set seeker_rating = 5, seeker_tags = array['準時抵達','溝通順暢','專業可靠'],
         seeker_comment = '阿宏教得很清楚，爸爸現在每天都主動視訊。'
   where order_id = o_done3;

  -- ------------------------------------------------------------- messages
  insert into public.messages (sender_id, receiver_id, content, is_read, created_at) values
    ('a1111111-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-000000000001', '小君妳好，今天陪我媽媽去台大醫院回診，掛號單我放在客廳桌上的藍色資料夾裡。', true, now() - interval '1 day 2 hours'),
    ('b2222222-0000-4000-8000-000000000001', 'a1111111-0000-4000-8000-000000000001', '好的收到！我會提早十分鐘到，也會幫阿姨帶保溫杯 😊', true, now() - interval '1 day 1 hour'),
    ('a1111111-0000-4000-8000-000000000001', 'b2222222-0000-4000-8000-000000000001', '謝謝妳，媽媽最近膝蓋比較不舒服，走路要慢一點。', true, now() - interval '1 day 50 minutes'),
    ('b2222222-0000-4000-8000-000000000001', 'a1111111-0000-4000-8000-000000000001', '了解，我會全程攙扶，看完診也會把醫生的叮嚀整理給您。', true, now() - interval '1 day 40 minutes'),
    ('b2222222-0000-4000-8000-000000000001', 'a1111111-0000-4000-8000-000000000001', '我出發囉，大概 20 分鐘後到！', false, now() - interval '6 minutes');

  insert into public.notifications (user_id, type, title, body, created_at) values
    ('b2222222-0000-4000-8000-000000000001', 'system', '記得更新下週的可預約時段', '保持時段最新，家屬才能順利預約到您。', now() - interval '1 day');
end;
$seed$;
