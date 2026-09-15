import type { AggregatedBetsResponse } from "./bets";

// --- Draw Results Logs Types ---
export interface DrawResultsLog {
  id: string;
  name: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  draw_result_id: number;
  profiles: {
    full_name: string;
  };
  draw_results: {
    draw_date: string;
  };
}

export interface DrawResultsLogsQueryData {
  draw_results_logsCollection: {
    edges: Array<{
      node: DrawResultsLog;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    totalCount?: number;
  };
}
export interface UserTypes {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  permission_id: string;
  avatar_url: string;
  is_quota_based: boolean;
  remittance_percent: number;
  betsCollection: {
    edges: BetsNode[];
    pageInfo?: PageInfo;
    totalCount?: number;
  };
  upline: string;
  status: boolean;
}

export interface UserNode {
  node: UserTypes;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface UsersQueryData {
  profilesCollection: {
    edges: UserNode[];
    pageInfo?: PageInfo;
    totalCount?: number;
  };
}

export interface UsersQueryVariables {
  first: number;
  offset: number;
  searchTerm: string;
  roleFilter?: string[];
  sortOrder: Record<string, string>[];
}

export interface GetUserQueryVariables {
  userId: string;
}

export interface GetUplineListVariables {
  currentId?: string;
}

export interface LottoType {
  id: string;
  game_type: string;
  draw_time: string;
  cutoff_time: string | null;
  name: string;
  days_active: string[];
  is_active: boolean;
  number_of_digits: number;
  min_number: number;
  max_number: number;
  logo_image?: string;
  betsCollection: {
    totalCount: number;
  };
  draw_resultsCollection: {
    totalCount: number;
  };
}

export interface LottoQueryData {
  lotto_typesCollection: {
    edges: Array<{
      node: LottoType;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

export interface Settings {
  id: number;
  name: string;
  value: string;
  is_active: boolean;
}

export interface SettingsQueryData {
  settingsCollection: {
    edges: Array<{
      node: Settings;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

export interface LottoQueryVariables {
  first: number;
  offset: number;
  searchTerm?: string;
  filter?: Record<string, unknown>;
  sortOrder?: Record<string, string>[];
}

export interface GetLottoTypeQueryVariables {
  lottoTypeId: string;
}

export interface BetType {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  game_type?: string;
  draw_time?: string;
  betsCollection: {
    totalCount: number;
  };
}

export interface BetTypesQueryData {
  bet_typesCollection: {
    edges: Array<{
      node: BetType;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

export interface BetTypesQueryVariables {
  first: number;
  offset: number;
  filter?: Record<string, unknown>;
  sortOrder?: Record<string, string>[];
}

export interface GetBetTypeQueryVariables {
  betTypeId: string;
}

export interface BetPrize {
  id: string;
  lotto_types: {
    id: number;
    game_type: string;
    draw_time: string;
    name: string;
  };
  bet_types?: {
    id: string;
    name: string;
  };
  bet_amount: number;
  prize: number;
  super_jackpot?: boolean;
  super_jackpot_multiplier?: number;
  is_active: boolean;
}

export interface BetPrizesQueryData {
  bet_prizesCollection: {
    edges: Array<{
      node: BetPrize;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

export interface BetPrizesQueryVariables {
  first: number;
  offset: number;
  filter?: Record<string, unknown>;
  orderBy?: Record<string, string>[];
}

export interface GetBetTypeQueryVariables {
  betTypeId: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  is_active: boolean;
  users: {
    totalCount: number;
  };
}

export interface RolesQueryData {
  permissionsCollection: {
    edges: Array<{
      node: Role;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

export interface RolesQueryVariables {
  first?: number;
  offset?: number;
  searchTerm?: string;
  sortOrder?: Record<string, string>[];
  isActive?: boolean;
}

export interface GetRoleQueryVariables {
  roleId?: string;
}

export interface Bets {
  id: string;
  created_by?: string | null;
  lotto_types: {
    id: string;
    name: string;
    draw_time: string;
    game_type: string;
  };
  bet_types: {
    id: string;
    draw_time: string;
    name: string;
    code: string;
  };
  bet_amount: number;
  combination: string;
  profiles: {
    full_name: string;
  };
  created_by_profile?: {
    full_name: string;
  };
  is_dummy_bet: boolean;
  hit: boolean;
  prize_amount: number;
  bettor_name: string;
  is_super_jackpot: boolean;
  is_return_bet: boolean;
  created_at: string;
}

export interface BetsNode {
  node: Bets;
}

export interface BetsQueryData {
  betsCollection: {
    edges: BetsNode[];
    pageInfo?: PageInfo;
    totalCount?: number;
  };
}

export interface QueryParamsVariables {
  first?: number;
  offset?: number;
  searchTerm?: string;
  filter?: Record<string, unknown>;
  sortOrder?: Record<string, string>[];
}

export interface NotificationItem {
  id: number;
  sender: string;
  receiver: string | null;
  title: string;
  content: string;
  created_at: string;
  unread: boolean;
}

export interface NotificationsQueryData {
  notificationsCollection: {
    edges: Array<{
      node: NotificationItem;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

export interface NotificationsQueryVariables {
  first: number;
  offset: number;
  searchTerm: string;
  receiverId?: string;
  sortOrder?: Record<string, string>[];
  startDate?: string;
  endDate?: string;
}

export interface UpdateBetPrizeMutation {
  updatebet_prizesCollection: {
    records: Array<BetPrize>;
  };
}

export interface Agent {
  id: string;
  full_name: string;
}

export interface AgentNode {
  node: Agent;
}

export interface AgentsQueryData {
  profilesCollection: {
    edges: AgentNode[];
  };
}

export type AgentRow = {
  type: string;
  admin?: UserTypes;
  headAdmin?: UserTypes;
  stats: AggregatedBetsResponse;
};
