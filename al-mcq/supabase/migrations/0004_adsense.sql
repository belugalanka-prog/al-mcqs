-- =====================================================================
-- Google AdSense: earnings cache + house-ad performance tracking
-- Run after 0001_init.sql.
-- =====================================================================

-- AdSense reports are rate limited and slow, so every report is cached
-- here and re-fetched only when it goes stale.
create table adsense_snapshots (
  report_key  text primary key,        -- 'summary:TODAY' | 'daily:30' | 'pages:28'
  payload     jsonb not null,
  fetched_at  timestamptz not null default now()
);

alter table adsense_snapshots enable row level security;
create policy "staff read adsense" on adsense_snapshots for select using (is_staff());
create policy "staff write adsense" on adsense_snapshots for all using (is_staff());

-- House ads (the ones you sell directly to tuition classes) get their own
-- counters, since AdSense knows nothing about them.
create table ad_events (
  id         uuid primary key default gen_random_uuid(),
  ad_id      uuid references advertisements(id) on delete cascade,
  event_type text not null check (event_type in ('impression','click')),
  placement  text,
  created_at timestamptz default now()
);
create index on ad_events (ad_id, event_type, created_at desc);

alter table ad_events enable row level security;
create policy "staff read ad events" on ad_events for select using (is_staff());

-- Counters are bumped through this function so the client never writes
-- directly to the advertisements table.
create or replace function track_ad_event(p_ad_id uuid, p_type text, p_placement text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_type not in ('impression','click') then
    raise exception 'unknown event type';
  end if;

  insert into ad_events (ad_id, event_type, placement)
  values (p_ad_id, p_type, p_placement);

  if p_type = 'click' then
    update advertisements set clicks = clicks + 1 where id = p_ad_id;
  else
    update advertisements set impressions = impressions + 1 where id = p_ad_id;
  end if;
end;
$$;

-- Which AdSense slot to render at each placement, editable without a deploy.
insert into app_settings (key, value) values
  ('adsense_enabled',        'true'::jsonb),
  ('adsense_slot_dashboard', '""'::jsonb),
  ('adsense_slot_paper_top', '""'::jsonb),
  ('adsense_slot_result',    '""'::jsonb),
  ('adsense_slot_sidebar',   '""'::jsonb)
on conflict (key) do nothing;

-- House-ad performance, ready for the admin table.
create view house_ad_performance as
select a.id, a.title, a.placement, a.is_active,
       count(*) filter (where e.event_type = 'impression') as impressions,
       count(*) filter (where e.event_type = 'click')      as clicks,
       round(100.0 * count(*) filter (where e.event_type = 'click')
             / nullif(count(*) filter (where e.event_type = 'impression'), 0), 2) as ctr,
       count(*) filter (where e.event_type = 'impression'
                        and e.created_at > now() - interval '7 days') as impressions_7d,
       count(*) filter (where e.event_type = 'click'
                        and e.created_at > now() - interval '7 days') as clicks_7d
from advertisements a
left join ad_events e on e.ad_id = a.id
group by a.id, a.title, a.placement, a.is_active;
