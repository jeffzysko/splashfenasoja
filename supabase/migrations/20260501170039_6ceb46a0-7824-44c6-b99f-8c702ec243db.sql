alter table public.leads enable row level security;

drop policy if exists "anon_insert" on public.leads;
drop policy if exists "auth_select" on public.leads;
drop policy if exists "auth_select_all" on public.leads;
drop policy if exists "public_insert" on public.leads;
drop policy if exists "auth_update" on public.leads;
drop policy if exists "auth_delete" on public.leads;
drop policy if exists "leads_authenticated_select" on public.leads;
drop policy if exists "leads_authenticated_update" on public.leads;
drop policy if exists "leads_authenticated_delete" on public.leads;
drop policy if exists "leads_public_insert" on public.leads;

create policy "public_insert" on public.leads
  for insert to anon with check (true);

create policy "auth_select_all" on public.leads
  for select to authenticated using (true);

create policy "auth_update" on public.leads
  for update to authenticated using (true);

create policy "auth_delete" on public.leads
  for delete to authenticated using (true);