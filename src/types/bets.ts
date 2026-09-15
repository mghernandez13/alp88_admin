import type { BetPrize } from "./api";
import type { ModalProps } from "./generic";

export interface BetTableRecord {
  id: string;
  addedBy: string;
  dateTime: string;
  refId: string;
  dummyBet: boolean;
  combination: string;
  hit?: string;
  prize?: string;
  drawDate: string;
  bet: string;
  agent: string;
}

export interface UploadDummyBetModalProps extends ModalProps {
  agentOptions: { label: string; value: string; id?: string; level?: number }[];
  onUploadSuccess?: () => void;
}

export type AggregatedBetsResponse = {
  remittance: number;
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
  d2: {
    "2PM": { sbets: number; rbets: number; amount: number };
    "5PM": { sbets: number; rbets: number; amount: number };
    "9PM": { sbets: number; rbets: number; amount: number };
    net: { sbets: number; rbets: number; amount: number };
  };
  d3: {
    "2PM": { sbets: number; rbets: number; amount: number };
    "5PM": { sbets: number; rbets: number; amount: number };
    "9PM": { sbets: number; rbets: number; amount: number };
    net: { sbets: number; rbets: number; amount: number };
  };
};

export type BetPrizeListItem = BetPrize;

export type TableError = {
  name: string;
  message: string;
};

export type BetPrizeRelation = {
  id: string | number;
  game_type: string;
  draw_time: string;
  name: string;
};

export type BetTypeRelation = {
  id: string;
  name: string;
};

export type BetPrizeSupabaseRow = {
  id: string;
  lotto_types: BetPrizeRelation | BetPrizeRelation[] | null;
  bet_types: BetTypeRelation | BetTypeRelation[] | null;
  bet_amount: number;
  prize: number;
  is_active: boolean;
  super_jackpot?: boolean;
  super_jackpot_multiplier?: number;
};

export type BetRelation<T> = T | T[] | null;

export type BetSupabaseRow = {
  id: string;
  created_by?: string | null;
  lotto_types: BetRelation<{
    id: string;
    name: string;
    draw_time: string;
    game_type: string;
  }>;
  bet_types: BetRelation<{
    id: string;
    draw_time: string;
    name: string;
    code: string;
  }>;
  profiles: BetRelation<{
    full_name: string;
  }>;
  bet_amount: number;
  combination: string;
  hit: boolean;
  prize_amount: number;
  bettor_name: string;
  is_super_jackpot: boolean;
  is_return_bet: boolean;
  created_at: string;
  is_dummy_bet: boolean;
};
