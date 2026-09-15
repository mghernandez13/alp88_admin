// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 1000;

type RequestBody = {
  lottoTypeIds?: Array<number | string>;
  date?: string;
};

type SummaryByLottoType = {
  lottoTypeId: string;
  date: string;
  winningCombination: string;
  totalBets: number;
  jackpotWinners: number;
  totalGrossSales: number;
  totalNetSales: number;
  totalRemittance: number;
  totalJackpotAmount: number;
};

type OverallSummary = {
  totalBets: number;
  winningCombination: string;
  jackpotWinners: number;
  totalGrossSales: number;
  totalNetSales: number;
  totalRemittance: number;
  totalJackpotAmount: number;
};

const createEmptySummary = (
  lottoTypeId: string,
  date: string,
): SummaryByLottoType => ({
  lottoTypeId,
  date,
  winningCombination: "--",
  totalBets: 0,
  jackpotWinners: 0,
  totalGrossSales: 0,
  totalNetSales: 0,
  totalRemittance: 0,
  totalJackpotAmount: 0,
});

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

    const { lottoTypeIds, date } = (await req.json()) as RequestBody;

    if (!Array.isArray(lottoTypeIds) || lottoTypeIds.length === 0 || !date) {
      return new Response(
        JSON.stringify({ error: "lottoTypeIds and date are required" }),
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

    const lottoTypeKeys = lottoTypeIds.map((id) => String(id));

    const summariesByLottoType: Record<string, SummaryByLottoType> =
      Object.fromEntries(
        lottoTypeKeys.map((id) => [id, createEmptySummary(id, date)]),
      );

    const { data: drawResults, error: drawResultsError } = await supabase
      .from("draw_results")
      .select("draw_type, combination")
      .in("draw_type", lottoTypeIds)
      .eq("draw_date", date);

    if (drawResultsError) {
      throw drawResultsError;
    }

    for (const drawResult of drawResults ?? []) {
      const drawTypeKey =
        drawResult.draw_type == null ? null : String(drawResult.draw_type);

      if (!drawTypeKey || !summariesByLottoType[drawTypeKey]) continue;

      summariesByLottoType[drawTypeKey].winningCombination =
        drawResult.combination || "--";
    }

    let offset = 0;

    while (true) {
      const { data: bets, error: betsError } = await supabase
        .from("bets")
        .select(
          "lotto_type_id, bet_type_id, hit, prize_amount, bet_amount, remittance_amount",
        )
        .in("lotto_type_id", lottoTypeIds)
        .eq("bet_status", "completed")
        .eq("is_dummy_bet", false)
        .eq("is_archive", false)
        .gte("created_at", `${date}T00:00:00+08:00`)
        .lte("created_at", `${date}T23:59:59.999+08:00`)
        .range(offset, offset + BATCH_SIZE - 1);

      if (betsError) {
        throw betsError;
      }

      if (!bets || bets.length === 0) {
        break;
      }

      for (const bet of bets) {
        const lottoTypeKey =
          bet.lotto_type_id == null ? null : String(bet.lotto_type_id);

        if (!lottoTypeKey || !summariesByLottoType[lottoTypeKey]) {
          continue;
        }

        const summary = summariesByLottoType[lottoTypeKey];

        summary.totalBets += 1;

        if (typeof bet.bet_amount === "number") {
          summary.totalNetSales += bet.bet_amount;
          summary.totalGrossSales += bet.bet_amount;
        }

        if (bet.hit) {
          summary.jackpotWinners += 1;

          if (typeof bet.prize_amount === "number") {
            summary.totalJackpotAmount += bet.prize_amount;
          }
        }

        // if (typeof bet.remittance_amount === "number") {
        //   summary.totalRemittance += bet.remittance_amount;
        // }
        summary.totalRemittance = summary.totalNetSales * 0.6;
      }

      if (bets.length < BATCH_SIZE) {
        break;
      }

      offset += BATCH_SIZE;
    }

    const byLottoTypeId: Record<string, SummaryByLottoType> =
      Object.fromEntries(
        lottoTypeKeys.map((id) => [id, summariesByLottoType[id]]),
      );

    const overall: OverallSummary = Object.values(byLottoTypeId).reduce(
      (acc, summary) => {
        acc.totalBets += summary.totalBets;
        acc.jackpotWinners += summary.jackpotWinners;
        acc.totalGrossSales += summary.totalGrossSales;
        acc.totalNetSales += summary.totalNetSales;
        acc.totalRemittance += summary.totalRemittance;
        acc.totalJackpotAmount += summary.totalJackpotAmount;
        acc.winningCombination = summary.winningCombination;
        return acc;
      },
      {
        totalBets: 0,
        jackpotWinners: 0,
        totalGrossSales: 0,
        totalNetSales: 0,
        totalRemittance: 0,
        totalJackpotAmount: 0,
        winningCombination: "",
      },
    );

    return new Response(
      JSON.stringify({
        overall,
        byLottoTypeId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.log("Error in summary-3d-2d-bets function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
