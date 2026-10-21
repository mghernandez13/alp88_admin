import type { LottoType } from "./api";

export interface DrawResult {
  id: number;
  draw_date: string;
  draw_type: number;
  combination: string;
  created_at: string;
  is_archive: boolean;
  lotto_types: Pick<
    LottoType,
    | "id"
    | "name"
    | "game_type"
    | "max_number"
    | "min_number"
    | "number_of_digits"
    | "logo_image"
  >;
}

export interface ResultLottoTypesQueryData {
  lotto_typesCollection: {
    edges: Array<{
      node: Pick<LottoType, "id" | "name" | "draw_resultsCollection">;
    }>;
    pageInfo: {
      hasNextPage: boolean;
    };
  };
}

export interface ResultsQueryData {
  draw_resultsCollection: {
    edges: Array<{
      node: DrawResult;
      cursor: string;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    totalCount: number;
  };
}

export interface ResultsQueryVariables {
  first: number;
  offset: number;
  searchTerm: string;
  sortOrder?: Record<string, string>[];
  filter?: Record<string, unknown>;
}

export interface CreateResultVariables {
  draw_date: string;
  draw_type: number;
  combination: string;
}

export interface UpdateResultVariables {
  id: number;
  draw_date: string;
  draw_type: number;
  combination: string;
}

export interface DeleteResultVariables {
  id: number;
}
