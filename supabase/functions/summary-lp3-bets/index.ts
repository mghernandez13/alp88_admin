// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 1000;

type RequestBody = {
  lottoTypeId?: number | string;
  date?: string;
};

type BetTypeRow = {
  id: string | number;
  code: string;
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

    const { lottoTypeId, date } = (await req.json()) as RequestBody;

    if (lottoTypeId == null || !date) {
      return new Response(
        JSON.stringify({ error: "lottoTypeId and date are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
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

    const { data: drawResults } = await supabase
      .from("draw_results")
      .select("id, draw_date, combination")
      .eq("draw_type", lottoTypeId)
      .eq("draw_date", date);

    const { data: betTypes, error: betTypesError } = await supabase
      .from("bet_types")
      .select("id, code")
      .eq("game_type", "LP3")
      .eq("is_active", true)
      .eq("is_archive", false)
      .in("code", ["RB", "FB"]);

    if (betTypesError) {
      throw betTypesError;
    }

    const winningCombination = drawResults?.[0]?.combination || "--";
    const typedBetTypes = (betTypes ?? []) as BetTypeRow[];
    const rbTypeId = typedBetTypes.find(
      (item) => item.code?.toLowerCase() === "rb",
    )?.id;
    const fbTypeId = typedBetTypes.find(
      (item) => item.code?.toLowerCase() === "fb",
    )?.id;

    let offset = 0;
    let totalBets = 0;
    let totalGrossSales = 0;
    let totalNetSales = 0;
    let normalBetWinners = 0;
    let freeBetWinners = 0;
    let rbWinners = 0;
    let totalJackpotAmount = 0;

    while (true) {
      const { data: bets, error: betsError } = await supabase
        .from("bets")
        .select(
          "bet_type_id, hit, prize_amount, bet_amount, remittance_amount, is_return_bet, is_super_jackpot, is_free_bet, is_monthly_bracket_winner, is_petsada_winner",
        )
        .eq("lotto_type_id", lottoTypeId)
        .eq("bet_status", "completed")
        .eq("is_dummy_bet", false)
        .eq("is_archive", false)
        .gte("created_at", `${date}T00:00:00`)
        .lte("created_at", `${date}T23:59:59.999`)
        .range(offset, offset + BATCH_SIZE - 1);

      if (betsError) {
        throw betsError;
      }

      if (!bets || bets.length === 0) {
        break;
      }

      totalBets += bets.length;

      for (const bet of bets) {
        const betTypeId = bet.bet_type_id;

        if (betTypeId == null) {
          if (typeof bet.bet_amount === "number") {
            totalNetSales += bet.bet_amount;
            totalGrossSales += bet.bet_amount;
          }
        } else if (rbTypeId != null && String(betTypeId) === String(rbTypeId)) {
          if (typeof bet.bet_amount === "number") {
            totalGrossSales += bet.bet_amount;
          }
        } else if (fbTypeId != null && String(betTypeId) === String(fbTypeId)) {
          totalGrossSales += 10;
        }

        if (bet.hit) {
          if (
            bet.is_return_bet === true &&
            bet.is_super_jackpot === false &&
            bet.is_free_bet === false &&
            bet.is_monthly_bracket_winner === false &&
            bet.is_petsada_winner === false
          ) {
            rbWinners += 1;
          } else if (betTypeId == null || bet.is_super_jackpot) {
            normalBetWinners += 1;
          } else if (
            fbTypeId != null &&
            String(betTypeId) === String(fbTypeId)
          ) {
            freeBetWinners += 1;
          }

          if (typeof bet.prize_amount === "number") {
            totalJackpotAmount += bet.prize_amount;
          }
        }

        // if (
        //   bet.remittance_amount &&
        //   typeof bet.remittance_amount === "number"
        // ) {
        //   totalRemittance += bet.remittance_amount;
        // }
      }

      if (bets.length < BATCH_SIZE) {
        break;
      }

      offset += BATCH_SIZE;
    }

    const totalRemittance = totalNetSales * 0.6; //Always 60% of the net sales
    const jackpotWinners = normalBetWinners + freeBetWinners;

    return new Response(
      JSON.stringify({
        lottoTypeId,
        date,
        totalBets,
        winningCombination,
        jackpotWinners,
        rbWinners,
        normalBetWinners,
        freeBetWinners,
        totalGrossSales,
        totalNetSales,
        totalRemittance,
        totalJackpotAmount,
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
