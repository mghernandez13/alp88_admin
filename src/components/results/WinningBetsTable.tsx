import type React from "react";
import Input from "../generic/Input";
import { useState, useEffect, useCallback } from "react";
import type { DrawResultsLogsQueryData, Bets } from "../../types/api";
import { useParams } from "react-router-dom";
import Skeleton from "../generic/Skeleton";
import { formatCurrency } from "../../utils/currency";
import ViewBetModal from "../modals/bets/ViewBetModal";
import { supabase } from "../../db/supabase";
import { Eye, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import IconTableActionButton from "../generic/buttons/IconTableActionButton";
import { isRambolito3 } from "../../utils/bets";
import {
  getTwoDSpecialWinnerContext,
  getTwoDSpecialWinnerLabel,
} from "../../utils/winners";

interface WinningBetsTableProps {
  lottoTypeId: string;
  drawDate: string;
  winningCombination: string;
}

type WinningBetRow = {
  id: string;
  lotto_types: {
    id: string;
    game_type: string;
    draw_time: string;
    name: string;
  };
  bet_types?: {
    id: string;
    name: string;
    code: string;
  };
  profiles?: {
    full_name?: string;
  };
  bet_amount: number;
  prize_amount?: number | null;
  combination: string;
  hit: boolean;
  is_dummy_bet: boolean;
  bettor_name: string;
  is_super_jackpot: boolean;
  is_return_bet: boolean;
  created_at: string;
};

type WinningBetListItem = Bets;

type WinningBetViewItem = WinningBetListItem & {
  createdAtLabel: string;
  combinationLabel: string;
  winningCombinationLabel: string;
  hitLabel: string;
  prizeLabel: string;
  betLabel: string;
  agentLabel: string;
  refIdLabel: string;
  dummyBetLabel: string;
  bettorLabel: string;
  betTypeLabel: string;
  searchText: string;
};

const WinningBetsTable: React.FC<WinningBetsTableProps> = ({
  lottoTypeId,
  drawDate,
  winningCombination,
}) => {
  const { resultId } = useParams<{ resultId: string }>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [defaultNoDataMessage, setDefaultNoDataMessage] = useState(
    "No winning bets found",
  );
  const pageSize = 10;

  // State for view modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<WinningBetViewItem | null>(
    null,
  );
  const [allWinningBets, setAllWinningBets] = useState<WinningBetViewItem[]>(
    [],
  );
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [twoDSpecialContext, setTwoDSpecialContext] = useState<Awaited<
    ReturnType<typeof getTwoDSpecialWinnerContext>
  > | null>(null);

  const columns = [
    { name: "Details", field: "details" },
    { name: "Combination", field: "combination" },
    { name: "Hit", field: "hit" },
    { name: "Prize", field: "prize" },
    { name: "Bet", field: "bet" },
    { name: "Agent", field: "agent" },
    { name: "Actions", field: "actions" },
  ];

  const [logsData, setLogsData] = useState<DrawResultsLogsQueryData | null>(
    null,
  );

  const normalizeRelation = <T,>(
    value: T | T[] | null | undefined,
  ): T | null => {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  };

  const buildWinningBetViewItem = useCallback(
    (bet: WinningBetListItem): WinningBetViewItem => {
      const combinationText = bet.combination ?? "";
      const combinationArr = combinationText.split("-").map(Number);
      const isTrio =
        combinationArr.length === 3 &&
        combinationArr[0] === combinationArr[1] &&
        combinationArr[1] === combinationArr[2];
      const bettorName = bet.bettor_name ?? "";
      const betTypeLabel =
        bet.bet_types?.name === "Rambolito"
          ? isRambolito3(combinationArr)
            ? "Rambolito 3"
            : "Rambolito 6"
          : (bet.bet_types?.name ?? "");

      const twoDLabel =
        bet.lotto_types?.game_type?.toUpperCase() === "2D"
          ? getTwoDSpecialWinnerLabel(
              twoDSpecialContext,
              combinationText,
              bet.bet_types?.code ?? "",
            )
          : null;

      const twoDHitSuffix = twoDLabel
        ? twoDLabel.includes("MONTHLY BRACKET")
          ? "Monthly Bracket"
          : "Petsada"
        : null;

      const hitLabel = bet.hit
        ? `${bet.is_return_bet ? "RETURN BET" : bet.is_super_jackpot ? "X3 SUPER JACKPOT" : "JACKPOT"} - ${twoDHitSuffix || (isTrio ? "Trio" : betTypeLabel || "Normal Bet")}`
        : "-";
      const prizeLabel = bet.prize_amount
        ? `PHP ${formatCurrency(bet.prize_amount)}`
        : "-";
      const betLabel = `PHP ${bet.bet_amount}`;
      const agentLabel = bet.profiles?.full_name || "-";
      const refIdLabel = bet.id;
      const dummyBetLabel = bet.is_dummy_bet ? "Yes" : "No";
      const createdAtLabel = new Date(bet.created_at).toLocaleString();
      const winningCombinationLabel = winningCombination;
      const searchText = [
        agentLabel,
        refIdLabel,
        prizeLabel,
        betLabel,
        combinationText,
        bettorName,
        betTypeLabel,
        bet.bet_types?.code ?? "",
        hitLabel,
        `Added By: ${agentLabel}`,
        `RefID: ${refIdLabel}`,
        `DummyBet: ${dummyBetLabel}`,
        `Prize: ${prizeLabel}`,
        `Bet: ${betLabel} ${betTypeLabel || "Normal Bet"} ${bettorName || "-"}`,
        `Hit: ${hitLabel}`,
      ]
        .join(" ")
        .toLowerCase();

      return {
        ...bet,
        createdAtLabel,
        combinationLabel: combinationText,
        winningCombinationLabel,
        hitLabel,
        prizeLabel,
        betLabel,
        agentLabel,
        refIdLabel,
        dummyBetLabel,
        bettorLabel: bettorName || "-",
        betTypeLabel: betTypeLabel || "Normal Bet",
        searchText,
      };
    },
    [twoDSpecialContext, winningCombination],
  );

  useEffect(() => {
    let cancelled = false;

    const loadTwoDSpecialContext = async () => {
      if (!drawDate || !winningCombination) {
        setTwoDSpecialContext(null);
        return;
      }

      try {
        const context = await getTwoDSpecialWinnerContext(
          drawDate,
          winningCombination,
        );

        if (!cancelled) {
          setTwoDSpecialContext(context);
        }
      } catch {
        if (!cancelled) {
          setTwoDSpecialContext(null);
        }
      }
    };

    void loadTwoDSpecialContext();

    return () => {
      cancelled = true;
    };
  }, [drawDate, winningCombination]);

  const handleDeleteDummyBet = useCallback(async (betId: string) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete Dummy Bet",
      text: "Are you sure you want to delete this dummy bet?",
      showCancelButton: true,
      reverseButtons: true,
    });

    if (!confirm.isConfirmed) return;

    const { error } = await supabase
      .from("bets")
      .update({ is_archive: true })
      .eq("id", betId);

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Delete Dummy Bet",
        text: `Error occurred while deleting: ${error.message}`,
      });
      return;
    }

    setAllWinningBets((prev) => prev.filter((bet) => bet.id !== betId));

    Swal.fire({
      icon: "success",
      title: "Delete Dummy Bet",
      text: "Dummy bet successfully deleted!",
    });
  }, []);

  const fetchWinningBets = useCallback(async () => {
    if (!lottoTypeId || !drawDate) return;

    setLoading(true);
    setLoadError(null);

    let query = supabase
      .from("bets")
      .select(
        `
          id,
          lotto_types(id, game_type, draw_time, name),
          bet_types(id, name, code),
          profiles:agent_id(full_name),
          bet_amount,
          prize_amount,
          combination,
          hit,
          is_dummy_bet,
          bettor_name,
          is_super_jackpot,
          is_return_bet,
          created_at
        `,
        { count: "exact" },
      )
      .eq("lotto_type_id", lottoTypeId)
      .eq("hit", true)
      .eq("is_archive", false)
      .gte("created_at", `${drawDate}T00:00:00`)
      .lte("created_at", `${drawDate}T23:59:59.999`)
      .order("created_at", { ascending: false });

    const trimmedSearch = debouncedSearch.trim();
    if (trimmedSearch) {
      const escapedSearch = trimmedSearch
        .replace(/[%_]/g, "\\$&")
        .replace(/[(),]/g, "");
      const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        trimmedSearch,
      );

      const searchFilter = looksLikeUuid
        ? `id.eq.${trimmedSearch},combination.ilike.%${escapedSearch}%,bettor_name.ilike.%${escapedSearch}%`
        : `combination.ilike.%${escapedSearch}%,bettor_name.ilike.%${escapedSearch}%`;

      query = query.or(searchFilter);
    }

    const {
      data: pageData,
      count,
      error: pageError,
    } = await query.range((page - 1) * pageSize, page * pageSize - 1);

    if (pageError) {
      setLoadError(pageError.message);
      setAllWinningBets([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    const rows = ((pageData ?? []) as unknown as WinningBetRow[]).map(
      (bet) => ({
        ...bet,
        lotto_types: normalizeRelation(bet.lotto_types) ?? {
          id: lottoTypeId,
          game_type: "",
          draw_time: "",
          name: "",
        },
        bet_types: normalizeRelation(bet.bet_types) ?? {
          id: "",
          draw_time: "",
          name: "Normal Bet",
          code: "",
        },
        profiles: normalizeRelation(bet.profiles) ?? { full_name: "-" },
      }),
    ) as WinningBetListItem[];

    setAllWinningBets(rows.map(buildWinningBetViewItem));
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [buildWinningBetViewItem, debouncedSearch, drawDate, lottoTypeId, page]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const winningBets = allWinningBets;

  // Reset to page 1 when search changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
    setDefaultNoDataMessage("No Records found");
  }, [search]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!resultId) return;

      const { data } = await supabase
        .from("draw_results_logs")
        .select(
          "id, name, status, created_by, created_at, updated_at, draw_result_id",
        )
        .eq("draw_result_id", parseInt(resultId))
        .eq("name", "PROCESS BETS")
        .order("created_at", { ascending: false })
        .limit(1);

      setLogsData(
        data && data.length > 0
          ? ({
              draw_results_logsCollection: {
                edges: data.map((node) => ({ node, cursor: String(node.id) })),
                pageInfo: { hasNextPage: false, endCursor: null },
                totalCount: data.length,
              },
            } as DrawResultsLogsQueryData)
          : null,
      );
    };

    void fetchLogs();
  }, [resultId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchWinningBets();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchWinningBets]);

  useEffect(() => {
    if (
      logsData?.draw_results_logsCollection?.edges &&
      logsData.draw_results_logsCollection.edges.length > 0
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDefaultNoDataMessage("No winning bets found");
    } else {
      setDefaultNoDataMessage("Winning Bets not yet Processed");
    }
  }, [logsData]);

  return (
    <div className="bg-black rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-lg text-white">Winning Bets</div>
        <div className="w-[350px]">
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-400">
          <thead className="text-xs uppercase bg-[#222222] text-gray-400">
            <tr>
              {columns.map((col) => (
                <th key={col.field} className="px-4 py-2 font-semibold">
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-3">
                  <Skeleton width={"100%"} height={24} />
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-3 text-red-400">
                  {loadError || "Error loading bets"}
                </td>
              </tr>
            ) : winningBets.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-4 text-center">
                  {defaultNoDataMessage}
                </td>
              </tr>
            ) : (
              winningBets.map((bet, idx: number) => (
                <tr
                  key={bet.id || idx}
                  className="border-b border-gray-700 cursor-pointer hover:bg-[#222910]"
                  onClick={() => {
                    setSelectedBet(bet);
                    setViewModalOpen(true);
                  }}
                >
                  <td className="px-4 py-3 align-top">
                    <div>
                      <div>Added By: {bet.agentLabel}</div>
                      <div className="text-xs text-gray-400">
                        On: {bet.createdAtLabel}
                      </div>
                      <div className="text-xs text-gray-400">
                        RefID: {bet.refIdLabel}
                      </div>
                      <div className="text-xs text-gray-400">
                        DummyBet: {bet.dummyBetLabel}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top font-bold">
                    {bet.combinationLabel}
                    <br />
                    {bet.winningCombinationLabel}
                  </td>
                  <td className="px-4 py-3 align-top font-bold">
                    {bet.hitLabel}
                  </td>
                  <td className="px-4 py-3 align-top">{bet.prizeLabel}</td>
                  <td className="px-4 py-3 align-top">
                    {bet.betLabel}
                    <br />
                    <span className="text-xs">{bet.betTypeLabel}</span>
                    <br />
                    <span className="text-xs">{bet.bettorLabel}</span>
                  </td>
                  <td className="px-4 py-3 align-top">{bet.agentLabel}</td>
                  <td
                    className="flex gap-2 px-4 py-3 align-top"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative flex flex-col items-center group">
                      <IconTableActionButton
                        type="button"
                        onClick={() => {
                          setSelectedBet(bet);
                          setViewModalOpen(true);
                        }}
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
                    {bet.is_dummy_bet && (
                      <div className="relative flex flex-col items-center group w-fit">
                        <IconTableActionButton
                          type="button"
                          onClick={() => void handleDeleteDummyBet(bet.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </IconTableActionButton>
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center">
                          <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-gray-900 shadow-lg rounded-md">
                            Delete
                          </span>
                          <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-4">
          <button
            className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-gray-300">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-700 text-white disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
      {/* View Bet Modal */}
      <ViewBetModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedBet(null);
        }}
        bet={selectedBet}
      />
    </div>
  );
};

export default WinningBetsTable;
