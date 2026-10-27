-- ============================================================================
-- Push notifications · tabla de suscripciones
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  author text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_author_idx
  on public.push_subscriptions (author);

alter table public.push_subscriptions enable row level security;

-- La app no usa autenticación: el cliente puede registrar, actualizar y
-- borrar su propia suscripción, pero NO puede leer la lista completa.
-- (Sin cláusula TO → aplica a todos los roles, igual que TO public.)
drop policy if exists "push_subscriptions_insert" on public.push_subscriptions;
create policy "push_subscriptions_insert"
  on public.push_subscriptions
  for insert
  with check (true);

drop policy if exists "push_subscriptions_update" on public.push_subscriptions;
create policy "push_subscriptions_update"
  on public.push_subscriptions
  for update
  using (true)
  with check (true);

drop policy if exists "push_subscriptions_delete" on public.push_subscriptions;
create policy "push_subscriptions_delete"
  on public.push_subscriptions
  for delete
  using (true);
