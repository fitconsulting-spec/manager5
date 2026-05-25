-- ============================================================
-- Manager5 — Supabase スキーマ定義
-- Supabase の SQL Editor にそのまま貼り付けて実行してください
-- ============================================================

-- ── 拡張機能 ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 既存テーブルの削除（再実行時用・順序注意） ──────────────
drop table if exists public.reflections      cascade;
drop table if exists public.habit_logs       cascade;
drop table if exists public.user_habits      cascade;
drop table if exists public.habits           cascade;
drop table if exists public.user_scenarios   cascade;
drop table if exists public.scenarios        cascade;
drop table if exists public.users            cascade;

-- ============================================================
-- 1. users — ユーザー情報
-- ============================================================
create table public.users (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  role          text        not null default '',
  avatar        text        not null default '',   -- 表示用の1文字
  color         text        not null default '#6366F1',  -- HEXカラー
  weakness      text        not null default '',   -- 課題メモ
  streak_count  int         not null default 0,    -- 連続チェック日数
  last_checked_date date,                          -- 最後にチェックした日
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table  public.users is 'Manager5 の学習者（ユーザー）';
comment on column public.users.avatar        is '名前の頭文字など1文字';
comment on column public.users.streak_count  is '連続習慣チェック日数';

-- updated_at を自動更新するトリガー
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();


-- ============================================================
-- 2. scenarios — シナリオマスター
-- ============================================================
create table public.scenarios (
  id            int         primary key generated always as identity,
  tag           text        not null,              -- カテゴリタグ（例: "部下育成"）
  time_estimate text        not null,              -- 所要時間の目安（例: "3分"）
  title         text        not null,
  difficulty    text        not null check (difficulty in ('基礎', '応用', '上級')),
  situation     text        not null,              -- 場面の説明文
  choices       jsonb       not null default '[]', -- [{id, text}, ...]
  best_choice   text        not null,              -- 正解の選択肢ID（"a"〜"d"）
  explanations  jsonb       not null default '{}', -- {a: {label, text}, ...}
  point         text        not null default '',   -- 学習ポイントまとめ
  created_at    timestamptz not null default now()
);

comment on table  public.scenarios is 'シナリオ学習のマスターデータ';
comment on column public.scenarios.choices      is '[{id: string, text: string}]';
comment on column public.scenarios.explanations is '{choiceId: {label: string, text: string}}';


-- ============================================================
-- 3. user_scenarios — ユーザーへのシナリオ割り当て & 進捗
-- ============================================================
create table public.user_scenarios (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  scenario_id  int         not null references public.scenarios(id) on delete cascade,
  completed    boolean     not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, scenario_id)  -- 同じシナリオを重複割り当て禁止
);

comment on table public.user_scenarios is 'ユーザーへのシナリオ割り当てと完了状態';

create index idx_user_scenarios_user    on public.user_scenarios(user_id);
create index idx_user_scenarios_scenario on public.user_scenarios(scenario_id);


-- ============================================================
-- 4. habits — 習慣マスター（日次・週次）
-- ============================================================
create table public.habits (
  id         text        primary key,              -- "listen", "oneon1" など
  icon       text        not null,
  label      text        not null,
  category   text        not null,
  type       text        not null check (type in ('daily', 'weekly')),
  created_at timestamptz not null default now()
);

comment on table  public.habits is '習慣チェックのマスターデータ（日次・週次）';
comment on column public.habits.type is 'daily = 日次, weekly = 週次';


-- ============================================================
-- 5. user_habits — ユーザーへの習慣割り当て（カスタム習慣含む）
-- ============================================================
create table public.user_habits (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  habit_id   text        references public.habits(id) on delete set null, -- マスター習慣のID（カスタムはNULL）
  -- カスタム習慣フィールド（is_custom=true の場合に使用）
  icon       text,
  label      text,
  category   text,
  type       text        not null check (type in ('daily', 'weekly')),
  is_custom  boolean     not null default false,
  sort_order int         not null default 0,
  created_at timestamptz not null default now(),
  -- マスター習慣 or カスタムのどちらかが必ず設定されていること
  constraint chk_habit_source check (
    (is_custom = false and habit_id is not null) or
    (is_custom = true  and label   is not null)
  )
);

comment on table  public.user_habits is 'ユーザーへの習慣割り当て。カスタム習慣も同テーブルで管理';
comment on column public.user_habits.habit_id  is 'マスター習慣のFK。カスタム習慣の場合はNULL';
comment on column public.user_habits.is_custom is 'true = 管理者が追加したカスタム習慣';

create index idx_user_habits_user  on public.user_habits(user_id);
create index idx_user_habits_habit on public.user_habits(habit_id);


-- ============================================================
-- 6. habit_logs — 習慣チェック記録
-- ============================================================
create table public.habit_logs (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users(id) on delete cascade,
  user_habit_id  uuid        not null references public.user_habits(id) on delete cascade,
  log_date       date        not null,             -- 日次チェックの対象日
  week_key       text,                             -- 週次の場合: "2024-W21" 形式
  created_at     timestamptz not null default now(),
  unique (user_habit_id, log_date)                 -- 1日1回のみ記録
);

comment on table  public.habit_logs is '習慣チェックの実績ログ（1行 = 1チェック）';
comment on column public.habit_logs.log_date  is '日次チェックの対象日付';
comment on column public.habit_logs.week_key  is '週次チェック用 "YYYY-WN" 形式（例: "2024-W21"）';

create index idx_habit_logs_user      on public.habit_logs(user_id);
create index idx_habit_logs_habit     on public.habit_logs(user_habit_id);
create index idx_habit_logs_date      on public.habit_logs(log_date);


-- ============================================================
-- 7. reflections — 振り返り記録
-- ============================================================
create table public.reflections (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  text          text        not null,
  mood          int         not null check (mood between 1 and 5),  -- 1=😞 … 5=😄
  tags          text[]      not null default '{}', -- スキルタグ配列
  reflected_at  date        not null default current_date,
  created_at    timestamptz not null default now()
);

comment on table  public.reflections is '学習者の振り返り記録';
comment on column public.reflections.mood is '1=最悪〜5=最高の気分スコア';
comment on column public.reflections.tags is '例: ["フィードバック", "傾聴"]';

create index idx_reflections_user on public.reflections(user_id);
create index idx_reflections_date on public.reflections(reflected_at);


-- ============================================================
-- Row Level Security (RLS)
-- 現段階では無効。Supabase Auth 導入後に有効化してください。
-- ============================================================
alter table public.users           enable row level security;
alter table public.scenarios       enable row level security;
alter table public.user_scenarios  enable row level security;
alter table public.habits          enable row level security;
alter table public.user_habits     enable row level security;
alter table public.habit_logs      enable row level security;
alter table public.reflections     enable row level security;

-- 開発用: 全操作を許可（本番前に削除し、適切なポリシーに差し替えること）
create policy "dev_allow_all_users"          on public.users          for all using (true) with check (true);
create policy "dev_allow_all_scenarios"      on public.scenarios      for all using (true) with check (true);
create policy "dev_allow_all_user_scenarios" on public.user_scenarios for all using (true) with check (true);
create policy "dev_allow_all_habits"         on public.habits         for all using (true) with check (true);
create policy "dev_allow_all_user_habits"    on public.user_habits    for all using (true) with check (true);
create policy "dev_allow_all_habit_logs"     on public.habit_logs     for all using (true) with check (true);
create policy "dev_allow_all_reflections"    on public.reflections    for all using (true) with check (true);
