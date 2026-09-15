import { useQuery } from "@apollo/client/react";
import React, { useEffect, useState } from "react";
import type { LottoQueryData, LottoQueryVariables } from "../../types/api";
import { GET_LOTTO_TYPES } from "../../graphql/queries/lotto";
import type { BetsSummaryProps } from "../../types/generic";
import {
  getDayNameFromDateString,
  humanizeDateString,
} from "../../utils/datetime";
import { supabase } from "../../db/supabase";
import Skeleton from "../generic/Skeleton";
import PrimaryButton from "../generic/buttons/Primary";
import Loading from "../generic/icons/Loading";
import {
  createWinnerImageAsset,
  fetchWinnerRows,
  type WinnerImageAsset,
} from "../../utils/winners";
import Swal from "sweetalert2";
import WinnerImagePreviewModal from "../modals/results/WinnerImagePreviewModal.tsx";

interface SummaryResponse {
  byLottoTypeId?: Record<string, Partial<DrawStats>>;
  overall: Partial<DrawStats>;
}

interface DrawStats {
  totalBets: number;
  jackpotWinners: number;
  winningCombination: string;
  totalGrossSales: number;
  totalNetSales: number;
  totalRemittance: number;
  totalJackpotAmount: number;
}

const initialValues: DrawStats = {
  totalBets: 0,
  jackpotWinners: 0,
  winningCombination: "--",
  totalGrossSales: 0,
  totalNetSales: 0,
  totalRemittance: 0,
  totalJackpotAmount: 0,
};

const BetsSummary: React.FC<BetsSummaryProps> = ({
  gameType,
  selectedDate,
}) => {
  const [statsByLottoId, setStatsByLottoId] = useState<
    Record<string, DrawStats>
  >({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [winnersLoadingMap, setWinnersLoadingMap] = useState<
    Record<string, boolean>
  >({});
  const [overallStats, setOverallStats] = useState<DrawStats>(initialValues);
  const [previewAsset, setPreviewAsset] = useState<WinnerImageAsset | null>(
    null,
  );
  const [previewTitle, setPreviewTitle] = useState("");
  const day = getDayNameFromDateString(selectedDate);
  const safeGameType = gameType ?? "lotto";
  const logoImageUrl = `https://lnnpmtjuzgrcdtusfrty.supabase.co/storage/v1/object/public/app/lotto-types/${safeGameType}%20Lotto%20Logo.png`;

  // Fetch lotto types for dropdown
  const { data: lottoTypesData, loading } = useQuery<
    LottoQueryData,
    LottoQueryVariables
  >(GET_LOTTO_TYPES, {
    variables: {
      first: 100,
      offset: 0,
      filter: {
        and: [
          { game_type: { eq: gameType } },
          { is_archive: { eq: false } },
          { is_active: { eq: true } },
          { days_active: { contains: [day] } },
        ],
      },
      sortOrder: [{ name: "AscNullsFirst" }],
    },
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      const drawsToday = lottoTypesData?.lotto_typesCollection.edges;
      const drawTodayIds =
        drawsToday
          ?.map((edge) => Number(edge.node.id))
          .filter((id) => Number.isFinite(id)) ?? [];

      if (!drawTodayIds.length) {
        setStatsByLottoId({});
        return;
      }

      setStatsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke(
          "summary-3d-2d-bets",
          {
            body: {
              lottoTypeIds: drawTodayIds,
              date: selectedDate,
            },
          },
        );

        if (error) {
          throw error;
        }

        const payload = (data ?? {}) as SummaryResponse;

        if (!cancelled) {
          const mappedStats: Record<string, DrawStats> = {};

          for (const lottoTypeId of drawTodayIds) {
            const key = String(lottoTypeId);
            const lottoPayload =
              payload.byLottoTypeId?.[key] ??
              (drawTodayIds.length === 1 ? payload.overall : undefined);

            mappedStats[key] = {
              totalBets: lottoPayload?.totalBets ?? 0,
              jackpotWinners: lottoPayload?.jackpotWinners ?? 0,
              winningCombination: lottoPayload?.winningCombination ?? "--",
              totalGrossSales: lottoPayload?.totalGrossSales ?? 0,
              totalNetSales: lottoPayload?.totalNetSales ?? 0,
              totalRemittance: lottoPayload?.totalRemittance ?? 0,
              totalJackpotAmount: lottoPayload?.totalJackpotAmount ?? 0,
            };
          }

          setStatsByLottoId(mappedStats);

          setOverallStats({
            totalBets: payload.overall?.totalBets ?? 0,
            jackpotWinners: payload.overall?.jackpotWinners ?? 0,
            winningCombination: payload.overall?.winningCombination ?? "--",
            totalGrossSales: payload.overall?.totalGrossSales ?? 0,
            totalNetSales: payload.overall?.totalNetSales ?? 0,
            totalRemittance: payload.overall?.totalRemittance ?? 0,
            totalJackpotAmount: payload.overall?.totalJackpotAmount ?? 0,
          });
        }
      } catch (error) {
        console.error("Failed to fetch 3D bet stats:", error);
        if (!cancelled) {
          setStatsByLottoId({});
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [lottoTypesData?.lotto_typesCollection.edges, selectedDate]);

  const setWinnersLoading = (key: string, loadingState: boolean) => {
    setWinnersLoadingMap((prev) => ({
      ...prev,
      [key]: loadingState,
    }));
  };

  const closePreview = () => {
    previewAsset?.revoke();
    setPreviewAsset(null);
    setPreviewTitle("");
  };

  const handleDownloadWinners = async (
    lottoTypeId: string | string[],
    loadingKey: string,
    drawName: string,
    winningCombination: string,
    logoImageSrc?: string | null,
  ) => {
    setWinnersLoading(loadingKey, true);

    try {
      const winners = await fetchWinnerRows({
        lottoTypeId,
        selectedDate,
        winningCombination,
        gameType: safeGameType,
      });

      if (!winners.length) {
        await Swal.fire({
          icon: "info",
          title: "No Winners Found",
          text: `No winning bets found for ${drawName} on ${humanizeDateString(selectedDate)}.`,
        });
        return;
      }

      const asset = await createWinnerImageAsset({
        rows: winners,
        selectedDate,
        drawName,
        winningCombination,
        logoImageSrc,
        fileNamePrefix: `${safeGameType.toLowerCase()}_${drawName.toLowerCase().replace(/\s+/g, "_")}_winners`,
      });

      setPreviewAsset(asset);
      setPreviewTitle(`${drawName} Winners Preview`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate winners image.";

      await Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: message,
      });
    } finally {
      setWinnersLoading(loadingKey, false);
    }
  };

  const lottoEdges = lottoTypesData?.lotto_typesCollection.edges ?? [];

  if (!lottoEdges.length) {
    return null;
  }

  return (
    <div className="mt-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div
          key={"overall"}
          className="bg-[#222222] rounded-xl shadow-lg p-4 flex flex-col items-center"
        >
          {/* Lotto Logo */}
          <img
            // src={`/images/lotto/2d_${idx === 0 ? "default" : idx === 1 ? "2pm" : idx === 2 ? "5pm" : "9pm"}.png`}
            src={logoImageUrl}
            alt={`${gameType} Logo`}
            className="h-20 w-auto mb-2"
            style={{ filter: "drop-shadow(0 0 8px #000)" }}
          />
          {/* Draw Date */}
          <div className="text-gray-200 text-center text-sm mb-4">
            {humanizeDateString(selectedDate)}
          </div>
          <PrimaryButton
            disabled={Boolean(winnersLoadingMap.overall)}
            onClick={() =>
              handleDownloadWinners(
                lottoEdges.map((edge) => edge.node.id),
                "overall",
                `${gameType} Overall`,
                overallStats.winningCombination || "-",
                logoImageUrl,
              )
            }
          >
            {winnersLoadingMap.overall ? <Loading /> : "Download Winners"}
          </PrimaryButton>
          {/* Stats Grid */}
          <div className="w-full grid grid-cols-1 gap-2 mt-5">
            <div className="bg-black rounded p-2 flex flex-col items-center">
              <span className="text-xs text-gray-400">Total Bets</span>
              <span className="text-lg font-bold text-white">
                {loading || statsLoading ? (
                  <Skeleton className="mt-2" width={50} height={40} />
                ) : (
                  overallStats.totalBets
                )}
              </span>
            </div>
            {/* <div className="bg-black rounded p-2 flex flex-col items-center">
              <span className="text-xs text-gray-400">Combinations</span>
              <span className="text-lg font-bold text-white">
                {loading || statsLoading ? (
                  <Skeleton className="mt-2" width={50} height={40} />
                ) : (
                  overallStats.winningCombination
                )}
              </span>
            </div> */}
            <div className="bg-black rounded p-2 flex flex-col items-center">
              <span className="text-xs text-gray-400">Winners</span>
              <span className="text-lg font-bold text-white">
                {overallStats.jackpotWinners}
              </span>
            </div>
            <div className="bg-black rounded p-2 flex flex-col items-center">
              <span className="text-xs text-gray-400">Net Sales</span>
              <span className="text-lg font-bold text-white">
                {loading || statsLoading ? (
                  <Skeleton className="mt-2" width={50} height={40} />
                ) : (
                  overallStats.totalNetSales
                )}
              </span>
            </div>
            <div className="bg-black rounded p-2 flex flex-col items-center">
              <span className="text-xs text-gray-400">Remittance</span>
              <span className="text-lg font-bold text-white">
                {loading || statsLoading ? (
                  <Skeleton className="mt-2" width={50} height={40} />
                ) : (
                  overallStats.totalRemittance
                )}
              </span>
            </div>
            <div className="bg-black rounded p-2 flex flex-col items-center">
              <span className="text-xs text-gray-400">Total Prize</span>
              <span className="text-lg font-bold text-white">
                {loading || statsLoading ? (
                  <Skeleton className="mt-2" width={50} height={40} />
                ) : (
                  overallStats.totalJackpotAmount
                )}
              </span>
            </div>
          </div>
        </div>
        {lottoEdges.map((lottoType, idx) => {
          const lottoStats =
            statsByLottoId[String(lottoType.node.id)] ?? initialValues;

          return (
            <div
              key={idx}
              className="bg-[#222222] rounded-xl shadow-lg p-4 flex flex-col items-center"
            >
              {/* Lotto Logo */}
              <img
                // src={`/images/lotto/2d_${idx === 0 ? "default" : idx === 1 ? "2pm" : idx === 2 ? "5pm" : "9pm"}.png`}
                src={lottoType.node.logo_image}
                alt={`${lottoType.node.name} Logo`}
                className="h-20 w-auto mb-2"
                style={{ filter: "drop-shadow(0 0 8px #000)" }}
              />
              {/* Draw Date */}
              <div className="text-gray-200 text-center text-sm mb-4">
                {humanizeDateString(selectedDate)}
              </div>
              <PrimaryButton
                disabled={Boolean(winnersLoadingMap[lottoType.node.id])}
                onClick={() =>
                  handleDownloadWinners(
                    lottoType.node.id,
                    lottoType.node.id,
                    lottoType.node.name,
                    lottoStats.winningCombination || "-",
                    lottoType.node.logo_image,
                  )
                }
              >
                {winnersLoadingMap[lottoType.node.id] ? (
                  <Loading />
                ) : (
                  "Download Winners"
                )}
              </PrimaryButton>
              {/* Stats Grid */}
              <div className="w-full grid grid-cols-1 gap-2 mt-5">
                <div className="bg-black rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-400">Total Bets</span>
                  <span className="text-lg font-bold text-white">
                    {loading || statsLoading ? (
                      <Skeleton className="mt-2" width={50} height={40} />
                    ) : (
                      lottoStats.totalBets
                    )}
                  </span>
                </div>
                <div className="bg-black rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-400">Combinations</span>
                  <span className="text-lg font-bold text-white">
                    {loading || statsLoading ? (
                      <Skeleton className="mt-2" width={50} height={40} />
                    ) : (
                      lottoStats.winningCombination
                    )}
                  </span>
                </div>
                <div className="bg-black rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-400">Winners</span>
                  <span className="text-lg font-bold text-white">
                    {lottoStats.jackpotWinners}
                  </span>
                </div>
                <div className="bg-black rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-400">Net Sales</span>
                  <span className="text-lg font-bold text-white">
                    {loading || statsLoading ? (
                      <Skeleton className="mt-2" width={50} height={40} />
                    ) : (
                      lottoStats.totalNetSales
                    )}
                  </span>
                </div>
                <div className="bg-black rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-400">Remittance</span>
                  <span className="text-lg font-bold text-white">
                    {loading || statsLoading ? (
                      <Skeleton className="mt-2" width={50} height={40} />
                    ) : (
                      lottoStats.totalRemittance
                    )}
                  </span>
                </div>
                <div className="bg-black rounded p-2 flex flex-col items-center">
                  <span className="text-xs text-gray-400">Total Prize</span>
                  <span className="text-lg font-bold text-white">
                    {loading || statsLoading ? (
                      <Skeleton className="mt-2" width={50} height={40} />
                    ) : (
                      lottoStats.totalJackpotAmount
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <WinnerImagePreviewModal
        isOpen={Boolean(previewAsset)}
        title={previewTitle}
        imageUrl={previewAsset?.imageUrl ?? ""}
        fileName={previewAsset?.fileName ?? ""}
        onClose={closePreview}
        onDownload={() => previewAsset?.download()}
      />
    </div>
  );
};

export default BetsSummary;
