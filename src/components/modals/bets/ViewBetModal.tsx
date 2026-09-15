import React from "react";
import { X } from "lucide-react";
import Label from "../../generic/Label";
import Input from "../../generic/Input";
import { formatDateTime12h, formatTo12h } from "../../../utils/helper";
import type { Bets } from "../../../types/api";
import { formatCurrency } from "../../../utils/currency";

interface ViewBetModalProps {
  open: boolean;
  onClose: () => void;
  bet: Bets | null;
}

const ViewBetModal: React.FC<ViewBetModalProps> = ({ open, onClose, bet }) => {
  if (!open || !bet) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-smt"
        onClick={onClose}
      />
      <div className="relative bg-black border border-gray-700 w-full max-w-3xl p-8 rounded-lg shadow-2xl z-[70]">
        <button
          className="absolute top-3 right-3 text-white hover:text-gray-400 bg-transparent"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-6 text-white">View Bet</h2>
        <div className="flex flex-col gap-6">
          <div className="flex w-full gap-5">
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Ref ID</Label>
              <Input type="text" disabled value={bet?.id || "-"} />
            </div>
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Combination</Label>
              <Input type="text" disabled value={bet.combination} />
            </div>
          </div>
          <div className="flex w-full gap-5">
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Draw</Label>
              <Input
                type="text"
                disabled
                value={bet.lotto_types?.name || "-"}
              />
            </div>
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Draw Time</Label>
              <Input
                type="text"
                disabled
                value={
                  bet.lotto_types?.draw_time
                    ? formatTo12h(bet.lotto_types.draw_time)
                    : "-"
                }
              />
            </div>
          </div>
          <div className="flex w-full gap-5">
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Bet Type</Label>
              <Input
                type="text"
                disabled
                value={`${bet.bet_types?.name || "Normal Bet"}`}
              />
            </div>
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Bet Amount</Label>
              <Input
                type="text"
                disabled
                value={formatCurrency(bet.bet_amount)}
              />
            </div>
          </div>
          <div className="flex w-full gap-5">
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Prize</Label>
              <Input
                type="text"
                disabled
                value={formatCurrency(bet.prize_amount) || "-"}
              />
            </div>
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Hit</Label>
              <Input
                type="text"
                disabled
                value={
                  bet.hit
                    ? `${bet.is_return_bet ? "RETURN BET" : "JACKPOT"}`
                    : "No"
                }
              />
            </div>
          </div>
          <div className="flex w-full gap-5">
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Agent</Label>
              <Input
                type="text"
                disabled
                value={bet.profiles?.full_name || "-"}
              />
            </div>
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Added By</Label>
              <Input
                type="text"
                disabled
                value={
                  bet.created_by_profile?.full_name ||
                  bet.profiles?.full_name ||
                  "-"
                }
              />
            </div>
          </div>
          <div className="flex w-full gap-5">
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Created At</Label>
              <Input
                type="text"
                disabled
                value={formatDateTime12h(bet.created_at) || "-"}
              />
            </div>
            <div className="flex flex-col gap-2 w-full md:w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBetModal;
