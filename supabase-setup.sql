-- =========================================================================
-- Steward Trainer — table de progression + sécurité
-- À exécuter une seule fois dans Supabase → SQL Editor → New query → Run
-- =========================================================================

-- 1. La table qui stocke la progression (une ligne par utilisateur)
create table if not exists public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. Row Level Security : c'est CE qui protège tes données.
--    Sans ça, la clé publishable permettrait de lire toute la table.
alter table public.progress enable row level security;

-- 3. Chaque utilisateur ne peut voir et modifier QUE sa propre ligne.
drop policy if exists "lire sa progression"     on public.progress;
drop policy if exists "creer sa progression"    on public.progress;
drop policy if exists "modifier sa progression" on public.progress;
drop policy if exists "supprimer sa progression" on public.progress;

create policy "lire sa progression"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "creer sa progression"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "modifier sa progression"
  on public.progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "supprimer sa progression"
  on public.progress for delete
  using (auth.uid() = user_id);
