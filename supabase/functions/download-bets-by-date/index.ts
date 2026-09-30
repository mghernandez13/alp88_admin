// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 1000;

type RequestBody = {
  date?: string;
};

type BetRow = {
  id: number | string;
  combination: string | null;
  bet_amount: number | null;
  created_at: string | null;
  bettor_name: string | null;
  agent_id: string | null;
  created_by: string | null;
  lotto_types?: {
    name?: string | null;
  } | null;
  bet_types?: {
    code?: string | null;
  } | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

const isValidDateString = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const displayName = (profile?: ProfileRow | null) => {
  if (!profile) return "-";
  if (profile.full_name && profile.full_name.trim() !== "") {
    return profile.full_name;
  }

  const first = profile.first_name?.trim() ?? "";
  const last = profile.last_name?.trim() ?? "";
  const combined = `${first} ${last}`.trim();

  return combined || "-";
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { date } = (await req.json()) as RequestBody;

    if (!date) {
      return new Response(JSON.stringify({ error: "date is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidDateString(date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Use "YYYY-MM-DD".' }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const bets: BetRow[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("bets")
        .select(
          "id, combination, bet_amount, created_at, bettor_name, agent_id, created_by, lotto_types(name), bet_types(code)",
        )
        .eq("bet_status", "completed")
        .eq("is_dummy_bet", false)
        .eq("is_archive", false)
        .gte("created_at", `${date}T00:00:00`)
        .lte("created_at", `${date}T23:59:59.999`)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        throw error;
      }

      const batch = (data ?? []) as BetRow[];

      if (batch.length === 0) {
        break;
      }

      bets.push(...batch);

      if (batch.length < BATCH_SIZE) {
        break;
      }

      offset += BATCH_SIZE;
    }

    if (bets.length === 0) {
      return new Response(JSON.stringify({ date, rows: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileIds = Array.from(
      new Set(
        bets
          .flatMap((bet) => [bet.agent_id, bet.created_by])
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const profileMap = new Map<string, ProfileRow>();

    if (profileIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .in("id", profileIds);

      if (profilesError) {
        throw profilesError;
      }

      for (const profile of (profiles ?? []) as ProfileRow[]) {
        profileMap.set(profile.id, profile);
      }
    }

    const rows = bets.map((bet) => ({
      ref_id: bet.id,
      lotto_type_name: bet.lotto_types?.name ?? "-",
      bet_type_code: bet.bet_types?.code ?? "-",
      combination: bet.combination ?? "-",
      bet_amount: bet.bet_amount ?? 0,
      agent_name: displayName(
        bet.agent_id ? (profileMap.get(bet.agent_id) ?? null) : null,
      ),
      created_at: bet.created_at ?? "-",
      bettor_name: bet.bettor_name ?? "-",
      encoded_by: displayName(
        bet.created_by ? (profileMap.get(bet.created_by) ?? null) : null,
      ),
    }));

    return new Response(JSON.stringify({ date, rows }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
