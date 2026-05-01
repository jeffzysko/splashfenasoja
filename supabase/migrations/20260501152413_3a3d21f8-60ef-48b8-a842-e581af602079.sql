-- Drop all old/redundant policies on leads
drop policy if exists "Anyone can insert leads" on public.leads;
drop policy if exists "anon_insert" on public.leads;
drop policy if exists "Admins can view leads" on public.leads;
drop policy if exists "Admins can update leads" on public.leads;
drop policy if exists "Authenticated users can update leads" on public.leads;
drop policy if exists "auth_select" on public.leads;
drop policy if exists "auth_select_all" on public.leads;
drop policy if exists "public_insert" on public.leads;
drop policy if exists "auth_update" on public.leads;
drop policy if exists "auth_delete" on public.leads;

-- Recreate the definitive 4 policies
alter table public.leads enable row level security;

create policy "leads_public_insert" on public.leads
  for insert to anon with check (true);

create policy "leads_authenticated_select" on public.leads
  for select to authenticated using (true);

create policy "leads_authenticated_update" on public.leads
  for update to authenticated using (true);

create policy "leads_authenticated_delete" on public.leads
  for delete to authenticated using (true);
