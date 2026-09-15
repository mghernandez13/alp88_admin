import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../db/supabase";
import Headline from "../../components/generic/Headline";
import AdminTemplate from "../../templates/AdminTemplate";
import { useParams } from "react-router-dom";
import { useQuery, useLazyQuery, useMutation } from "@apollo/client/react";
import { GET_RESULTS } from "../../graphql/queries/results";
import type {
  ResultsQueryData,
  ResultsQueryVariables,
} from "../../types/results";
import type { BetsQueryData, QueryParamsVariables } from "../../types/api";
import { GET_BETS } from "../../graphql/queries/bets";
import Skeleton from "../../components/generic/Skeleton";
import ResultsActionsTable from "../../components/results/ResultsActionsTable";
import WinningBetsTable from "../../components/results/WinningBetsTable";
import UserActionsDropdown from "../../components/results/UserActionsDropdown";
import Swal from "sweetalert2";
import LoadingScreen from "../../components/LoadingScreen";
import { CREATE_DRAW_RESULTS_LOG } from "../../graphql/queries/resultsLogs";
import { UserAuth } from "../../components/context/AuthContext";
import EditWinningCombinationModal from "../../components/modals/results/EditWinningCombinationModal";
import WinnerImagePreviewModal from "../../components/modals/results/WinnerImagePreviewModal.tsx";
import type { WinnerImageAsset } from "../../utils/winners";

const ResultsDetailsPage: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const { session } = UserAuth();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [winnerPreviewAsset, setWinnerPreviewAsset] = useState<WinnerImageAsset | null>(null);
  const [winnerPreviewTitle, setWinnerPreviewTitle] = useState("");
  const userId = session?.user?.id;

  // Use useLazyQuery for manual triggering
  const [fetchBets, { data: betsData }] = useLazyQuery<
    BetsQueryData,
    QueryParamsVariables
  >(GET_BETS, {
    fetchPolicy: "network-only",
  });
  const [createResultLog] = useMutation(CREATE_DRAW_RESULTS_LOG);

  // Apollo query to fetch result details by resultId
  const { data, loading } = useQuery<ResultsQueryData, ResultsQueryVariables>(
    GET_RESULTS,
    {
      variables: {
        first: 1,
        offset: 0,
        filter: resultId ? { id: { eq: parseInt(resultId) } } : undefined,
        sortOrder: undefined,
        searchTerm: "",
      },
      skip: !resultId,
      fetchPolicy: "cache-and-network",
    },
  );

  // Fetch jackpot winners (hit=true, is_return_bet=false)
  const [fetchJackpotWinners, { data: jackpotData }] = useLazyQuery<
    BetsQueryData,
    QueryParamsVariables
  >(GET_BETS, { fetchPolicy: "network-only" });

  // Fetch RB winners (hit=true, is_return_bet=true)
  const [fetchRBWinners, { data: rbData }] = useLazyQuery<
    BetsQueryData,
    QueryParamsVariables
  >(GET_BETS, { fetchPolicy: "network-only" });

  const resultNode = data?.draw_resultsCollection?.edges?.[0]?.node;
  const lottoTypeId = resultNode?.lotto_types.id;
  const resultDrawDate = resultNode?.draw_date;
  const combination = resultNode?.combination;
  const gametype = resultNode?.lotto_types.game_type;
  const logoImage = resultNode?.lotto_types.logo_image;

  const totalResultBets = betsData?.betsCollection?.totalCount ?? 0;
  const jackpotWinners = jackpotData?.betsCollection?.totalCount ?? 0;
  const rbWinners = rbData?.betsCollection?.totalCount ?? 0;

  const handleWinnerImagePreview = useCallback(
    (asset: WinnerImageAsset, title: string) => {
      winnerPreviewAsset?.revoke();
      setWinnerPreviewAsset(asset);
      setWinnerPreviewTitle(title);
    },
    [winnerPreviewAsset],
  );

  const closeWinnerPreview = useCallback(() => {
    winnerPreviewAsset?.revoke();
    setWinnerPreviewAsset(null);
    setWinnerPreviewTitle("");
  }, [winnerPreviewAsset]);

  const handleInvokeProcessBets = useCallback(
    async (newCombination?: string) => {
      const { data, error } = await supabase.functions.invoke(
        "enqueue-process-bets",
        {
          body: {
            resultId: resultId ? parseInt(resultId) : undefined,
            lottoTypeId: lottoTypeId ? parseInt(lottoTypeId) : undefined,
            resultDrawDate,
            combination: newCombination ?? combination,
            createdBy: userId,
          },
        },
      );

      if (error) {
        throw new Error(
          `Error invoking process bets function: ${error.message}`,
        );
      }

      if (data?.success) {
        Swal.fire({
          icon: "success",
          title: "Process Bets",
          text: `Bets processed successfully!`,
        });
      } else {
        Swal.fire({
          icon: "info",
          title: "Process Bets",
          text: data?.error || "No bets were processed.",
        });
      }
    },
    [combination, lottoTypeId, resultDrawDate, resultId, userId],
  );

  const handleProcessBets = useCallback(
    async (newCombination?: string) => {
      const safeCombination =
        typeof newCombination === "string" ? newCombination : undefined;

      setIsLoading(true);
      if (
        !lottoTypeId ||
        !resultDrawDate ||
        !(safeCombination ?? combination)
      ) {
        Swal.fire({
          icon: "error",
          title: "Process Bets",
          text: "Missing lotto type, draw date, or winning combination. Cannot process bets.",
        });
        setIsLoading(false);
        return;
      }

      try {
        await createResultLog({
          variables: {
            name: `PROCESS BETS`,
            status: "STARTED",
            created_by: userId, // Replace with actual user ID
            draw_result_id: resultId,
          },
        });

        await handleInvokeProcessBets(safeCombination);
      } catch (err: unknown) {
        await createResultLog({
          variables: {
            name: `PROCESS BETS`,
            status: "FAILED",
            created_by: userId, // Replace with actual user ID
            draw_result_id: resultId,
          },
        });
        const errorMsg =
          err instanceof Error ? err.message : "An unexpected error occurred.";

        Swal.fire({
          icon: "error",
          title: "Process Bets",
          text: errorMsg,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      lottoTypeId,
      resultDrawDate,
      combination,
      createResultLog,
      userId,
      resultId,
      handleInvokeProcessBets,
    ],
  );

  // Fetch all bets for the result (for total bets)
  useEffect(() => {
    if (lottoTypeId && resultDrawDate) {
      fetchBets({
        variables: {
          filter: {
            and: [
              { lotto_type_id: { eq: lottoTypeId } },
              {
                created_at: {
                  gte: resultDrawDate + "T00:00:00",
                  lte: resultDrawDate + "T23:59:59.999",
                },
              },
              {
                bet_status: { eq: "completed" },
                is_archive: { eq: false },
              },
            ],
          },
          searchTerm: "%",
          sortOrder: [],
        },
      });
    }
  }, [fetchBets, lottoTypeId, resultDrawDate]);

  useEffect(() => {
    if (lottoTypeId && resultDrawDate) {
      fetchJackpotWinners({
        variables: {
          filter: {
            and: [
              { lotto_type_id: { eq: lottoTypeId } },
              {
                created_at: {
                  gte: resultDrawDate + "T00:00:00",
                  lte: resultDrawDate + "T23:59:59.999",
                },
              },
              { hit: { eq: true } },
              { is_return_bet: { eq: false } },
              {
                bet_status: { eq: "completed" },
              },
              {
                is_archive: { eq: false },
              },
            ],
          },
          searchTerm: "%",
          sortOrder: [],
        },
      });
      fetchRBWinners({
        variables: {
          filter: {
            and: [
              { lotto_type_id: { eq: lottoTypeId } },
              {
                created_at: {
                  gte: resultDrawDate + "T00:00:00",
                  lte: resultDrawDate + "T23:59:59.999",
                },
              },
              { hit: { eq: true } },
              { is_return_bet: { eq: true } },
              { is_archive: { eq: false } },
              {
                bet_status: { eq: "completed" },
              },
            ],
          },
          searchTerm: "%",
          sortOrder: [],
        },
      });
    }
  }, [fetchJackpotWinners, fetchRBWinners, lottoTypeId, resultDrawDate]);

  return isLoading ? (
    <LoadingScreen />
  ) : (
    <AdminTemplate>
      <div className="flex-column w-full">
        <div className="p-6">
          {/* Header, Back Button, and Actions */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <button
                className="bg-black text-white px-3 py-2 rounded hover:bg-gray-900 flex items-center"
                onClick={() => window.history.back()}
                aria-label="Back"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5 mr-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
                Back
              </button>
              <Headline>
                Result Details: {resultNode?.draw_date || "-"}
              </Headline>
            </div>
            <UserActionsDropdown
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              resultId={resultNode?.id}
              lottoTypeId={resultNode?.lotto_types?.id}
              resultDrawDate={resultNode?.draw_date}
              winningCombination={resultNode?.combination}
              logoImageSrc={logoImage}
              userId={userId}
              setEditModalOpen={setEditModalOpen}
              handleProcessBets={handleProcessBets}
              onWinnerImagePreview={handleWinnerImagePreview}
            />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black rounded-lg p-6 mb-8 text-white">
            <div>
              <div className="text-xs text-gray-400">Draw Date</div>
              <div className="py-1">
                {loading ? (
                  <Skeleton width={100} />
                ) : (
                  resultNode?.draw_date || "-"
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Draw Type</div>
              <div className="py-1">
                {loading ? (
                  <Skeleton width={100} />
                ) : (
                  resultNode?.lotto_types?.name || "-"
                )}
              </div>
            </div>
            {logoImage && (
              <div className="flex">
                <img
                  src={logoImage}
                  alt="Lotto Type Logo"
                  className="h-24 w-24 object-contain"
                />
              </div>
            )}
            <div>
              <div className="text-xs text-gray-400">Combination</div>
              <div className="py-1">
                {loading ? (
                  <Skeleton width={100} />
                ) : (
                  resultNode?.combination || "-"
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Bets</div>
              <div className="py-1">
                {loading ? <Skeleton width={50} /> : (totalResultBets ?? "-")}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Jackpot Winners</div>
              <div className="py-1">
                {loading ? <Skeleton width={50} /> : jackpotWinners}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">RB Winners</div>
              <div className="py-1">
                {loading ? <Skeleton width={50} /> : rbWinners}
              </div>
            </div>
            <div className="flex items-center">
              {/* <a href="#" className="text-blue-400 hover:underline">
                View Summary &gt;&gt;
              </a> */}
            </div>
          </div>

          {/* Winning Bets Section */}
          <WinningBetsTable
            lottoTypeId={lottoTypeId ?? ""}
            drawDate={resultDrawDate ?? ""}
            winningCombination={combination ?? ""}
          />
        </div>

        {/* Actions Table Section */}
        <ResultsActionsTable resultId={resultId} />
      </div>
      <EditWinningCombinationModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        resultId={resultNode?.id}
        currentCombination={combination ?? ""}
        drawDate={resultDrawDate ?? ""}
        drawType={resultNode?.lotto_types?.name ?? ""}
        gameType={gametype}
        numberOfDigits={resultNode?.lotto_types?.number_of_digits ?? 6}
        minNumber={resultNode?.lotto_types?.min_number}
        maxNumber={resultNode?.lotto_types?.max_number}
        onSuccess={handleProcessBets}
      />
      <WinnerImagePreviewModal
        isOpen={Boolean(winnerPreviewAsset)}
        title={winnerPreviewTitle}
        imageUrl={winnerPreviewAsset?.imageUrl ?? ""}
        fileName={winnerPreviewAsset?.fileName ?? ""}
        onClose={closeWinnerPreview}
        onDownload={() => winnerPreviewAsset?.download()}
      />
    </AdminTemplate>
  );
};

export default ResultsDetailsPage;
