import type { Bets } from "../types/api";
import type {
  AggregatedBetsResponse,
  BetPrizeListItem,
  BetPrizeSupabaseRow,
} from "../types/bets";
import {
  compareNumber,
  compareText,
  formatTo12h,
  normalizeSingleRelation,
} from "./helper";

export const aggregateBets = (
  bets: Bets[],
  remittancePercent: number = 60,
): AggregatedBetsResponse => {
  const result = {
    remittance: 0,
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
    d2: {
      "2PM": { sbets: 0, rbets: 0, amount: 0 },
      "5PM": { sbets: 0, rbets: 0, amount: 0 },
      "9PM": { sbets: 0, rbets: 0, amount: 0 },
      net: { sbets: 0, rbets: 0, amount: 0 },
    },
    d3: {
      "2PM": { sbets: 0, rbets: 0, amount: 0 },
      "5PM": { sbets: 0, rbets: 0, amount: 0 },
      "9PM": { sbets: 0, rbets: 0, amount: 0 },
      net: { sbets: 0, rbets: 0, amount: 0 },
    },
  };
  bets.forEach((bet: Bets) => {
    const { bet_amount, bet_types, lotto_types } = bet;
    if (lotto_types?.game_type === "LP3") {
      if (!bet_types || bet_types?.code === "") {
        result.lp3.normalBets += 1;
        result.lp3.normalAmount += bet_amount || 0;
      } else if (bet_types?.code === "RB") {
        result.lp3.returnedBets += 1;
        result.lp3.returnedAmount += bet_amount || 0;
      } else if (bet_types?.code === "FB") {
        result.lp3.freeBets += 1;
        result.lp3.freeAmount += bet_amount || 0;
      }
    } else if (lotto_types?.game_type === "2D") {
      if (lotto_types?.draw_time && lotto_types.draw_time === "14:00:00") {
        if (bet_types?.code === "S") {
          result.d2["2PM"].sbets += 1;
        } else if (bet_types?.code === "R") {
          result.d2["2PM"].rbets += 1;
        }
        result.d2["2PM"].amount += bet_amount || 0;
      } else if (
        lotto_types?.draw_time &&
        lotto_types.draw_time === "17:00:00"
      ) {
        if (bet_types?.code === "S") {
          result.d2["5PM"].sbets += 1;
        } else if (bet_types?.code === "R") {
          result.d2["5PM"].rbets += 1;
        }
        result.d2["5PM"].amount += bet_amount || 0;
      } else if (
        lotto_types?.draw_time &&
        lotto_types.draw_time === "21:00:00"
      ) {
        if (bet_types?.code === "S") {
          result.d2["9PM"].sbets += 1;
        } else if (bet_types?.code === "R") {
          result.d2["9PM"].rbets += 1;
        }
        result.d2["9PM"].amount += bet_amount || 0;
      }
    } else if (lotto_types?.game_type === "3D") {
      if (lotto_types?.draw_time && lotto_types.draw_time === "14:00:00") {
        if (bet_types?.code === "S") {
          result.d3["2PM"].sbets += 1;
        } else if (bet_types?.code === "R") {
          result.d3["2PM"].rbets += 1;
        }
        result.d3["2PM"].amount += bet_amount || 0;
      } else if (
        lotto_types?.draw_time &&
        lotto_types.draw_time === "17:00:00"
      ) {
        if (bet_types?.code === "S") {
          result.d3["5PM"].sbets += 1;
        } else if (bet_types?.code === "R") {
          result.d3["5PM"].rbets += 1;
        }
        result.d3["5PM"].amount += bet_amount || 0;
      } else if (
        lotto_types?.draw_time &&
        lotto_types.draw_time === "21:00:00"
      ) {
        if (bet_types?.code === "S") {
          result.d3["9PM"].sbets += 1;
        } else if (bet_types?.code === "R") {
          result.d3["9PM"].rbets += 1;
        }
        result.d3["9PM"].amount += bet_amount || 0;
      }
    }
  });
  // Net for LP3 excludes return bet amounts/counts from net totals.
  result.lp3.netBets = result.lp3.normalBets + result.lp3.freeBets;
  result.lp3.netAmount = result.lp3.normalAmount + result.lp3.freeAmount;

  result.d2.net.sbets =
    result.d2["2PM"].sbets + result.d2["5PM"].sbets + result.d2["9PM"].sbets;
  result.d2.net.rbets =
    result.d2["2PM"].rbets + result.d2["5PM"].rbets + result.d2["9PM"].rbets;
  result.d2.net.amount =
    result.d2["2PM"].amount + result.d2["5PM"].amount + result.d2["9PM"].amount;

  result.d3.net.sbets =
    result.d3["2PM"].sbets + result.d3["5PM"].sbets + result.d3["9PM"].sbets;
  result.d3.net.rbets =
    result.d3["2PM"].rbets + result.d3["5PM"].rbets + result.d3["9PM"].rbets;
  result.d3.net.amount =
    result.d3["2PM"].amount + result.d3["5PM"].amount + result.d3["9PM"].amount;

  result.overallTotal =
    result.lp3.netAmount + result.d2.net.amount + result.d3.net.amount;
  result.remittance = result.overallTotal * (remittancePercent / 100);
  return result;
};

const normalizeBetPrizeRow = (
  row: BetPrizeSupabaseRow,
): BetPrizeListItem | null => {
  const lottoType = normalizeSingleRelation(row.lotto_types);
  if (!lottoType) return null;

  return {
    id: row.id,
    lotto_types: {
      id: Number(lottoType.id),
      game_type: lottoType.game_type,
      draw_time: lottoType.draw_time,
      name: lottoType.name,
    },
    bet_types: (() => {
      const betType = normalizeSingleRelation(row.bet_types);
      return betType
        ? {
            id: betType.id,
            name: betType.name,
          }
        : undefined;
    })(),
    bet_amount: row.bet_amount,
    prize: row.prize,
    is_active: row.is_active,
    super_jackpot: row.super_jackpot,
    super_jackpot_multiplier: row.super_jackpot_multiplier,
  };
};

export const normalizeBetPrizeRows = (rows: BetPrizeSupabaseRow[] | null) =>
  (rows ?? [])
    .map(normalizeBetPrizeRow)
    .filter((row): row is BetPrizeListItem => row !== null);

export const matchesBetPrizeSearch = (
  prize: BetPrizeListItem,
  searchValue: string,
) => {
  const normalizedSearch = searchValue.trim().toLowerCase();

  if (!normalizedSearch) return true;

  const drawTime = prize.lotto_types.draw_time;
  const formattedDrawTime = formatTo12h(drawTime).toLowerCase();

  return [
    prize.lotto_types.game_type,
    prize.lotto_types.name,
    prize.bet_types?.name ?? "",
    drawTime,
    formattedDrawTime,
  ].some((value) => value.toLowerCase().includes(normalizedSearch));
};

export const sortBetPrizes = (
  prizes: BetPrizeListItem[],
  sortColumn: string,
  ascending: boolean,
) => {
  const sorted = [...prizes].sort((left, right) => {
    if (sortColumn === "game_type") {
      return compareText(
        left.lotto_types.game_type ?? "",
        right.lotto_types.game_type ?? "",
        ascending,
      );
    }

    if (sortColumn === "bet_type_name") {
      return compareText(
        left.bet_types?.name ?? "",
        right.bet_types?.name ?? "",
        ascending,
      );
    }

    if (sortColumn === "draw_time") {
      return compareText(
        left.lotto_types.draw_time ?? "",
        right.lotto_types.draw_time ?? "",
        ascending,
      );
    }

    if (sortColumn === "name") {
      return compareText(
        left.lotto_types.name ?? "",
        right.lotto_types.name ?? "",
        ascending,
      );
    }

    if (sortColumn === "bet_amount") {
      return compareNumber(
        left.bet_amount ?? 0,
        right.bet_amount ?? 0,
        ascending,
      );
    }

    if (sortColumn === "prize") {
      return compareNumber(left.prize ?? 0, right.prize ?? 0, ascending);
    }

    return compareText(String(left.id), String(right.id), ascending);
  });

  return sorted;
};

export const isRambolito3 = (betNumbers: number[]) => {
  const counts = betNumbers.reduce(
    (acc, n) => {
      acc[n] = (acc[n] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );
  const uniqueCounts = Object.values(counts);

  return uniqueCounts.length === 2 && uniqueCounts.includes(2);
};
