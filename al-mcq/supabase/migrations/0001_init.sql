-- =====================================================================
-- A/L MCQ Platform — initial schema
-- Paste into Supabase → SQL Editor → New query → Run.
-- =====================================================================

create extension if not exists pgcrypto;

create type user_role     as enum ('student','teacher','admin');
create type answer_choice as enum ('A','B','C','D','E');
create type paper_type    as enum ('past','topic','model','teacher');
create type exam_mode     as enum ('exam','practice');

-- ---------------------------------------------------------------- users
create table profiles (
  id                    uuid primary key references auth.users on delete cascade,
  full_name             text,
  display_name          text,
  avatar_url            text,
  role                  user_role not null default 'student',
  hide_from_leaderboard boolean   not null default false,
  is_suspended          boolean   not null default false,
  created_at            timestamptz default now()
);

-- --------------------------------------------------------------- papers
create table papers (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  subject          text not null check (subject in ('physics','chemistry')),
  year             int,
  paper_type       paper_type not null default 'past',
  description      text,
  duration_minutes int  not null default 60,
  total_questions  int  not null default 50,
  is_published     boolean not null default false,
  created_by       uuid references profiles(id),
  created_at       timestamptz default now()
);
create index on papers (subject, paper_type, is_published);

-- ------------------------------------------------------------ questions
create table questions (
  id                 uuid primary key default gen_random_uuid(),
  paper_id           uuid not null references papers(id) on delete cascade,
  question_number    int  not null,
  question_image_url text not null,
  correct_answer     answer_choice not null,
  topic              text,
  subtopic           text,
  marks              int not null default 1,
  review_text        text,
  review_image_url   text,
  created_at         timestamptz default now(),
  unique (paper_id, question_number)
);
create index on questions (paper_id, question_number);

-- ------------------------------------------------------------- attempts
create table attempts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references profiles(id) on delete cascade,
  paper_id          uuid not null references papers(id) on delete cascade,
  mode              exam_mode not null default 'exam',
  started_at        timestamptz default now(),
  expires_at        timestamptz not null,
  completed_at      timestamptz,
  score             int,
  correct_count     int,
  wrong_count       int,
  unanswered_count  int,
  percentage        numeric(5,2),
  time_taken_seconds int
);
create index on attempts (user_id, completed_at desc);
create index on attempts (paper_id);

create table attempt_answers (
  id                 uuid primary key default gen_random_uuid(),
  attempt_id         uuid not null references attempts(id) on delete cascade,
  question_id        uuid not null references questions(id) on delete cascade,
  selected_answer    answer_choice,
  is_correct         boolean,
  time_spent_seconds int,
  answered_at        timestamptz default now(),
  unique (attempt_id, question_id)
);
create index on attempt_answers (question_id);

-- ----------------------------------------------------------- statistics
create table user_statistics (
  user_id           uuid primary key references profiles(id) on delete cascade,
  total_attempts    int default 0,
  completed_papers  int default 0,
  questions_answered int default 0,
  correct_answers   int default 0,
  wrong_answers     int default 0,
  accuracy          numeric(5,2) default 0,
  total_points      int default 0,
  weekly_points     int default 0,
  monthly_points    int default 0,
  current_streak    int default 0,
  longest_streak    int default 0,
  last_active_date  date,
  updated_at        timestamptz default now()
);

create table leaderboard_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade,
  board_type text not null,            -- all_time | weekly | monthly | accuracy | subject
  subject    text,
  period_key text,                     -- '2026-W12' | '2026-09' | 'all'
  points     int default 0,
  accuracy   numeric(5,2),
  papers_completed int default 0,
  rank       int,
  updated_at timestamptz default now(),
  unique (user_id, board_type, subject, period_key)
);
create index on leaderboard_entries (board_type, period_key, points desc);

-- ------------------------------------------------------------------ ads
create table advertisements (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  image_url   text not null,
  link_url    text,
  placement   text not null,           -- DASHBOARD_PROMO | PAPER_TOP | RESULT_BOTTOM | SIDEBAR
  start_date  date,
  end_date    date,
  is_active   boolean default true,
  priority    int default 0,
  impressions int default 0,
  clicks      int default 0,
  created_at  timestamptz default now()
);

create table app_settings (
  key   text primary key,
  value jsonb not null
);

insert into app_settings (key, value) values
  ('points_correct',          '2'::jsonb),
  ('points_complete_paper',   '10'::jsonb),
  ('points_perfect_bonus',    '25'::jsonb),
  ('accuracy_board_min_papers','5'::jsonb),
  ('leaderboard_name_mode',   '"first_initial"'::jsonb),
  ('leaderboard_show_score',  'true'::jsonb)
on conflict (key) do nothing;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table profiles            enable row level security;
alter table papers              enable row level security;
alter table questions           enable row level security;
alter table attempts            enable row level security;
alter table attempt_answers     enable row level security;
alter table user_statistics     enable row level security;
alter table leaderboard_entries enable row level security;
alter table advertisements      enable row level security;
alter table app_settings        enable row level security;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin','teacher')
  );
$$;

-- profiles
create policy "read own profile"   on profiles for select using (id = auth.uid() or is_staff());
create policy "update own profile" on profiles for update using (id = auth.uid());
create policy "staff manage profiles" on profiles for all using (is_staff());

-- papers: students see published papers only
create policy "read published papers" on papers for select
  using (is_published or is_staff());
create policy "staff write papers" on papers for all using (is_staff());

-- questions: NO student select policy at all.
-- Students reach questions only through server routes using the service-role
-- key, which strip correct_answer before the payload leaves the server.
create policy "staff manage questions" on questions for all using (is_staff());

-- attempts
create policy "own attempts" on attempts for all using (user_id = auth.uid());
create policy "staff read attempts" on attempts for select using (is_staff());

create policy "own answers" on attempt_answers for all using (
  exists (select 1 from attempts a where a.id = attempt_id and a.user_id = auth.uid())
);
create policy "staff read answers" on attempt_answers for select using (is_staff());

-- statistics and leaderboard are publicly readable (they carry no email)
create policy "read stats"       on user_statistics     for select using (true);
create policy "staff write stats" on user_statistics    for all    using (is_staff());
create policy "read leaderboard" on leaderboard_entries for select using (true);
create policy "staff write lb"   on leaderboard_entries for all    using (is_staff());

create policy "read active ads" on advertisements for select
  using (is_active or is_staff());
create policy "staff write ads" on advertisements for all using (is_staff());

create policy "read settings"  on app_settings for select using (true);
create policy "staff settings" on app_settings for all    using (is_staff());

-- =====================================================================
-- Marking + statistics, done in the database so a client can never fake it
-- =====================================================================
create or replace function submit_attempt(p_attempt_id uuid)
returns table (
  score int, correct_count int, wrong_count int,
  unanswered_count int, percentage numeric, time_taken_seconds int
)
language plpgsql security definer set search_path = public as $$
declare
  v_attempt   attempts%rowtype;
  v_total     int;
  v_correct   int;
  v_answered  int;
  v_seconds   int;
  v_points    int;
  v_pts_correct  int := (select (value)::text::int from app_settings where key = 'points_correct');
  v_pts_paper    int := (select (value)::text::int from app_settings where key = 'points_complete_paper');
  v_pts_perfect  int := (select (value)::text::int from app_settings where key = 'points_perfect_bonus');
begin
  select * into v_attempt from attempts where id = p_attempt_id;
  if not found then raise exception 'attempt not found'; end if;
  if v_attempt.completed_at is not null then raise exception 'already submitted'; end if;

  -- grade every stored answer against the authoritative correct_answer
  update attempt_answers aa
     set is_correct = (aa.selected_answer = q.correct_answer)
    from questions q
   where q.id = aa.question_id
     and aa.attempt_id = p_attempt_id;

  select count(*) into v_total from questions where paper_id = v_attempt.paper_id;

  select count(*) filter (where is_correct),
         count(*) filter (where selected_answer is not null)
    into v_correct, v_answered
    from attempt_answers where attempt_id = p_attempt_id;

  v_seconds := greatest(0, extract(epoch from (now() - v_attempt.started_at))::int);

  update attempts set
    completed_at       = now(),
    score              = v_correct,
    correct_count      = v_correct,
    wrong_count        = v_answered - v_correct,
    unanswered_count   = v_total - v_answered,
    percentage         = case when v_total = 0 then 0
                              else round((v_correct::numeric / v_total) * 100, 2) end,
    time_taken_seconds = v_seconds
  where id = p_attempt_id;

  v_points := v_correct * v_pts_correct + v_pts_paper
            + case when v_correct = v_total and v_total > 0 then v_pts_perfect else 0 end;

  insert into user_statistics (user_id) values (v_attempt.user_id)
    on conflict (user_id) do nothing;

  update user_statistics s set
    total_attempts     = s.total_attempts + 1,
    completed_papers   = s.completed_papers + 1,
    questions_answered = s.questions_answered + v_answered,
    correct_answers    = s.correct_answers + v_correct,
    wrong_answers      = s.wrong_answers + (v_answered - v_correct),
    accuracy           = case when (s.questions_answered + v_answered) = 0 then 0
                              else round(((s.correct_answers + v_correct)::numeric
                                   / (s.questions_answered + v_answered)) * 100, 2) end,
    total_points       = s.total_points + v_points,
    weekly_points      = s.weekly_points + v_points,
    monthly_points     = s.monthly_points + v_points,
    current_streak     = case
                           when s.last_active_date = current_date then s.current_streak
                           when s.last_active_date = current_date - 1 then s.current_streak + 1
                           else 1 end,
    longest_streak     = greatest(s.longest_streak,
                           case
                             when s.last_active_date = current_date then s.current_streak
                             when s.last_active_date = current_date - 1 then s.current_streak + 1
                             else 1 end),
    last_active_date   = current_date,
    updated_at         = now()
  where s.user_id = v_attempt.user_id;

  insert into leaderboard_entries (user_id, board_type, subject, period_key, points, accuracy, papers_completed)
  select v_attempt.user_id, 'all_time', null, 'all', s.total_points, s.accuracy, s.completed_papers
    from user_statistics s where s.user_id = v_attempt.user_id
  on conflict (user_id, board_type, subject, period_key) do update
    set points = excluded.points, accuracy = excluded.accuracy,
        papers_completed = excluded.papers_completed, updated_at = now();

  insert into leaderboard_entries (user_id, board_type, subject, period_key, points)
  values (v_attempt.user_id, 'weekly', null, to_char(now(), 'IYYY-"W"IW'), v_points)
  on conflict (user_id, board_type, subject, period_key) do update
    set points = leaderboard_entries.points + excluded.points, updated_at = now();

  insert into leaderboard_entries (user_id, board_type, subject, period_key, points)
  values (v_attempt.user_id, 'monthly', null, to_char(now(), 'YYYY-MM'), v_points)
  on conflict (user_id, board_type, subject, period_key) do update
    set points = leaderboard_entries.points + excluded.points, updated_at = now();

  return query
    select a.score, a.correct_count, a.wrong_count,
           a.unanswered_count, a.percentage, a.time_taken_seconds
      from attempts a where a.id = p_attempt_id;
end;
$$;

-- ---------------------------------------------- analytics helper views
create view question_difficulty as
select q.id, q.paper_id, q.question_number, q.topic, p.subject, p.title as paper_title,
       count(aa.id) filter (where aa.selected_answer is not null) as attempts,
       round(100.0 * count(aa.id) filter (where aa.is_correct)
             / nullif(count(aa.id) filter (where aa.selected_answer is not null), 0), 1) as correct_pct
from questions q
join papers p on p.id = q.paper_id
left join attempt_answers aa on aa.question_id = q.id
group by q.id, q.paper_id, q.question_number, q.topic, p.subject, p.title;

create view topic_performance as
select a.user_id, p.subject, q.topic,
       count(*) as answered,
       count(*) filter (where aa.is_correct) as correct,
       round(100.0 * count(*) filter (where aa.is_correct) / nullif(count(*), 0), 1) as accuracy
from attempt_answers aa
join attempts a on a.id = aa.attempt_id and a.completed_at is not null
join questions q on q.id = aa.question_id
join papers p on p.id = q.paper_id
where q.topic is not null
group by a.user_id, p.subject, q.topic;
