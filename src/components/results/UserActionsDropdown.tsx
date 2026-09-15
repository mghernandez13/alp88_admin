import React, { useRef, useState, useCallback, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import Swal from "sweetalert2";
import { supabase } from "../../db/supabase";
import { useMutation } from "@apollo/client/react";
import { CREATE_DRAW_RESULTS_LOG } from "../../graphql/queries/resultsLogs";
import {
  createWinnerImageAsset,
  getTwoDSpecialWinnerContext,
  mapWinnerRows,
  type WinnerImageAsset,
  type WinnerBetRow,
} from "../../utils/winners";

interface UserActionsDropdownProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  resultId: number | undefined;
  lottoTypeId: string | undefined;
  resultDrawDate: string | undefined;
  winningCombination?: string;
  logoImageSrc?: string;
  userId: string | undefined;
  setEditModalOpen: (open: boolean) => void;
  handleProcessBets: (newCombination?: string) => void;
  onWinnerImagePreview: (asset: WinnerImageAsset, title: string) => void;
}

type Bet = WinnerBetRow & {
  id: number;
  created_at: string;
};

const UserActionsDropdown: React.FC<UserActionsDropdownProps> = ({
  isLoading,
  setIsLoading,
  resultId,
  lottoTypeId,
  resultDrawDate,
  winningCombination,
  logoImageSrc,
  userId,
  setEditModalOpen,
  handleProcessBets,
  onWinnerImagePreview,
}) => {
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [createResultLog] = useMutation(CREATE_DRAW_RESULTS_LOG);
  const [lottoTypeName, setLottoTypeName] = useState(() => "lotto_type");
  const [lottoTypeGameType, setLottoTypeGameType] = useState("");
  const getFileNamePart = useCallback((value: string) => {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }, []);

  useEffect(() => {
    if (!lottoTypeId) return;

    const fetchLottoTypeName = async () => {
      const { data, error } = await supabase
        .from("lotto_types")
        .select("name, game_type")
        .eq("id", lottoTypeId)
        .maybeSingle();

      if (!error && data?.name) {
        setLottoTypeName(data.name);
        setLottoTypeGameType(data.game_type || "");
      }
    };

    void fetchLottoTypeName();
  }, [lottoTypeId]);

  React.useEffect(() => {
    if (!actionsOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        actionsMenuRef.current &&
        !actionsMenuRef.current.contains(event.target as Node)
      ) {
        setActionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [actionsOpen]);

  const handleDownloadJackpot = useCallback(async () => {
    if (!lottoTypeId || !resultDrawDate) return;
    setIsLoading(true);
    try {
      await createResultLog({
        variables: {
          name: `DOWNLOAD JACKPOT WINNERS`,
          status: "STARTED",
          created_by: userId,
          draw_result_id: resultId,
        },
      });
      const { data: bets, error } = await supabase
        .from("bets")
        .select(
          `id, combination, bettor_name, bet_amount, prize_amount, created_at, is_super_jackpot, is_return_bet, profiles:agent_id(full_name), bet_types(name, code)`,
        )
        .eq("lotto_type_id", lottoTypeId)
        .eq("hit", true)
        .eq("is_dummy_bet", false)
        .eq("is_archive", false)
        .eq("bet_status", "completed")
        .eq("is_return_bet", false)
        .gte("created_at", resultDrawDate + "T00:00:00")
        .lte("created_at", resultDrawDate + "T23:59:59.999")
        .limit(10000);
      if (error) {
        Swal.fire({
          icon: "error",
          title: "Error Fetching Jackpot Winners",
          text: error.message,
        });
        return;
      }
      if (!bets || bets.length === 0) {
        Swal.fire({
          icon: "info",
          title: "No Jackpot Winners",
          text: "No jackpot winners found for this draw.",
        });
        return;
      }

      const twoDSpecialContext =
        lottoTypeGameType.toUpperCase() === "2D" && winningCombination
          ? await getTwoDSpecialWinnerContext(
              resultDrawDate,
              winningCombination,
            )
          : null;

      const asset = await createWinnerImageAsset({
        rows: mapWinnerRows(bets as Bet[], { twoDSpecialContext }),
        selectedDate: resultDrawDate,
        drawName: lottoTypeName,
        winningCombination: winningCombination || "-",
        logoImageSrc,
        fileNamePrefix: `${getFileNamePart(lottoTypeName)}_jackpot_winners`,
      });

      onWinnerImagePreview(asset, "Jackpot Winners Preview");

      await createResultLog({
        variables: {
          name: `DOWNLOAD JACKPOT WINNERS`,
          status: "FINISHED",
          created_by: userId,
          draw_result_id: resultId,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    createResultLog,
    lottoTypeId,
    resultDrawDate,
    resultId,
    setIsLoading,
    userId,
    lottoTypeName,
    getFileNamePart,
    lottoTypeGameType,
    winningCombination,
    logoImageSrc,
    onWinnerImagePreview,
  ]);

  const handleDownloadRB = useCallback(async () => {
    if (!lottoTypeId || !resultDrawDate) return;
    setIsLoading(true);
    try {
      await createResultLog({
        variables: {
          name: `DOWNLOAD RB WINNERS`,
          status: "STARTED",
          created_by: userId,
          draw_result_id: resultId,
        },
      });
      const { data: bets, error } = await supabase
        .from("bets")
        .select(
          `id, combination, bettor_name, bet_amount, prize_amount, created_at, is_super_jackpot, is_return_bet, profiles:agent_id(full_name), bet_types(name, code)`,
        )
        .eq("lotto_type_id", lottoTypeId)
        .eq("hit", true)
        .eq("is_dummy_bet", false)
        .eq("is_archive", false)
        .eq("bet_status", "completed")
        .eq("is_return_bet", true)
        .gte("created_at", resultDrawDate + "T00:00:00")
        .lte("created_at", resultDrawDate + "T23:59:59.999")
        .limit(10000);
      if (error) {
        Swal.fire({
          icon: "error",
          title: "Error Fetching RB Winners",
          text: error.message,
        });
        return;
      }
      if (!bets || bets.length === 0) {
        Swal.fire({
          icon: "info",
          title: "No RB Winners",
          text: "No RB winners found for this draw.",
        });
        return;
      }

      const twoDSpecialContext =
        lottoTypeGameType.toUpperCase() === "2D" && winningCombination
          ? await getTwoDSpecialWinnerContext(
              resultDrawDate,
              winningCombination,
            )
          : null;

      const asset = await createWinnerImageAsset({
        rows: mapWinnerRows(bets as Bet[], {
          remarksGetter: () => "RETURN BET",
          twoDSpecialContext,
        }),
        selectedDate: resultDrawDate,
        drawName: lottoTypeName,
        winningCombination: winningCombination || "-",
        logoImageSrc,
        fileNamePrefix: `${getFileNamePart(lottoTypeName)}_rb_winners`,
      });

      onWinnerImagePreview(asset, "RB Winners Preview");

      await createResultLog({
        variables: {
          name: `DOWNLOAD RB WINNERS`,
          status: "FINISHED",
          created_by: userId,
          draw_result_id: resultId,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    createResultLog,
    lottoTypeId,
    resultDrawDate,
    resultId,
    setIsLoading,
    userId,
    lottoTypeName,
    getFileNamePart,
    lottoTypeGameType,
    winningCombination,
    logoImageSrc,
    onWinnerImagePreview,
  ]);

  const handleDownloadAllResults = useCallback(async () => {
    if (!lottoTypeId || !resultDrawDate) return;
    setIsLoading(true);
    try {
      await createResultLog({
        variables: {
          name: `DOWNLOAD ALL RESULTS`,
          status: "STARTED",
          created_by: userId,
          draw_result_id: resultId,
        },
      });
      const { data: bets, error } = await supabase
        .from("bets")
        .select(
          `id, combination, bettor_name, bet_amount, prize_amount, created_at, is_super_jackpot, is_return_bet, hit, profiles:agent_id(full_name), bet_types(name, code)`,
        )
        .eq("lotto_type_id", lottoTypeId)
        .eq("hit", true)
        .eq("is_dummy_bet", false)
        .eq("is_archive", false)
        .eq("bet_status", "completed")
        .gte("created_at", resultDrawDate + "T00:00:00")
        .lte("created_at", resultDrawDate + "T23:59:59.999")
        .limit(10000);
      if (error) {
        Swal.fire({
          icon: "error",
          title: "Error Fetching Winning Bets",
          text: error.message,
        });
        return;
      }
      if (!bets || bets.length === 0) {
        Swal.fire({
          icon: "info",
          title: "No Winning Bets",
          text: "No winning bets found for this draw.",
        });
        return;
      }

      const twoDSpecialContext =
        lottoTypeGameType.toUpperCase() === "2D" && winningCombination
          ? await getTwoDSpecialWinnerContext(
              resultDrawDate,
              winningCombination,
            )
          : null;

      const asset = await createWinnerImageAsset({
        rows: mapWinnerRows(bets as Bet[], {
          remarksGetter: (bet) =>
            bet.is_super_jackpot
              ? "X3 SUPER JACKPOT"
              : bet.is_return_bet
                ? "RETURN BET"
                : "JACKPOT",
          twoDSpecialContext,
        }),
        selectedDate: resultDrawDate,
        drawName: lottoTypeName,
        winningCombination: winningCombination || "-",
        logoImageSrc,
        fileNamePrefix: `${getFileNamePart(lottoTypeName)}_all_winning_bets`,
      });

      onWinnerImagePreview(asset, "All Winning Bets Preview");

      await createResultLog({
        variables: {
          name: `DOWNLOAD ALL RESULTS`,
          status: "FINISHED",
          created_by: userId,
          draw_result_id: resultId,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    createResultLog,
    lottoTypeId,
    resultDrawDate,
    resultId,
    setIsLoading,
    userId,
    lottoTypeName,
    getFileNamePart,
    lottoTypeGameType,
    winningCombination,
    logoImageSrc,
    onWinnerImagePreview,
  ]);

  return (
    <div className="relative" ref={actionsMenuRef}>
      <button
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-700 flex"
        onClick={() => setActionsOpen((v) => !v)}
      >
        User Actions
        <ChevronDown />
      </button>
      {actionsOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-black border border-gray-700 rounded shadow-lg z-20 text-sm text-white">
          <ul className="py-1">
            <li
              className="px-4 py-2 cursor-pointer transition-colors duration-150 hover:bg-yellow-600"
              aria-disabled={isLoading}
              onClick={() => {
                void handleProcessBets();
              }}
            >
              Process Bets
            </li>
            <li
              aria-disabled={isLoading}
              onClick={handleDownloadJackpot}
              className="px-4 py-2 cursor-pointer transition-colors duration-150 hover:bg-yellow-600"
            >
              Download Results - Jackpot
            </li>
            <li
              aria-disabled={isLoading}
              onClick={handleDownloadRB}
              className="px-4 py-2 cursor-pointer transition-colors duration-150 hover:bg-yellow-600"
            >
              Download Results - RB
            </li>
            <li
              aria-disabled={isLoading}
              onClick={handleDownloadAllResults}
              className="px-4 py-2 cursor-pointer transition-colors duration-150 hover:bg-yellow-600"
            >
              Download all Results
            </li>
            <li
              className="px-4 py-2 cursor-pointer transition-colors duration-150 hover:bg-yellow-600"
              onClick={() => setEditModalOpen(true)}
            >
              Edit Winning Combination
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default UserActionsDropdown;
