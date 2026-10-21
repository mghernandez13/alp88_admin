// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPER_ADMIN_EMAIL = "superadmin@alp88.online";

type RequestBody = {
  date?: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  remittance_percent: number | null;
  upline: string | null;
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

type DailyAgentReportRow = {
  agent_id: string;
  lp3_normal_bets: number | string | null;
  lp3_normal_amount: number | string | null;
  lp3_returned_bets: number | string | null;
  lp3_returned_amount: number | string | null;
  lp3_free_bets: number | string | null;
  lp3_free_amount: number | string | null;
  lp3_remittance_amount: number | string | null;
  d2_2pm_sbets: number | string | null;
  d2_2pm_rbets: number | string | null;
  d2_2pm_amount: number | string | null;
  d2_2pm_remittance_amount: number | string | null;
  d2_5pm_sbets: number | string | null;
  d2_5pm_rbets: number | string | null;
  d2_5pm_amount: number | string | null;
  d2_5pm_remittance_amount: number | string | null;
  d2_9pm_sbets: number | string | null;
  d2_9pm_rbets: number | string | null;
  d2_9pm_amount: number | string | null;
  d2_9pm_remittance_amount: number | string | null;
  d3_2pm_sbets: number | string | null;
  d3_2pm_rbets: number | string | null;
  d3_2pm_amount: number | string | null;
  d3_2pm_remittance_amount: number | string | null;
  d3_5pm_sbets: number | string | null;
  d3_5pm_rbets: number | string | null;
  d3_5pm_amount: number | string | null;
  d3_5pm_remittance_amount: number | string | null;
  d3_9pm_sbets: number | string | null;
  d3_9pm_rbets: number | string | null;
  d3_9pm_amount: number | string | null;
  d3_9pm_remittance_amount: number | string | null;
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

const sortProfilesByName = (profiles: ProfileRow[]) =>
  [...profiles].sort((a, b) => {
    const normalize = (value: string | null | undefined) =>
      (value ?? "").trim().toLowerCase();
    const isSuperAdmin = (profile: ProfileRow) =>
      profile.email === SUPER_ADMIN_EMAIL ||
      normalize(profile.full_name) === "super admin";

    const aIsSuper = isSuperAdmin(a);
    const bIsSuper = isSuperAdmin(b);

    if (aIsSuper !== bIsSuper) {
      return aIsSuper ? -1 : 1;
    }

    const aName = normalize(a.full_name);
    const bName = normalize(b.full_name);

    if (aName === bName) return 0;
    return aName.localeCompare(bName);
  });

const toNumber = (value: number | string | null | undefined) =>
  Number(value ?? 0);

const createEmptyStats = (): AggregatedBetsResponse => ({
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
});

const mapDailyAgentStats = (
  row: DailyAgentReportRow | undefined,
): AggregatedBetsResponse => {
  if (!row) return createEmptyStats();

  const result = createEmptyStats();
  result.lp3.normalBets = toNumber(row.lp3_normal_bets);
  result.lp3.normalAmount = toNumber(row.lp3_normal_amount);
  result.lp3.returnedBets = toNumber(row.lp3_returned_bets);
  result.lp3.returnedAmount = toNumber(row.lp3_returned_amount);
  result.lp3.freeBets = toNumber(row.lp3_free_bets);
  result.lp3.freeAmount = toNumber(row.lp3_free_amount);
  result.lp3.netBets = result.lp3.normalBets + result.lp3.freeBets;
  result.lp3.netAmount = result.lp3.normalAmount + result.lp3.freeAmount;
  result.remittances.lp3.amount = toNumber(row.lp3_remittance_amount);

  for (const [slot, key] of [
    ["2PM", "2pm"],
    ["5PM", "5pm"],
    ["9PM", "9pm"],
  ] as const) {
    const d2 = result.twoD[slot];
    d2.sbets = toNumber(row[`d2_${key}_sbets`]);
    d2.rbets = toNumber(row[`d2_${key}_rbets`]);
    d2.amount = toNumber(row[`d2_${key}_amount`]);
    result.remittances.twoD[slot].amount = toNumber(
      row[`d2_${key}_remittance_amount`],
    );

    const d3 = result.threeD[slot];
    d3.sbets = toNumber(row[`d3_${key}_sbets`]);
    d3.rbets = toNumber(row[`d3_${key}_rbets`]);
    d3.amount = toNumber(row[`d3_${key}_amount`]);
    result.remittances.threeD[slot].amount = toNumber(
      row[`d3_${key}_remittance_amount`],
    );
  }

  for (const game of [result.twoD, result.threeD]) {
    for (const slot of ["2PM", "5PM", "9PM"] as const) {
      game.net.sbets += game[slot].sbets;
      game.net.rbets += game[slot].rbets;
      game.net.amount += game[slot].amount;
    }
  }

  result.overallTotal =
    result.lp3.netAmount + result.twoD.net.amount + result.threeD.net.amount;
  result.remittances.total.amount =
    result.remittances.lp3.amount +
    (["2PM", "5PM", "9PM"] as const).reduce(
      (total, slot) =>
        total +
        result.remittances.twoD[slot].amount +
        result.remittances.threeD[slot].amount,
      0,
    );

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
      .select("id, full_name, email, remittance_percent, upline")
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
    const nextDay = new Date(`${date}T00:00:00.000Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const exclusiveEndDate = nextDay.toISOString().slice(0, 10);

    const { data: reportRows, error: reportError } = await supabase.rpc(
      "daily_agent_report_stats",
      {
        p_start: `${date}T00:00:00+08:00`,
        p_end: `${exclusiveEndDate}T00:00:00+08:00`,
        p_agent_ids: agentIds,
      },
    );

    if (reportError) {
      throw reportError;
    }

    const statsByAgent = new Map(
      ((reportRows ?? []) as DailyAgentReportRow[]).map((row) => [
        row.agent_id,
        mapDailyAgentStats(row),
      ]),
    );

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

    headAdmins = sortProfilesByName(headAdmins);

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
      const headAdminStats =
        statsByAgent.get(headAdmin.id) ?? createEmptyStats();
      const descendants = sortProfilesByName(
        getAllDescendantsForHeadAdmin(headAdmin.id),
      );

      if (headAdmin.id === userId) {
        return [{ type: "headAdmin", headAdmin, stats: headAdminStats }];
      }

      const adminRows: AgentSummaryRow[] = descendants.map((admin) => {
        const adminStats = statsByAgent.get(admin.id) ?? createEmptyStats();

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
