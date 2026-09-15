import AdminTemplate from "../../templates/AdminTemplate";
import DataTable from "../../components/generic/table";
import Headline from "../../components/generic/Headline";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { GET_LOTTO_TYPES } from "../../graphql/queries/lotto";
import { GET_BET_TYPES } from "../../graphql/queries/betTypes";
import type { Bets, BetTypesQueryData, LottoQueryData } from "../../types/api";
import { Eye } from "lucide-react";
import ViewBetModal from "../../components/modals/bets/ViewBetModal";
import { formatDateTime12h, formatTo12h } from "../../utils/helper";
import { formatCurrency } from "../../utils/currency";
import IconTableActionButton from "../../components/generic/buttons/IconTableActionButton";
import { supabase } from "../../db/supabase";
import { isRambolito3 } from "../../utils/bets";

type BetRelation<T> = T | T[] | null;

type BetSupabaseRow = {
  id: string;
  created_by: string | null;
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

type TableError = {
  name: string;
  message: string;
};

const BetsPage: React.FC = () => {
  const [pageSize, setPageSize] = useState(5);
  const [selectedLottoTypes, setSelectedLottoTypes] = useState<string[]>([]);
  const [selectedBetTypes, setSelectedBetTypes] = useState<string[]>([]);
  // Date range filter state
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  // View modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<Bets | null>(null);
  const [allBets, setAllBets] = useState<Bets[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<TableError | null>(null);
  // Fetch lotto types and bet types for filters
  const { data: lottoTypesData } = useQuery<LottoQueryData>(GET_LOTTO_TYPES, {
    variables: {
      filter: {
        and: [{ is_archive: { eq: false } }, { is_active: { eq: true } }],
      },
    },
    fetchPolicy: "network-only",
  });
  const { data: betTypesData } = useQuery<BetTypesQueryData>(GET_BET_TYPES, {
    variables: {
      filter: {
        and: [{ is_archive: { eq: false } }, { is_active: { eq: true } }],
      },
    },
    fetchPolicy: "network-only",
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const currentPage = Number(searchParams.get("page")) || 1;
  const offset = (currentPage - 1) * pageSize;

  const normalizeRelation = <T,>(value: BetRelation<T>): T | null => {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  };

  const fetchBets = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("bets")
      .select(
        `
          id,
          created_by,
          lotto_types!inner(id, name, draw_time, game_type),
          bet_types(id, draw_time, name, code),
          profiles:agent_id(full_name),
          bet_amount,
          combination,
          hit,
          prize_amount,
          bettor_name,
          is_super_jackpot,
          is_return_bet,
          created_at,
          is_dummy_bet
        `,
        { count: "exact" },
      )
      .eq("is_archive", false)
      .eq("is_dummy_bet", false)
      .eq("bet_status", "completed")
      .order("created_at", { ascending: false });

    if (selectedLottoTypes.length > 0) {
      query = query.in("lotto_type_id", selectedLottoTypes);
    }

    if (selectedBetTypes.length > 0) {
      query = query.in("bet_type_id", selectedBetTypes);
    }

    if (dateRange.start && dateRange.end) {
      query = query
        .gte("created_at", dateRange.start)
        .lte("created_at", `${dateRange.end}T23:59:59.999`);
    }

    const trimmedSearchQuery = searchQuery.trim();
    if (trimmedSearchQuery) {
      const escapedSearchQuery = trimmedSearchQuery
        .replace(/[%_]/g, "\\$&")
        .replace(/[(),]/g, "");
      const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        trimmedSearchQuery,
      );

      const searchFilter = looksLikeUuid
        ? `id.eq.${trimmedSearchQuery},combination.ilike.%${escapedSearchQuery}%,bettor_name.ilike.%${escapedSearchQuery}%`
        : `combination.ilike.%${escapedSearchQuery}%,bettor_name.ilike.%${escapedSearchQuery}%`;

      const { data: matchingAgents } = await supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", `%${escapedSearchQuery}%`);
      const matchingAgentIds = (matchingAgents ?? []).map((agent) => agent.id);

      query = query.or(
        matchingAgentIds.length > 0
          ? `${searchFilter},agent_id.in.(${matchingAgentIds.join(",")})`
          : searchFilter,
      );
    }

    const { data, count, error: listError } = await query.range(
      offset,
      offset + pageSize - 1,
    );

    if (listError) {
      setAllBets([]);
      setTotalCount(0);
      setError({ name: "SupabaseError", message: listError.message });
      setLoading(false);
      return;
    }

    const creatorIds = [
      ...new Set((data ?? []).map((row) => row?.created_by).filter(Boolean)),
    ] as string[];

    let creatorProfiles: Record<string, string> = {};

    if (creatorIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", creatorIds);

      if (!profilesError) {
        creatorProfiles = Object.fromEntries(
          (
            (profilesData ?? []) as Array<{
              id: string;
              full_name: string | null;
            }>
          ).map((profile) => [profile.id, profile.full_name || "-"]),
        );
      }
    }

    const rows = ((data ?? []) as BetSupabaseRow[]).map((row) => ({
      id: row.id,
      lotto_types: normalizeRelation(row.lotto_types) ?? {
        id: "",
        name: "",
        draw_time: "",
        game_type: "",
      },
      bet_types: normalizeRelation(row.bet_types) ?? {
        id: "",
        draw_time: "",
        name: "Normal Bet",
        code: "",
      },
      profiles: normalizeRelation(row.profiles) ?? {
        full_name: "-",
      },
      created_by: row.created_by ?? "",
      created_by_profile: {
        full_name: row.created_by
          ? (creatorProfiles[row.created_by] ?? "-")
          : "-",
      },
      bet_amount: row.bet_amount,
      combination: row.combination,
      hit: row.hit,
      prize_amount: row.prize_amount,
      bettor_name: row.bettor_name,
      is_super_jackpot: row.is_super_jackpot,
      is_return_bet: row.is_return_bet,
      created_at: row.created_at,
      is_dummy_bet: row.is_dummy_bet,
    }));

    setAllBets(rows);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [
    dateRange.end,
    dateRange.start,
    offset,
    pageSize,
    searchQuery,
    selectedBetTypes,
    selectedLottoTypes,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBets();
  }, [fetchBets]);

  const paginatedBets = allBets;

  const columns = useMemo(() => {
    return {
      length: 7,
      render: (
        <>
          <th scope="col" className="px-4 py-3">
            Details
          </th>
          <th scope="col" className="px-4 py-3">
            Combination
          </th>
          <th scope="col" className="px-4 py-3">
            Hit
          </th>
          <th scope="col" className="px-4 py-3">
            Prize
          </th>
          <th scope="col" className="px-4 py-3">
            Draw
          </th>
          <th scope="col" className="px-4 py-3">
            Bet
          </th>
          <th scope="col" className="px-4 py-3">
            Agent
          </th>
        </>
      ),
    };
  }, []);

  const tableData = useMemo(() => {
    return paginatedBets.map((item) => {
      return {
        details: (
          <div>
            <div>
              Added By:{" "}
              {item.created_by_profile?.full_name ||
                item.profiles?.full_name ||
                "-"}
            </div>
            <div>On: {formatDateTime12h(item.created_at)}</div>
            <div>RefID: {item.id}</div>
            <div>Bettor Name: {item.bettor_name}</div>
          </div>
        ),
        combination: item.combination,
        hit: item.hit ? "Yes" : "No",
        prize: formatCurrency(item.prize_amount) || "--",
        drawDate: (
          <div>
            <div>
              {item.lotto_types?.draw_time
                ? formatTo12h(item.lotto_types.draw_time)
                : ""}
            </div>
            <div>{item.lotto_types?.name}</div>
          </div>
        ),
        bet: (
          <div>
            <div>PHP {item.bet_amount}</div>
            <div>
              {item.bet_types?.name.toLowerCase() === "rambolito"
                ? isRambolito3(
                    item.combination.split("-").map((item) => Number(item)),
                  )
                  ? "Rambolito 3"
                  : "Rambolito 6"
                : item.bet_types?.name}
            </div>
          </div>
        ),
        agent: item.profiles.full_name,
        action: (
          <td className="flex gap-2 px-4 py-3 items-center justify-end">
            <div className="relative flex flex-col items-center group">
              <IconTableActionButton
                data-tooltip-target="tooltip-default"
                onClick={() => {
                  setSelectedBet(item);
                  setViewModalOpen(true);
                }}
                type="button"
              >
                <Eye className="w-5 h-5" />
              </IconTableActionButton>

              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center">
                <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-gray-900 shadow-lg rounded-md">
                  View
                </span>
                <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-900"></div>
              </div>
            </div>
          </td>
        ),
      };
    });
  }, [paginatedBets]);

  const hasNextPage = offset + paginatedBets.length < totalCount;

  // Prepare filter data for TableHeader
  // Use master data for filter counts (imitate agents table)
  const lottoTypeOptions =
    lottoTypesData &&
    lottoTypesData.lotto_typesCollection &&
    Array.isArray(lottoTypesData.lotto_typesCollection.edges)
      ? lottoTypesData.lotto_typesCollection.edges.map((edge) => ({
          name: edge.node.name,
          value: edge.node.id,
          count: edge.node?.betsCollection?.totalCount ?? 0,
        }))
      : [];
  const betTypeOptions =
    betTypesData &&
    betTypesData.bet_typesCollection &&
    Array.isArray(betTypesData.bet_typesCollection.edges)
      ? betTypesData.bet_typesCollection.edges.map((edge) => ({
          name: edge.node.name,
          value: edge.node.id,
          count: edge.node?.betsCollection?.totalCount ?? 0,
        }))
      : [];

  // Compose tableFilter prop for TableHeader as an object
  const tableFilter = {
    lottoType: {
      label: "Lotto Type",
      selectedFilter: selectedLottoTypes,
      setSelectedFilter: setSelectedLottoTypes,
      data: lottoTypeOptions,
    },
    betType: {
      label: "Bet Type",
      selectedFilter: selectedBetTypes,
      setSelectedFilter: setSelectedBetTypes,
      data: betTypeOptions,
    },
    dateRange: {
      label: "Date Filter",
      selectedFilter: [], // Not used for date
      setSelectedFilter: () => {}, // Not used for date
      data: [
        {
          name: "Date Filter",
          value: "date-filter",
          count: 0,
          start: dateRange.start,
          end: dateRange.end,
          setDateRange,
        },
      ],
    },
  };

  return (
    <AdminTemplate>
      <div className="flex-col w-full sm:mx-2 py-2 md:mx-10">
        <div className="mb-5">
          <Headline>Bets</Headline>
        </div>
        <DataTable
          loading={loading}
          error={error ?? undefined}
          tableName="Bets"
          columns={columns}
          data={tableData}
          pagination={{
            currentPage,
            pageSize,
            totalCount,
          }}
          tableFilter={tableFilter}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          hasNextPage={hasNextPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          bulkAction={false}
        />
        <ViewBetModal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          bet={selectedBet}
        />
      </div>
    </AdminTemplate>
  );
};

export default BetsPage;
