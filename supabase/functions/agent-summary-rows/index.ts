// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 1000;
const SUPER_ADMIN_EMAIL = "superadmin@alp88.online";

type RequestBody = {
  date?: string;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  permission_id: string | null;
  avatar_url: string | null;
  is_quota_based: boolean | null;
  remittance_percent: number | null;
  upline: string | null;
  status: boolean | null;
};

type BetRow = {
  id: string;
  agent_id: string | null;
  bet_amount: number | null;
  remittance_amount: number | null;
  lotto_types: {
    id: number | string;
    name: string;
    draw_time: string;
    game_type: string;
  } | null;
  bet_types: {
    id: string;
    name: string;
    code: string;
  } | null;
};

type AggregatedBetsResponse = {
  remittances: {
    twoD: {
      "2PM": { amount: number };
      "5PM": { amount: number };
      "9PM": { amount: number };
    };
    threeD: {
      "2PM": { amount: number };
      "5PM": { amount: number };
      "9PM": { amount: number };
    };
    lp3: {
      amount: number;
    };
    total: {
      amount: number;
    };
  };
  overallTotal: number;
  lp3: {
    normalBets: number;
    normalAmount: number;
    returnedBets: number;
    returnedAmount: number;
    freeBets: number;
    freeAmount: number;
    netBets: number;
    netAmount: number;
  };
  twoD: {
    "2PM": { sbets: number; rbets: number; amount: number };
    "5PM": { sbets: number; rbets: number; amount: number };
    "9PM": { sbets: number; rbets: number; amount: number };
    net: { sbets: number; rbets: number; amount: number };
  };
  threeD: {
    "2PM": { sbets: number; rbets: number; amount: number };
    "5PM": { sbets: number; rbets: number; amount: number };
    "9PM": { sbets: number; rbets: number; amount: number };
    net: { sbets: number; rbets: number; amount: number };
  };
};

type AgentSummaryRow = {
  type: "headAdmin" | "admin";
  headAdmin?: ProfileRow;
  admin?: ProfileRow;
  stats: AggregatedBetsResponse;
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

const aggregateBets = (bets: BetRow[]): AggregatedBetsResponse => {
  const result: AggregatedBetsResponse = {
    remittances: {
      twoD: {
        "2PM": { amount: 0 },
        "5PM": { amount: 0 },
        "9PM": { amount: 0 },
      },
      threeD: {
        "2PM": { amount: 0 },
        "5PM": { amount: 0 },
        "9PM": { amount: 0 },
      },
      lp3: {
        amount: 0,
      },
      total: {
        amount: 0,
      },
    },
    overallTotal: 0,
    lp3: {
      normalBets: 0,
      normalAmount: 0,
      returnedBets: 0,
      returnedAmount: 0,
      freeBets: 0,
      freeAmount: 0,
      netBets: 0,
      netAmount: 0,
    },
    twoD: {
      "2PM": { sbets: 0, rbets: 0, amount: 0 },
      "5PM": { sbets: 0, rbets: 0, amount: 0 },
      "9PM": { sbets: 0, rbets: 0, amount: 0 },
      net: { sbets: 0, rbets: 0, amount: 0 },
    },
    threeD: {
      "2PM": { sbets: 0, rbets: 0, amount: 0 },
      "5PM": { sbets: 0, rbets: 0, amount: 0 },
      "9PM": { sbets: 0, rbets: 0, amount: 0 },
      net: { sbets: 0, rbets: 0, amount: 0 },
    },
  };

  for (const bet of bets) {
    const betAmount = typeof bet.bet_amount === "number" ? bet.bet_amount : 0;
    const remittanceAmount =
      typeof bet.remittance_amount === "number" ? bet.remittance_amount : 0;
    const gameType = bet.lotto_types?.game_type;
    const drawTime = bet.lotto_types?.draw_time;
    const betCode = bet.bet_types?.code?.toLowerCase() ?? "";

    if (gameType === "LP3") {
      if (!bet.bet_types || betCode === "") {
        result.lp3.normalBets += 1;
        result.lp3.normalAmount += betAmount;
      } else if (betCode === "rb") {
        result.lp3.returnedBets += 1;
        result.lp3.returnedAmount += betAmount;
      } else if (betCode === "fb") {
        result.lp3.freeBets += 1;
        result.lp3.freeAmount += betAmount;
      }

      if (betCode !== "rb") {
        result.remittances.lp3.amount += remittanceAmount;
      }
    } else if (gameType === "2D") {
      if (drawTime === "14:00:00") {
        if (betCode === "s") result.twoD["2PM"].sbets += 1;
        else if (betCode === "r") result.twoD["2PM"].rbets += 1;
        result.twoD["2PM"].amount += betAmount;
        result.remittances.twoD["2PM"].amount += remittanceAmount;
      } else if (drawTime === "17:00:00") {
        if (betCode === "s") result.twoD["5PM"].sbets += 1;
        else if (betCode === "r") result.twoD["5PM"].rbets += 1;
        result.twoD["5PM"].amount += betAmount;
        result.remittances.twoD["5PM"].amount += remittanceAmount;
      } else if (drawTime === "21:00:00") {
        if (betCode === "s") result.twoD["9PM"].sbets += 1;
        else if (betCode === "r") result.twoD["9PM"].rbets += 1;
        result.twoD["9PM"].amount += betAmount;
        result.remittances.twoD["9PM"].amount += remittanceAmount;
      }
    } else if (gameType === "3D") {
      if (drawTime === "14:00:00") {
        if (betCode === "s") result.threeD["2PM"].sbets += 1;
        else if (betCode === "r") result.threeD["2PM"].rbets += 1;
        result.threeD["2PM"].amount += betAmount;
        result.remittances.threeD["2PM"].amount += remittanceAmount;
      } else if (drawTime === "17:00:00") {
        if (betCode === "s") result.threeD["5PM"].sbets += 1;
        else if (betCode === "r") result.threeD["5PM"].rbets += 1;
        result.threeD["5PM"].amount += betAmount;
        result.remittances.threeD["5PM"].amount += remittanceAmount;
      } else if (drawTime === "21:00:00") {
        if (betCode === "s") result.threeD["9PM"].sbets += 1;
        else if (betCode === "r") result.threeD["9PM"].rbets += 1;
        result.threeD["9PM"].amount += betAmount;
        result.remittances.threeD["9PM"].amount += remittanceAmount;
      }
    }
  }

  result.lp3.netBets = result.lp3.normalBets + result.lp3.freeBets;
  result.lp3.netAmount = result.lp3.normalAmount + result.lp3.freeAmount;

  result.twoD.net.sbets =
    result.twoD["2PM"].sbets +
    result.twoD["5PM"].sbets +
    result.twoD["9PM"].sbets;
  result.twoD.net.rbets =
    result.twoD["2PM"].rbets +
    result.twoD["5PM"].rbets +
    result.twoD["9PM"].rbets;
  result.twoD.net.amount =
    result.twoD["2PM"].amount +
    result.twoD["5PM"].amount +
    result.twoD["9PM"].amount;

  result.threeD.net.sbets =
    result.threeD["2PM"].sbets +
    result.threeD["5PM"].sbets +
    result.threeD["9PM"].sbets;
  result.threeD.net.rbets =
    result.threeD["2PM"].rbets +
    result.threeD["5PM"].rbets +
    result.threeD["9PM"].rbets;
  result.threeD.net.amount =
    result.threeD["2PM"].amount +
    result.threeD["5PM"].amount +
    result.threeD["9PM"].amount;

  result.overallTotal =
    result.lp3.netAmount + result.twoD.net.amount + result.threeD.net.amount;
  result.remittances.total.amount =
    result.remittances.lp3.amount +
    result.remittances.twoD["2PM"].amount +
    result.remittances.twoD["5PM"].amount +
    result.remittances.twoD["9PM"].amount +
    result.remittances.threeD["2PM"].amount +
    result.remittances.threeD["5PM"].amount +
    result.remittances.threeD["9PM"].amount;

  return result;
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

    const userId = user.id;
    const userEmail = user.email?.toLowerCase() ?? "";
    const isSuperAdminUser = userEmail === SUPER_ADMIN_EMAIL;

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, full_name, email, permission_id, avatar_url, is_quota_based, remittance_percent, upline, status",
      )
      .eq("is_archive", false);

    if (profilesError) {
      throw profilesError;
    }

    const allProfiles = (profiles ?? []) as ProfileRow[];
    const agents = isSuperAdminUser
      ? allProfiles
      : (() => {
          const descendants = new Set<string>([userId]);
          let hasNewItems = true;

          // Collect the full descendant tree from the logged-in user.
          while (hasNewItems) {
            hasNewItems = false;

            for (const profile of allProfiles) {
              if (!profile.upline || descendants.has(profile.id)) continue;

              if (descendants.has(profile.upline)) {
                descendants.add(profile.id);
                hasNewItems = true;
              }
            }
          }

          return allProfiles.filter((profile) => descendants.has(profile.id));
        })();

    if (agents.length === 0) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agentIds = agents.map((agent) => agent.id);
    const betsByAgent: Record<string, BetRow[]> = Object.fromEntries(
      agentIds.map((id) => [id, []]),
    );

    let offset = 0;

    while (true) {
      const { data: bets, error: betsError } = await supabase
        .from("bets")
        .select(
          "id, agent_id, bet_amount, remittance_amount, lotto_types(id, game_type, draw_time, name), bet_types(id, name, code)",
        )
        .in("agent_id", agentIds)
        .eq("is_archive", false)
        .eq("bet_status", "completed")
        .eq("is_dummy_bet", false)
        .gte("created_at", `${date}T00:00:00+08:00`)
        .lt("created_at", `${date}T23:59:59+08:00`)
        .order("created_at", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);

      if (betsError) {
        throw betsError;
      }

      if (!bets || bets.length === 0) {
        break;
      }

      for (const bet of bets as BetRow[]) {
        if (!bet.agent_id || !betsByAgent[bet.agent_id]) continue;
        betsByAgent[bet.agent_id].push(bet);
      }

      if (bets.length < BATCH_SIZE) {
        break;
      }

      offset += BATCH_SIZE;
    }

    const loggedInAgent = agents.find((agent) => agent.id === userId) ?? null;

    let headAdmins: ProfileRow[] = [];

    if (isSuperAdminUser) {
      headAdmins = agents.filter(
        (agent) =>
          agent.upline === null ||
          agent.upline === userId ||
          agent.id === userId,
      );
    } else {
      headAdmins = agents.filter(
        (agent) => agent.upline === userId || agent.id === userId,
      );
    }

    if (loggedInAgent && !headAdmins.some((agent) => agent.id === userId)) {
      headAdmins = [loggedInAgent, ...headAdmins];
    }

    if (userId && headAdmins.length > 0) {
      headAdmins = [
        ...headAdmins.filter((a) => a.id === userId),
        ...headAdmins.filter((a) => a.id !== userId),
      ];
    }

    const getAllDescendantsForHeadAdmin = (headAdminId: string) => {
      const children = agents.filter((agent) => agent.upline === headAdminId);
      const descendants: ProfileRow[] = [];
      const queue = [...children];

      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;

        descendants.push(current);
        const nextLevelChildren = agents.filter(
          (agent) => agent.upline === current.id,
        );

        queue.push(...nextLevelChildren);
      }

      return descendants;
    };

    const rows = headAdmins.flatMap<AgentSummaryRow>((headAdmin) => {
      const headAdminStats = aggregateBets(betsByAgent[headAdmin.id] ?? []);
      const descendants = getAllDescendantsForHeadAdmin(headAdmin.id);

      if (headAdmin.id === userId) {
        return [{ type: "headAdmin", headAdmin, stats: headAdminStats }];
      }

      const adminRows: AgentSummaryRow[] = descendants.map((admin) => {
        const adminStats = aggregateBets(betsByAgent[admin.id] ?? []);

        return { type: "admin", admin, stats: adminStats };
      });

      return [
        { type: "headAdmin", headAdmin, stats: headAdminStats },
        ...adminRows,
      ];
    });

    if (userId) {
      const currentUserRowIndex = rows.findIndex(
        (row) => row.type === "headAdmin" && row.headAdmin?.id === userId,
      );

      if (currentUserRowIndex > 0) {
        const [currentUserRow] = rows.splice(currentUserRowIndex, 1);
        if (currentUserRow) rows.unshift(currentUserRow);
      }
    }

    return new Response(JSON.stringify(rows), {
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
