-- Additive, isolated manual winner storage. No original table policies or data change.
-- Prerequisites: the live application's bets.bet_status and lotto_types.logo_image
-- columns (not present in the older April schema dump).
begin;

create table public.dummy_results (
  id uuid primary key default gen_random_uuid(),
  draw_result_id bigint not null references public.draw_results(id) on delete restrict,
  admin text not null,
  bettor_name text not null,
  bet text not null,
  remarks text not null,
  -- Deliberately unconstrained numeric: a typmod would silently round input first.
  prize numeric not null,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dummy_results_admin_check check (
    char_length(admin) between 1 and 200 and admin !~ '^[[:space:]]|[[:space:]]$'
  ),
  constraint dummy_results_bettor_name_check check (
    char_length(bettor_name) between 1 and 200 and bettor_name !~ '^[[:space:]]|[[:space:]]$'
  ),
  constraint dummy_results_bet_check check (
    char_length(bet) between 1 and 200 and bet !~ '^[[:space:]]|[[:space:]]$'
  ),
  constraint dummy_results_remarks_check check (
    char_length(remarks) between 1 and 500 and remarks !~ '^[[:space:]]|[[:space:]]$'
  ),
  constraint dummy_results_prize_check check (
    prize > 0 and prize <= 999999999999.99
    and prize not in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
    and round(prize, 2) = prize
  )
);

create index dummy_results_result_created_id_idx
  on public.dummy_results (draw_result_id, created_at, id);

comment on table public.dummy_results is
  'Shared manually entered display winners only; never used by bet processing or official results.';

create function public.has_dummy_results_permission(p_permission text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and p_permission in (
      'View Dummy Results', 'Add Dummy Results', 'Edit Dummy Results', 'Delete Dummy Results'
    )
    and exists (
      select 1
      from public.profiles as profile
      join public.permissions as role on role.id = profile.permission_id
      where profile.id = auth.uid()
        and profile.status is true and profile.is_archive is false
        and role.is_active is true and role.is_archive is false
        and role.permissions @> array['View Dummy Results', p_permission]::text[]
    );
$$;

-- Bypasses only the original result/lotto SELECT policies, never their write RLS.
-- Also closes the workspace when its source result or draw type is archived.
create function public.is_dummy_results_source_valid(p_result_id bigint)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.has_dummy_results_permission('View Dummy Results')
    and exists (
      select 1
      from public.draw_results as result
      join public.lotto_types as lotto on lotto.id = result.draw_type
      where result.id = p_result_id
        and result.is_archive is false and lotto.is_archive is false
    );
$$;

create function public.protect_dummy_results_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.draw_result_id is distinct from old.draw_result_id
      or new.created_by is distinct from old.created_by
      or new.created_at is distinct from old.created_at then
      raise exception 'Dummy result identity, source, creator and creation time are immutable'
        using errcode = '23514';
    end if;
  else
    new.created_at := statement_timestamp();
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create trigger dummy_results_protect_identity
before insert or update on public.dummy_results
for each row execute function public.protect_dummy_results_identity();

alter table public.dummy_results enable row level security;

create policy dummy_results_select on public.dummy_results
for select to authenticated
using (
  public.has_dummy_results_permission('View Dummy Results')
  and public.is_dummy_results_source_valid(draw_result_id)
);

create policy dummy_results_insert on public.dummy_results
for insert to authenticated
with check (
  public.has_dummy_results_permission('Add Dummy Results')
  and created_by = (select auth.uid())
  and public.is_dummy_results_source_valid(draw_result_id)
);

create policy dummy_results_update on public.dummy_results
for update to authenticated
using (
  public.has_dummy_results_permission('Edit Dummy Results')
  and public.is_dummy_results_source_valid(draw_result_id)
)
with check (
  public.has_dummy_results_permission('Edit Dummy Results')
  and public.is_dummy_results_source_valid(draw_result_id)
);

create policy dummy_results_delete on public.dummy_results
for delete to authenticated
using (
  public.has_dummy_results_permission('Delete Dummy Results')
  and public.is_dummy_results_source_valid(draw_result_id)
);

create function public.get_dummy_results_index(
  p_search text default '',
  p_draw_types bigint[] default '{}',
  p_sort text default 'created_at',
  p_ascending boolean default false,
  p_offset integer default 0,
  p_limit integer default 10
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
  v_total bigint;
  v_draw_types jsonb;
  v_direction text;
begin
  if not public.has_dummy_results_permission('View Dummy Results') then
    raise exception 'View Dummy Results permission required' using errcode = '42501';
  end if;
  if p_offset is null or p_offset < 0 or p_limit is null or p_limit not between 1 and 100 then
    raise exception 'offset must be nonnegative and limit must be between 1 and 100'
      using errcode = '22023';
  end if;
  if p_sort is null or p_sort not in ('draw_date', 'draw_type', 'combination', 'created_at')
    or p_ascending is null then
    raise exception 'Invalid sort column or direction' using errcode = '22023';
  end if;
  if char_length(coalesce(p_search, '')) > 500
    or cardinality(coalesce(p_draw_types, '{}'::bigint[])) > 1000 then
    raise exception 'Search or draw-type filter is too large' using errcode = '22023';
  end if;

  select count(*) into v_total
  from public.draw_results as result
  join public.lotto_types as lotto on lotto.id = result.draw_type
  where result.is_archive is false and lotto.is_archive is false
    and result.combination ilike ('%' || coalesce(p_search, '') || '%')
    and (coalesce(cardinality(p_draw_types), 0) = 0 or result.draw_type = any(p_draw_types));

  v_direction := case when p_ascending then 'ASC' else 'DESC' end;
  -- Only a validated identifier and a fixed direction token enter SQL text.
  execute format($query$
    select coalesce(jsonb_agg(page.payload order by page.ordinal), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'id', result.id, 'draw_date', result.draw_date,
        'draw_type', result.draw_type, 'combination', result.combination,
        'lotto_types', jsonb_build_object(
          'id', lotto.id, 'name', lotto.name, 'game_type', lotto.game_type,
          'logo_image', lotto.logo_image
        )
      ) as payload,
      row_number() over (order by result.%I %s nulls last, result.id desc) as ordinal
      from public.draw_results as result
      join public.lotto_types as lotto on lotto.id = result.draw_type
      where result.is_archive is false and lotto.is_archive is false
        and result.combination ilike ('%%' || coalesce($1, '') || '%%')
        and (coalesce(cardinality($2), 0) = 0 or result.draw_type = any($2))
      order by result.%I %s nulls last, result.id desc
      offset $3 limit $4
    ) as page
  $query$, p_sort, v_direction, p_sort, v_direction)
  into v_rows using p_search, p_draw_types, p_offset, p_limit;

  -- Master filter counts, independent of the active search/selection, matching
  -- the Results page. Includes nonarchived types with zero available results.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', counts.id, 'name', counts.name, 'count', counts.result_count
  ) order by counts.name, counts.id), '[]'::jsonb)
  into v_draw_types
  from (
    select lotto.id, lotto.name, count(result.id) as result_count
    from public.lotto_types as lotto
    left join public.draw_results as result
      on result.draw_type = lotto.id and result.is_archive is false
    where lotto.is_archive is false
    group by lotto.id, lotto.name
  ) as counts;

  return jsonb_build_object('rows', v_rows, 'totalCount', v_total, 'drawTypes', v_draw_types);
end;
$$;

create function public.get_dummy_result_detail(
  p_result_id bigint,
  p_offset integer default 0,
  p_limit integer default 500
)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_result record;
  v_header jsonb;
  v_winners jsonb;
  v_has_more boolean;
  v_context jsonb := null;
  v_numbers text[];
  v_petsada_active boolean;
  v_monthly_active boolean;
  v_is_petsada boolean;
  v_is_monthly boolean;
  v_month text;
  v_days text[];
begin
  if not public.has_dummy_results_permission('View Dummy Results') then
    raise exception 'View Dummy Results permission required' using errcode = '42501';
  end if;
  if p_offset is null or p_offset < 0 or p_limit is null or p_limit not between 1 and 500 then
    raise exception 'offset must be nonnegative and limit must be between 1 and 500'
      using errcode = '22023';
  end if;
  if p_result_id is null or p_result_id <= 0 then
    raise exception 'A positive result id is required' using errcode = '22023';
  end if;

  select result.id, result.draw_date, result.draw_type, result.combination,
    lotto.name, lotto.game_type, lotto.logo_image
  into v_result
  from public.draw_results as result
  join public.lotto_types as lotto on lotto.id = result.draw_type
  where result.id = p_result_id
    and result.is_archive is false and lotto.is_archive is false;

  if not found then
    return jsonb_build_object(
      'result', null, 'winners', '[]'::jsonb, 'hasMore', false, 'twoDSpecialContext', null
    );
  end if;

  v_header := jsonb_build_object(
    'id', v_result.id, 'draw_date', v_result.draw_date,
    'draw_type', v_result.draw_type, 'combination', v_result.combination,
    'lotto_types', jsonb_build_object(
      'id', v_result.draw_type, 'name', v_result.name,
      'game_type', v_result.game_type, 'logo_image', v_result.logo_image
    )
  );

  -- bets.created_at is timestamptz in the actual migration, not the inferred
  -- schema. Official Results export sends timezone-less timestamps to PostgREST,
  -- interpreted in the database/session timezone (normally UTC on Supabase).
  -- Preserve BOTH inclusive boundaries, including the exact .999 upper bound;
  -- do not silently substitute Manila midnight or a next-day exclusive bound.
  with candidates as materialized (
    select bet.id, bet.combination, bet.bet_amount, bet.prize_amount,
      bet.bettor_name, bet.is_super_jackpot, bet.is_return_bet,
      bet.bet_type_id, bet.agent_id
    from public.bets as bet
    where bet.lotto_type_id = v_result.draw_type
      and bet.hit is true and bet.is_dummy_bet is false
      and bet.is_archive is false and bet.bet_status = 'completed'
      and bet.created_at >= v_result.draw_date::timestamp::timestamptz
      and bet.created_at <= (v_result.draw_date + time '23:59:59.999')::timestamptz
    order by bet.id
    offset p_offset limit (p_limit + 1)
  ), page as (
    select * from candidates order by id limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'combination', page.combination, 'bet_amount', page.bet_amount,
    'prize_amount', page.prize_amount, 'bettor_name', page.bettor_name,
    'is_super_jackpot', page.is_super_jackpot, 'is_return_bet', page.is_return_bet,
    'bet_types', case when bet_type.id is not null then
      jsonb_build_object('name', bet_type.name, 'code', bet_type.code) else null end,
    'profiles', case when profile.id is not null then
      jsonb_build_object('full_name', profile.full_name) else null end
  ) order by page.id), '[]'::jsonb),
  (select count(*) > p_limit from candidates)
  into v_winners, v_has_more
  from page
  left join public.bet_types as bet_type on bet_type.id = page.bet_type_id
  left join public.profiles as profile on profile.id = page.agent_id;

  if upper(v_result.game_type) = '2D' and v_result.combination <> '' then
    -- Same trim + leading-zero normalization as splitAndNormalizeNumbers.
    select array_agg(regexp_replace(
      regexp_replace(part.value, '^[[:space:]]+|[[:space:]]+$', '', 'g'),
      '^0+(?=[0-9])', ''
    ) order by part.ordinal)
    into v_numbers
    from unnest(string_to_array(v_result.combination, '-')) with ordinality as part(value, ordinal);

    if cardinality(v_numbers) = 2 then
      -- JS .find uses the first matching setting; id supplies a deterministic
      -- tie-break if a legacy database contains duplicate setting names.
      select coalesce((select setting.value = 'true' from public.settings as setting
        where setting.name = '2d_petsada_prize_is_active' order by setting.id limit 1), false),
        coalesce((select setting.value = 'true' from public.settings as setting
        where setting.name = '2d_monthly_bracket_prize_is_active' order by setting.id limit 1), false)
      into v_petsada_active, v_monthly_active;

      -- Utility anchors at noon +08:00 and extracts Asia/Manila calendar fields;
      -- date arithmetic here is equivalent, including month/year boundaries.
      v_month := extract(month from v_result.draw_date)::integer::text;
      v_days := array[
        extract(day from v_result.draw_date)::integer::text,
        extract(day from (v_result.draw_date - 1))::integer::text,
        extract(day from (v_result.draw_date + 1))::integer::text
      ];
      v_is_petsada := v_petsada_active and v_month = any(v_numbers) and v_numbers && v_days;
      v_is_monthly := not v_is_petsada and v_monthly_active and v_month = any(v_numbers);
      v_context := jsonb_build_object(
        'isPetsada', v_is_petsada, 'isMonthlyBracket', v_is_monthly, 'winningNumbers', v_numbers
      );
    end if;
  end if;

  return jsonb_build_object(
    'result', v_header, 'winners', v_winners,
    'hasMore', v_has_more, 'twoDSpecialContext', v_context
  );
end;
$$;

-- Override Supabase default privileges, including any default service-role grants.
-- No TRUNCATE, REFERENCES, TRIGGER or identity/timestamp UPDATE grant is exposed.
revoke all on table public.dummy_results from public, anon, authenticated, service_role;
grant select, delete on table public.dummy_results to authenticated;
grant insert (id, draw_result_id, admin, bettor_name, bet, remarks, prize, created_by)
  on public.dummy_results to authenticated;
grant update (admin, bettor_name, bet, remarks, prize)
  on public.dummy_results to authenticated;

revoke all on function public.has_dummy_results_permission(text) from public, anon, authenticated, service_role;
revoke all on function public.is_dummy_results_source_valid(bigint) from public, anon, authenticated, service_role;
revoke all on function public.protect_dummy_results_identity() from public, anon, authenticated, service_role;
revoke all on function public.get_dummy_results_index(text, bigint[], text, boolean, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.get_dummy_result_detail(bigint, integer, integer)
  from public, anon, authenticated, service_role;

grant execute on function public.has_dummy_results_permission(text) to authenticated;
grant execute on function public.is_dummy_results_source_valid(bigint) to authenticated;
grant execute on function public.get_dummy_results_index(text, bigint[], text, boolean, integer, integer)
  to authenticated;
grant execute on function public.get_dummy_result_detail(bigint, integer, integer) to authenticated;

comment on function public.get_dummy_results_index(text, bigint[], text, boolean, integer, integer) is
  'Read-only curated nonarchived result index; limits 1..100, master draw-type counts, authoritative Dummy Results authorization.';
comment on function public.get_dummy_result_detail(bigint, integer, integer) is
  'Read-only live canonical winners ordered by bet UUID; limits 1..500, limit+1 hasMore, null result when missing/archived. Offset pages are not a cross-request snapshot.';

commit;