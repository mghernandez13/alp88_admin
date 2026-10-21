-- Indexes to keep the bets listing/count queries from hitting the statement timeout.

-- Default listing: completed, non-archived, real bets ordered by newest first.
create index if not exists idx_bets_completed_created_at
  on public.bets (created_at desc)
  where is_archive = false
    and is_dummy_bet = false
    and bet_status = 'completed';

-- Same listing filtered by lotto type / bet type / agent.
create index if not exists idx_bets_completed_lotto_type_created_at
  on public.bets (lotto_type_id, created_at desc)
  where is_archive = false
    and is_dummy_bet = false
    and bet_status = 'completed';

create index if not exists idx_bets_completed_bet_type_created_at
  on public.bets (bet_type_id, created_at desc)
  where is_archive = false
    and is_dummy_bet = false
    and bet_status = 'completed';

create index if not exists idx_bets_completed_agent_created_at
  on public.bets (agent_id, created_at desc)
  where is_archive = false
    and is_dummy_bet = false
    and bet_status = 'completed';

-- Dummy bets listing.
create index if not exists idx_bets_dummy_created_at
  on public.bets (created_at desc)
  where is_archive = false
    and is_dummy_bet = true;

-- Lookups used when resolving the "Added By" profile and generic joins.
create index if not exists idx_bets_created_by on public.bets (created_by);

-- Search by combination / bettor name uses ILIKE '%...%'.
create extension if not exists pg_trgm;

create index if not exists idx_bets_combination_trgm
  on public.bets using gin (combination gin_trgm_ops);

create index if not exists idx_bets_bettor_name_trgm
  on public.bets using gin (bettor_name gin_trgm_ops);

create index if not exists idx_profiles_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);
