import type { TwoDSpecialWinnerContext, WinnerBetRow } from "../utils/winners";

export interface DummyResultHeader {
  id: number;
  draw_date: string;
  draw_type: number;
  combination: string;
  lotto_types: {
    id: number;
    name: string;
    game_type: string;
    logo_image: string | null;
  };
}

export interface DummyResultsIndexPayload {
  rows: DummyResultHeader[];
  totalCount: number;
  drawTypes: { id: number; name: string; count: number }[];
}

export interface DummyResultDetailPayload {
  result: DummyResultHeader | null;
  winners: WinnerBetRow[];
  hasMore: boolean;
  twoDSpecialContext: TwoDSpecialWinnerContext | null;
}

export interface DummyWinnerValues {
  admin: string;
  bettor_name: string;
  bet: string;
  remarks: string;
  prize: string;
}

export interface DummyWinnerRecord extends Omit<DummyWinnerValues, "prize"> {
  id: string;
  draw_result_id: number;
  prize: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}
