import PrimaryButton from "../generic/buttons/Primary";
import TertiaryButton from "../generic/buttons/Tertiary";
import { useQuery } from "@apollo/client/react";
import type { LottoQueryData, LottoQueryVariables } from "../../types/api";
import { GET_LOTTO_TYPES } from "../../graphql/queries/lotto";
import { getDayNameFromDateString } from "../../utils/datetime";
import { useEffect, useState } from "react";
import { supabase } from "../../db/supabase";
import Skeleton from "../generic/Skeleton";
import type { SummaryProps } from "../../types/generic";
import Swal from "sweetalert2";
import { generateExcelFile } from "../../utils/excel";
import Loading from "../generic/icons/Loading";
import {
  createWinnerImageAsset,
  fetchWinnerRows,
  type WinnerImageAsset,
} from "../../utils/winners";
import WinnerImagePreviewModal from "../modals/results/WinnerImagePreviewModal.tsx";

type SummaryResponse = {
  totalBets: number;
  winningCombination: string;
  jackpotWinners: number;
  rbWinners: number;
  totalGrossSales: number;
  totalNetSales: number;
  totalRemittance: number;
  totalJackpotAmount: number;
};

const INITIAL_SUMMARY: SummaryResponse = {
  totalBets: 0,
  winningCombination: "",
  jackpotWinners: 0,
  rbWinners: 0,
  totalGrossSales: 0,
  totalNetSales: 0,
  totalRemittance: 0,
  totalJackpotAmount: 0,
};

const Lp3Summary = ({ selectedDate, onReload }: SummaryProps) => {
  const [statsLoading, setStatsLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadJackpotWinnersLoading, setDownloadJackpotWinnersLoading] =
    useState(false);
  const [downloadRbWinnersLoading, setDownloadRbWinnersLoading] =
    useState(false);
  const [summary, setSummary] = useState<SummaryResponse>(INITIAL_SUMMARY);
  const [previewAsset, setPreviewAsset] = useState<WinnerImageAsset | null>(
    null,
  );
  const [previewTitle, setPreviewTitle] = useState("");

  const day = getDayNameFromDateString(selectedDate);

  // Fetch lotto types for dropdown
  const { data: lottoTypesData, loading: lp3Loading } = useQuery<
    LottoQueryData,
    LottoQueryVariables
  >(GET_LOTTO_TYPES, {
    variables: {
      first: 1,
      offset: 0,
      filter: {
        and: [
          { game_type: { eq: "LP3" } },
          { is_archive: { eq: false } },
          { is_active: { eq: true } },
          { days_active: { contains: [day] } },
        ],
      },
      sortOrder: [{ name: "AscNullsFirst" }],
    },
    fetchPolicy: "network-only",
  });

  const handleDownloadBets = async () => {
    setDownloadLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "download-bets-by-date",
        {
          body: {
            date: selectedDate,
          },
        },
      );

      if (error) {
        throw error;
      }

      const rows = (data as { rows?: Record<string, string | number>[] })?.rows;

      if (!rows || rows.length === 0) {
        await Swal.fire({
          icon: "info",
          title: "No Bets Found",
          text: `No completed bets found for ${selectedDate}.`,
        });
        return;
      }

      const exportRows = rows.map((row) => ({
        "Ref ID": row.ref_id ?? "-",
        Draw: row.lotto_type_name ?? "-",
        "Bet Type": row.bet_type_code ?? "-",
        Combination: row.combination ?? "-",
        "Bet Amount": row.bet_amount ?? 0,
        "Agent Name": row.agent_name ?? "-",
        "Created At": row.created_at ?? "-",
        "Bettor Name": row.bettor_name ?? "-",
        "Encoded By": row.encoded_by ?? "-",
      }));

      generateExcelFile(exportRows, `bets_${selectedDate}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to download bets.";

      await Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: message,
      });
    } finally {
      setDownloadLoading(false);
    }
  };

  const closePreview = () => {
    previewAsset?.revoke();
    setPreviewAsset(null);
    setPreviewTitle("");
  };

  const handlePreviewWinners = async (isReturnBet: boolean) => {
    if (isReturnBet) {
      setDownloadRbWinnersLoading(true);
    } else {
      setDownloadJackpotWinnersLoading(true);
    }

    try {
      const lottoTypeId =
        lottoTypesData?.lotto_typesCollection?.edges?.[0]?.node?.id;

      if (!lottoTypeId) {
        await Swal.fire({
          icon: "info",
          title: "Lotto Type Not Available",
          text: "No active LP3 lotto type found for the selected date.",
        });
        return;
      }

      const winners = await fetchWinnerRows({
        lottoTypeId,
        selectedDate,
        isReturnBet,
      });

      if (winners.length === 0) {
        await Swal.fire({
          icon: "info",
          title: isReturnBet
            ? "No LP3 RB Winners Found"
            : "No LP3 Jackpot Winners Found",
          text: isReturnBet
            ? `No LP3 RB winning bets found for ${selectedDate}.`
            : `No LP3 jackpot winning bets found for ${selectedDate}.`,
        });
        return;
      }

      const asset = await createWinnerImageAsset({
        rows: isReturnBet
          ? winners.map((winner) => ({ ...winner, remarks: "RETURN BET" }))
          : winners,
        selectedDate,
        drawName: selectedLottoType?.name ?? "LP3",
        winningCombination: summary.winningCombination || "-",
        logoImageSrc: selectedLottoType?.logo_image,
        fileNamePrefix: isReturnBet ? "lp3_rb_winners" : "lp3_winners",
      });

      setPreviewAsset(asset);
      setPreviewTitle(
        isReturnBet ? "LP3 RB Winners Preview" : "LP3 Winners Preview",
      );
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
      if (isReturnBet) {
        setDownloadRbWinnersLoading(false);
      } else {
        setDownloadJackpotWinnersLoading(false);
      }
    }
  };

  const selectedLottoType =
    lottoTypesData?.lotto_typesCollection?.edges?.[0]?.node;

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      const lp3Id = lottoTypesData?.lotto_typesCollection?.edges?.[0]?.node?.id;
      if (!lp3Id) {
        console.error("LP3 Lotto type not found for the selected date.");
        return;
      }

      setStatsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke(
          "summary-lp3-bets",
          {
            body: {
              lottoTypeId: lp3Id,
              date: selectedDate,
            },
          },
        );

        if (error) {
          throw error;
        }

        const payload = (data ?? {}) as SummaryResponse;

        if (!cancelled) {
          setSummary({
            totalBets: payload.totalBets,
            winningCombination: payload.winningCombination,
            jackpotWinners: payload.jackpotWinners,
            rbWinners: payload.rbWinners,
            totalGrossSales: payload.totalGrossSales,
            totalNetSales: payload.totalNetSales,
            totalRemittance: payload.totalRemittance,
            totalJackpotAmount: payload.totalJackpotAmount,
          });
        }
      } catch (error) {
        console.error("Failed to fetch LP3 bet stats:", error);
        if (!cancelled) {
          setSummary(INITIAL_SUMMARY);
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
  }, [lottoTypesData, selectedDate]);
  return (
    <>
      {/* Lotto logo centered */}
      <div className="flex justify-center my-4">
        {(() => {
          const logoSrc = selectedLottoType?.logo_image
            ? selectedLottoType.logo_image.startsWith("http")
              ? selectedLottoType.logo_image
              : `/images/lotto/${selectedLottoType.logo_image}`
            : "/images/lotto/grandlotto.png";
          return (
            <img
              src={logoSrc}
              alt={
                selectedLottoType?.name
                  ? `${selectedLottoType.name} Logo`
                  : "Lotto Logo"
              }
              className="h-36 w-auto"
              style={{ filter: "drop-shadow(0 0 8px #000)" }}
            />
          );
        })()}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-4 justify-center mb-4">
        <PrimaryButton
          disabled={
            downloadLoading ||
            downloadJackpotWinnersLoading ||
            downloadRbWinnersLoading
          }
          onClick={handleDownloadBets}
        >
          {downloadLoading ? <Loading /> : "Download Bets"}
        </PrimaryButton>
        <PrimaryButton
          disabled={
            downloadLoading ||
            downloadJackpotWinnersLoading ||
            downloadRbWinnersLoading
          }
          onClick={() => {
            void handlePreviewWinners(false);
          }}
        >
          {downloadJackpotWinnersLoading ? (
            <Loading />
          ) : (
            "Download Jackpot Winners"
          )}
        </PrimaryButton>
        <PrimaryButton
          disabled={
            downloadLoading ||
            downloadJackpotWinnersLoading ||
            downloadRbWinnersLoading
          }
          onClick={() => {
            void handlePreviewWinners(true);
          }}
        >
          {downloadRbWinnersLoading ? <Loading /> : "Download RB Winners"}
        </PrimaryButton>
        <TertiaryButton onClick={onReload}>Reload</TertiaryButton>
      </div>

      <WinnerImagePreviewModal
        isOpen={Boolean(previewAsset)}
        title={previewTitle}
        imageUrl={previewAsset?.imageUrl ?? ""}
        fileName={previewAsset?.fileName ?? ""}
        onClose={closePreview}
        onDownload={() => previewAsset?.download()}
      />

      {/* Summary cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-2">
        <div className="bg-[#222222] rounded-lg p-6 text-center text-white">
          <div className="text-sm text-gray-400 mb-1">Total Bets</div>
          <div className="text-2xl font-bold">
            {lp3Loading || statsLoading ? (
              <Skeleton className="mt-2" width={50} height={40} />
            ) : (
              summary.totalBets
            )}
          </div>
        </div>
        <div className="bg-[#222222] rounded-lg p-6 text-center text-white">
          <div className="text-sm text-gray-400 mb-1">Winning Combination</div>
          <div className="text-2xl font-bold">
            {lp3Loading || statsLoading ? (
              <Skeleton className="mt-2" width={50} height={40} />
            ) : (
              summary.winningCombination
            )}
          </div>
        </div>
        <div className="bg-[#222222] rounded-lg p-6 text-center text-white">
          <div className="text-sm text-gray-400 mb-1">Jackpot Winners</div>
          <div className="text-2xl font-bold">
            {lp3Loading || statsLoading ? (
              <Skeleton className="mt-2" width={50} height={40} />
            ) : (
              summary.jackpotWinners
            )}
          </div>
        </div>
        <div className="bg-[#222222] rounded-lg p-6 text-center text-white">
          <div className="text-sm text-gray-400 mb-1">RB Winners</div>
          <div className="text-2xl font-bold">
            {lp3Loading || statsLoading ? (
              <Skeleton className="mt-2" width={50} height={40} />
            ) : (
              summary.rbWinners
            )}
          </div>
        </div>
        <div className="bg-[#222222] rounded-lg p-6 text-center text-white">
          <div className="text-sm text-gray-400 mb-1">Gross Sales</div>
          <div className="text-2xl font-bold">
            {" "}
            {lp3Loading || statsLoading ? (
              <Skeleton className="mt-2" width={50} height={40} />
            ) : (
              summary.totalGrossSales
            )}
          </div>
        </div>
        <div className="bg-[#222222] rounded-lg p-6 text-center text-white">
          <div className="text-sm text-gray-400 mb-1">Net Sales</div>
          <div className="text-2xl font-bold">
            {lp3Loading || statsLoading ? (
              <Skeleton className="mt-2" width={50} height={40} />
            ) : (
              summary.totalNetSales
            )}
          </div>
        </div>
        <div className="bg-[#222222] rounded-lg p-6 text-center text-white">
          <div className="text-sm text-gray-400 mb-1">Total Remittance</div>
          <div className="text-2xl font-bold">
            {lp3Loading || statsLoading ? (
              <Skeleton className="mt-2" width={50} height={40} />
            ) : (
              summary.totalRemittance
            )}
          </div>
        </div>
        <div className="bg-[#222222] rounded-lg p-6 text-center text-white">
          <div className="text-sm text-gray-400 mb-1">Total Jackpot</div>
          <div className="text-2xl font-bold">
            {lp3Loading || statsLoading ? (
              <Skeleton className="mt-2" width={50} height={40} />
            ) : (
              summary.totalJackpotAmount
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Lp3Summary;
