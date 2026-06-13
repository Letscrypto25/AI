create extension if not exists pgcrypto;

create table if not exists public.buddy_notes (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  clean_title text not null default 'Untitled note',
  summary text not null default '',
  category text not null default 'Random ideas',
  tags text[] not null default '{}',
  source text,
  project text,
  people text[] not null default '{}',
  status text not null default 'active',
  ai_confidence numeric not null default 0,
  linked_note_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buddy_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  idea text not null default '',
  summary text not null default '',
  note_ids uuid[] not null default '{}',
  files jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buddy_command_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  command text not null,
  exit_code integer,
  stdout text not null default '',
  stderr text not null default '',
  blocked boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);

create or replace function public.set_buddy_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists buddy_notes_updated_at on public.buddy_notes;
create trigger buddy_notes_updated_at
before update on public.buddy_notes
for each row execute function public.set_buddy_updated_at();

drop trigger if exists buddy_projects_updated_at on public.buddy_projects;
create trigger buddy_projects_updated_at
before update on public.buddy_projects
for each row execute function public.set_buddy_updated_at();

alter table public.buddy_notes enable row level security;
alter table public.buddy_projects enable row level security;
alter table public.buddy_command_logs enable row level security;

drop policy if exists "service role manages buddy notes" on public.buddy_notes;
create policy "service role manages buddy notes"
on public.buddy_notes
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role manages buddy projects" on public.buddy_projects;
create policy "service role manages buddy projects"
on public.buddy_projects
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "service role manages buddy command logs" on public.buddy_command_logs;
create policy "service role manages buddy command logs"
on public.buddy_command_logs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
