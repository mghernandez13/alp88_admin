// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 1000;

type RequestBody = {
  lottoTypeIds?: number[];
  startDate?: string;
  endDate?: string;
};

type BetTypeRow = {
  id: string | number;
  code: string;
};

type DrawResultRow = {
  draw_type: string | number;
  draw_date: string;
  combination: string | null;
};

type LottoStats = {
  totalBets: number;
  totalStraightBets: number;
  totalRambolitoBets: number;
  totalPrize: number;
  totalGrossSale: number;
  totalNetSale: number;
  totalWinners: number;
  dailyGrossSale: Record<string, number>;
  dailyNetSale: Record<string, number>;
  dailyStraightWinners: Record<string, number>;
  dailyRambolitoWinners: Record<string, number>;
  dailyMonthlyBracketWinners: Record<string, number>;
  dailyPetsadaWinners: Record<string, number>;
};

const createEmptyStats = (dateRange: string[]): LottoStats => {
  const dailyGrossSale: Record<string, number> = {};
  const dailyNetSale: Record<string, number> = {};
  const dailyStraightWinners: Record<string, number> = {};
  const dailyRambolitoWinners: Record<string, number> = {};
  const dailyMonthlyBracketWinners: Record<string, number> = {};
  const dailyPetsadaWinners: Record<string, number> = {};

  for (const date of dateRange) {
    dailyGrossSale[date] = 0;
    dailyNetSale[date] = 0;
    dailyStraightWinners[date] = 0;
    dailyRambolitoWinners[date] = 0;
    dailyMonthlyBracketWinners[date] = 0;
    dailyPetsadaWinners[date] = 0;
  }

  return {
    totalBets: 0,
    totalStraightBets: 0,
    totalRambolitoBets: 0,
    totalPrize: 0,
    totalGrossSale: 0,
    totalNetSale: 0,
    totalWinners: 0,
    dailyGrossSale,
    dailyNetSale,
    dailyStraightWinners,
    dailyRambolitoWinners,
    dailyMonthlyBracketWinners,
    dailyPetsadaWinners,
  };
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

const normalizeBetNumber = (value: string) =>
  value.trim().replace(/^0+(?=\d)/, "");

const splitAndNormalizeNumbers = (combinationValue: string) =>
  combinationValue.split("-").map(normalizeBetNumber);

const checkIfRambolitoWinner = (
  betNumbers: string[],
  resultNumbers: string[],
) => {
  return (
    betNumbers.length === resultNumbers.length &&
    [...betNumbers].sort().join("-") === [...resultNumbers].sort().join("-")
  );
};

const buildTwoDSpecialContext = (
  drawDate: string,
  winningCombination: string,
  twoDPetsadaIsActive: boolean,
  twoDMonthlyBracketIsActive: boolean,
) => {
  const resultNumbers = splitAndNormalizeNumbers(winningCombination);

  if (resultNumbers.length !== 2) {
    return {
      isPetsada: false,
      isMonthlyBracket: false,
      resultNumbers,
    };
  }

  const date = new Date(`${drawDate}T12:00:00+08:00`);
  const targetTimezone = "Asia/Manila";

  const monthNumericToday = new Intl.DateTimeFormat("en-US", {
    timeZone: targetTimezone,
    month: "numeric",
  }).format(date);
  const dayNumericToday = new Intl.DateTimeFormat("en-US", {
    timeZone: targetTimezone,
    day: "numeric",
  }).format(date);
  const dayNumericYesterday = new Intl.DateTimeFormat("en-US", {
    timeZone: targetTimezone,
    day: "numeric",
  }).format(new Date(date.getTime() - 24 * 60 * 60 * 1000));
  const dayNumericTomorrow = new Intl.DateTimeFormat("en-US", {
    timeZone: targetTimezone,
    day: "numeric",
  }).format(new Date(date.getTime() + 24 * 60 * 60 * 1000));

  const isPetsada =
    twoDPetsadaIsActive &&
    resultNumbers.includes(monthNumericToday) &&
    (resultNumbers.includes(dayNumericToday) ||
      resultNumbers.includes(dayNumericYesterday) ||
      resultNumbers.includes(dayNumericTomorrow));

  const isMonthlyBracket =
    !isPetsada &&
    twoDMonthlyBracketIsActive &&
    resultNumbers.includes(monthNumericToday);

  return {
    isPetsada,
    isMonthlyBracket,
    resultNumbers,
  };
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

    const { lottoTypeIds, startDate, endDate } =
      (await req.json()) as RequestBody;

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

    const emptyStats = createEmptyStats(dateRange);

    if (!Array.isArray(lottoTypeIds) || lottoTypeIds.length === 0) {
      return new Response(
        JSON.stringify({
          ...emptyStats,
          byLottoTypeId: {},
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: betTypes, error: betTypesError } = await supabase
      .from("bet_types")
      .select("id, code")
      .eq("game_type", "2D")
      .in("code", ["S", "R"]);

    if (betTypesError) {
      throw betTypesError;
    }

    const typedBetTypes = (betTypes ?? []) as BetTypeRow[];
    const sTypeId = typedBetTypes.find((item) => item.code === "S")?.id;
    const rTypeId = typedBetTypes.find((item) => item.code === "R")?.id;

    const { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("name, value");

    if (settingsError) {
      throw settingsError;
    }

    const twoDPetsadaIsActive =
      settingsData?.find(
        (setting) => setting.name === "2d_petsada_prize_is_active",
      )?.value === "true";

    const twoDMonthlyBracketIsActive =
      settingsData?.find(
        (setting) => setting.name === "2d_monthly_bracket_prize_is_active",
      )?.value === "true";

    const { data: drawResults, error: drawResultsError } = await supabase
      .from("draw_results")
      .select("draw_type, draw_date, combination")
      .in("draw_type", lottoTypeIds)
      .gte("draw_date", startDate)
      .lte("draw_date", endDate)
      .eq("is_archive", false);

    if (drawResultsError) {
      throw drawResultsError;
    }

    const drawResultMap = new Map<string, DrawResultRow>();

    for (const row of (drawResults ?? []) as DrawResultRow[]) {
      const key = `${String(row.draw_type)}|${row.draw_date}`;
      drawResultMap.set(key, row);
    }

    const byLottoTypeId: Record<string, LottoStats> = Object.fromEntries(
      lottoTypeIds.map((lottoTypeId) => [
        String(lottoTypeId),
        createEmptyStats(dateRange),
      ]),
    );

    let offset = 0;
    const summaryStats = createEmptyStats(dateRange);

    while (true) {
      const { data: bets, error: betsError } = await supabase
        .from("bets")
        .select(
          "lotto_type_id, bet_type_id, combination, hit, prize_amount, bet_amount, is_super_jackpot, created_at",
        )
        .in("lotto_type_id", lottoTypeIds)
        .eq("bet_status", "completed")
        .eq("is_archive", false)
        .eq("is_dummy_bet", false)
        .gte("created_at", `${startDate}T00:00:00+08:00`)
        .lte("created_at", `${endDate}T23:59:59.999+08:00`)
        .range(offset, offset + BATCH_SIZE - 1);

      if (betsError) {
        throw betsError;
      }

      if (!bets || bets.length === 0) {
        break;
      }

      for (const bet of bets) {
        const lottoTypeId = bet.lotto_type_id;
        const lottoTypeKey = lottoTypeId == null ? null : String(lottoTypeId);
        const betTypeId = bet.bet_type_id;
        const betDate =
          typeof bet.created_at === "string"
            ? toManilaDateString(bet.created_at)
            : null;

        if (!lottoTypeKey || !byLottoTypeId[lottoTypeKey] || !betDate) {
          continue;
        }

        const lottoStats = byLottoTypeId[lottoTypeKey];

        summaryStats.totalBets += 1;
        lottoStats.totalBets += 1;

        if (bet.bet_amount && typeof bet.bet_amount === "number") {
          summaryStats.totalGrossSale += bet.bet_amount;
          lottoStats.totalGrossSale += bet.bet_amount;
          summaryStats.totalNetSale += bet.bet_amount;
          lottoStats.totalNetSale += bet.bet_amount;
          summaryStats.dailyGrossSale[betDate] += bet.bet_amount;
          lottoStats.dailyGrossSale[betDate] += bet.bet_amount;
          summaryStats.dailyNetSale[betDate] += bet.bet_amount;
          lottoStats.dailyNetSale[betDate] += bet.bet_amount;
        }

        if (sTypeId != null && String(betTypeId) === String(sTypeId)) {
          summaryStats.totalStraightBets += 1;
          lottoStats.totalStraightBets += 1;
        } else if (rTypeId != null && String(betTypeId) === String(rTypeId)) {
          summaryStats.totalRambolitoBets += 1;
          lottoStats.totalRambolitoBets += 1;
        }

        if (bet.hit) {
          summaryStats.totalWinners += 1;
          lottoStats.totalWinners += 1;

          const isStraightType =
            sTypeId != null && String(betTypeId) === String(sTypeId);
          const isRambleType =
            rTypeId != null && String(betTypeId) === String(rTypeId);

          let countedSpecialBucket = false;

          if (
            (isStraightType || isRambleType) &&
            typeof bet.combination === "string"
          ) {
            const drawResult = drawResultMap.get(`${lottoTypeKey}|${betDate}`);

            if (drawResult?.combination) {
              const specialContext = buildTwoDSpecialContext(
                betDate,
                drawResult.combination,
                twoDPetsadaIsActive,
                twoDMonthlyBracketIsActive,
              );

              const betNumbers = splitAndNormalizeNumbers(bet.combination);
              const isStraightWinner =
                isStraightType &&
                betNumbers.length === specialContext.resultNumbers.length &&
                betNumbers[0] === specialContext.resultNumbers[0] &&
                betNumbers[1] === specialContext.resultNumbers[1];
              const isRambleWinner =
                isRambleType &&
                checkIfRambolitoWinner(
                  betNumbers,
                  specialContext.resultNumbers,
                );

              if (isStraightWinner || isRambleWinner) {
                if (specialContext.isPetsada) {
                  summaryStats.dailyPetsadaWinners[betDate] += 1;
                  lottoStats.dailyPetsadaWinners[betDate] += 1;
                  countedSpecialBucket = true;
                } else if (specialContext.isMonthlyBracket) {
                  summaryStats.dailyMonthlyBracketWinners[betDate] += 1;
                  lottoStats.dailyMonthlyBracketWinners[betDate] += 1;
                  countedSpecialBucket = true;
                }
              }
            }
          }

          if (!countedSpecialBucket) {
            if (sTypeId != null && String(betTypeId) === String(sTypeId)) {
              summaryStats.dailyStraightWinners[betDate] += 1;
              lottoStats.dailyStraightWinners[betDate] += 1;
            } else if (
              rTypeId != null &&
              String(betTypeId) === String(rTypeId)
            ) {
              summaryStats.dailyRambolitoWinners[betDate] += 1;
              lottoStats.dailyRambolitoWinners[betDate] += 1;
            }
          }

          if (typeof bet.prize_amount === "number") {
            summaryStats.totalPrize += bet.prize_amount;
            lottoStats.totalPrize += bet.prize_amount;
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
        ...summaryStats,
        byLottoTypeId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : JSON.stringify(error);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
