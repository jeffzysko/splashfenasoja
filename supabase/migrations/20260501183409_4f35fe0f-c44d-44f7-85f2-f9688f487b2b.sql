-- Tabela de preferências de notificação por usuário
create table public.user_notif_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sound_enabled boolean not null default false,
  toast_enabled boolean not null default true,
  notif_quente boolean not null default true,
  notif_morno boolean not null default true,
  notif_frio boolean not null default false,
  sound_quente text not null default 'ding',
  sound_morno text not null default 'ding',
  sound_frio text not null default 'ding',
  quiet_enabled boolean not null default false,
  quiet_start smallint not null default 20,
  quiet_end smallint not null default 8,
  updated_at timestamptz not null default now(),
  constraint user_notif_prefs_quiet_start_chk check (quiet_start between 0 and 23),
  constraint user_notif_prefs_quiet_end_chk check (quiet_end between 0 and 23)
);

alter table public.user_notif_prefs enable row level security;

create policy "Users manage own notif prefs select"
on public.user_notif_prefs for select
to authenticated
using (auth.uid() = user_id);

create policy "Users manage own notif prefs insert"
on public.user_notif_prefs for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users manage own notif prefs update"
on public.user_notif_prefs for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own notif prefs delete"
on public.user_notif_prefs for delete
to authenticated
using (auth.uid() = user_id);

create trigger user_notif_prefs_updated_at
before update on public.user_notif_prefs
for each row
execute function public.handle_updated_at();