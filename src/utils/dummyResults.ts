import { supabase } from "../db/supabase";
import type {
  DummyResultDetailPayload,
  DummyWinnerRecord,
  DummyWinnerValues,
} from "../types/dummyResults";
import { mapWinnerRows, type WinnerBetRow } from "./winners";

export const validateDummyWinner = (values: DummyWinnerValues) => {
  const text = {
    admin: values.admin.trim(),
    bettor_name: values.bettor_name.trim(),
    bet: values.bet.trim(),
    remarks: values.remarks.trim(),
  };
  for (const [field, value] of Object.entries(text)) {
    const max = field === "remarks" ? 500 : 200;
    if (!value || [...value].length > max)
      throw new Error(
        `${field.replace("_", " ")} is required and must not exceed ${max} characters.`,
      );
  }
  const amount = values.prize.trim();
  const prize = Number(amount);
  if (
    !/^\d+(\.\d{1,2})?$/.test(amount) ||
    !Number.isFinite(prize) ||
    prize <= 0 ||
    prize > 999999999999.99
  ) {
    throw new Error(
      "Prize must be positive, no more than 999999999999.99, with up to two decimal places.",
    );
  }
  return { ...text, prize };
};

export const fetchDummyWinners = async (
  resultId: number,
  signal?: AbortSignal,
) => {
  const rows: DummyWinnerRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase
      .from("dummy_results")
      .select(
        "id, draw_result_id, admin, bettor_name, bet, remarks, prize, created_by, created_at, updated_at",
      )
      .eq("draw_result_id", resultId)
      .order("created_at")
      .order("id")
      .range(offset, offset + 499);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data as DummyWinnerRecord[]));
    if (data.length < 500) return rows;
  }
};

export const fetchDummyResult = async (
  resultId: number,
  signal: AbortSignal,
) => {
  const bets: WinnerBetRow[] = [];
  let first: DummyResultDetailPayload | null = null;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .rpc("get_dummy_result_detail", {
        p_result_id: resultId,
        p_offset: offset,
        p_limit: 500,
      })
      .abortSignal(signal);
    if (error) throw error;
    const page = data as DummyResultDetailPayload;
    first ??= page;
    bets.push(...page.winners);
    if (!page.hasMore) break;
  }
  return {
    result: first.result,
    winners: mapWinnerRows(bets, {
      twoDSpecialContext: first.twoDSpecialContext,
    }),
  };
};

export const saveDummyWinner = async (
  resultId: number,
  id: string | null,
  values: DummyWinnerValues,
) => {
  const fields = validateDummyWinner(values);
  const query = id
    ? supabase
        .from("dummy_results")
        .update(fields)
        .eq("id", id)
        .eq("draw_result_id", resultId)
    : supabase
        .from("dummy_results")
        .insert({ ...fields, draw_result_id: resultId });
  const { data, error } = await query.select("id").single();
  if (error) throw error;
  return data;
};

export const deleteDummyWinner = async (resultId: number, id: string) => {
  const { error } = await supabase
    .from("dummy_results")
    .delete()
    .eq("id", id)
    .eq("draw_result_id", resultId)
    .select("id")
    .single();
  if (error) throw error;
};
