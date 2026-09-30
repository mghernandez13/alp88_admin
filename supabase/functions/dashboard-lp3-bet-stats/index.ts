// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 1000;

type RequestBody = {
  startDate?: string;
  endDate?: string;
};

type BetTypeRow = {
  id: string | number;
  code: string;
};

const getDateRange = (start: string, end: string) => {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);

  const current = new Date(Date.UTC(startYear, startMonth - 1, startDay));
  const last = new Date(Date.UTC(endYear, endMonth - 1, endDay));
  const dates: string[] = [];

  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

// `created_at` is stored as an absolute UTC instant, but the dashboard's
// date range refers to Asia/Manila calendar days. Convert to the Manila
// calendar date so bets aren't bucketed under (or dropped for) the wrong day.
const toManilaDateString = (createdAt: string) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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

    const { startDate, endDate } = (await req.json()) as RequestBody;

    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: "Missing date range" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dateRange = getDateRange(startDate, endDate);

    if (dateRange.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid date range" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dailyGrossSale: Record<string, number> = {};
    const dailyNetSale: Record<string, number> = {};
    const dailySuperJackpotWinners: Record<string, number> = {};
    const dailyNormalBetWinners: Record<string, number> = {};
    const dailyReturnBetWinners: Record<string, number> = {};
    const dailyFreeBetWinners: Record<string, number> = {};

    for (const date of dateRange) {
      dailyGrossSale[date] = 0;
      dailyNetSale[date] = 0;
      dailySuperJackpotWinners[date] = 0;
      dailyNormalBetWinners[date] = 0;
      dailyReturnBetWinners[date] = 0;
      dailyFreeBetWinners[date] = 0;
    }

    const { data: betTypes, error: betTypesError } = await supabase
      .from("bet_types")
      .select("id, code")
      .eq("game_type", "LP3")
      .in("code", ["RB", "FB"]);

    if (betTypesError) {
      throw betTypesError;
    }

    const typedBetTypes = (betTypes ?? []) as BetTypeRow[];
    const rbTypeId = typedBetTypes.find(
      (item) => item.code?.toLowerCase() === "rb",
    )?.id;
    const fbTypeId = typedBetTypes.find(
      (item) => item.code?.toLowerCase() === "fb",
    )?.id;

    let offset = 0;
    let totalBets = 0;
    let totalNormalBets = 0;
    let totalReturnBets = 0;
    let totalFreeBets = 0;
    let totalPrize = 0;
    let totalGrossSale = 0;
    let totalNetSale = 0;
    let totalWinners = 0;

    while (true) {
      const { data: bets, error: betsError } = await supabase
        .from("bets")
        .select(
          "bet_type_id, hit, prize_amount, bet_amount, is_super_jackpot, created_at, lotto_types!inner(game_type)",
        )
        .eq("lotto_types.game_type", "LP3")
        .eq("bet_status", "completed")
        .eq("is_dummy_bet", false)
        .eq("is_archive", false)
        .gte("created_at", `${startDate}T00:00:00+08:00`)
        .lte("created_at", `${endDate}T23:59:59+08:00`)
        .order("id", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);
      if (startDate === endDate) {
        console.log("bets", bets);
      }
      if (betsError) {
        throw betsError;
      }

      if (!bets || bets.length === 0) {
        break;
      }

      totalBets += bets.length;

      for (const bet of bets) {
        const betTypeId = bet.bet_type_id;
        const betDate =
          typeof bet.created_at === "string"
            ? toManilaDateString(bet.created_at)
            : null;

        if (!betDate || !(betDate in dailyGrossSale)) {
          continue;
        }

        if (betTypeId == null) {
          totalNormalBets += 1;
          if (bet.bet_amount && typeof bet.bet_amount === "number") {
            totalNetSale += bet.bet_amount;
            dailyNetSale[betDate] += bet.bet_amount;
          }
          if (bet.bet_amount && typeof bet.bet_amount === "number") {
            totalGrossSale += bet.bet_amount;
            dailyGrossSale[betDate] += bet.bet_amount;
          }
        } else if (rbTypeId != null && String(betTypeId) === String(rbTypeId)) {
          totalReturnBets += 1;
          if (bet.bet_amount && typeof bet.bet_amount === "number") {
            totalGrossSale += bet.bet_amount;
            dailyGrossSale[betDate] += bet.bet_amount;
          }
        } else if (fbTypeId != null && String(betTypeId) === String(fbTypeId)) {
          totalFreeBets += 1;
          totalGrossSale += 10;
          dailyGrossSale[betDate] += 10;
        }

        if (bet.hit) {
          totalWinners += 1;

          if (betTypeId == null) {
            dailyNormalBetWinners[betDate] += 1;
            if (bet.is_super_jackpot) {
              dailySuperJackpotWinners[betDate] += 1;
            }
          } else if (
            rbTypeId != null &&
            String(betTypeId) === String(rbTypeId)
          ) {
            dailyReturnBetWinners[betDate] += 1;
          } else if (
            fbTypeId != null &&
            String(betTypeId) === String(fbTypeId)
          ) {
            dailyFreeBetWinners[betDate] += 1;
          }

          if (typeof bet.prize_amount === "number") {
            totalPrize += bet.prize_amount;
          }
        }
      }

      if (bets.length < BATCH_SIZE) {
        break;
      }

      offset += BATCH_SIZE;
    }

    return new Response(
      JSON.stringify({
        totalBets,
        totalNormalBets,
        totalReturnBets,
        totalFreeBets,
        totalPrize,
        totalGrossSale,
        totalNetSale,
        totalWinners,
        dailyGrossSale,
        dailyNetSale,
        dailyNormalBetWinners,
        dailyReturnBetWinners,
        dailyFreeBetWinners,
        dailySuperJackpotWinners,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
