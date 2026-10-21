import React from "react";
import { X } from "lucide-react";
import Label from "../../generic/Label";
import Input from "../../generic/Input";
import { formatDrawDate } from "../../../utils/helper";

interface ViewResultModalProps {
  open: boolean;
  onClose: () => void;
  result: {
    draw_date: string;
    draw_type: string | number;
    combination: string;
    lotto_type_name?: string;
  } | null;
}

const ViewResultModal: React.FC<ViewResultModalProps> = ({
  open,
  onClose,
  result,
}) => {
  if (!open || !result) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-black border border-gray-200 dark:border-gray-700 w-full max-w-md p-8 rounded-lg shadow-2xl z-[70]">
        <button
          className="absolute top-3 right-3 text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-400"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
          View Draw Result
        </h2>
        <div className="flex flex-col gap-6">
          <div className="flex w-full gap-5">
            <div className="flex flex-col gap-2 w-full">
              <Label>Draw Date</Label>
              <Input
                type="text"
                disabled={true}
                value={formatDrawDate(result.draw_date)}
                placeholder="Draw Date"
              />
            </div>
          </div>
          <div className="flex w-full gap-5">
            <div className="flex flex-col gap-2 w-full">
              <Label>Draw Type</Label>
              <Input
                type="text"
                disabled={true}
                value={result.lotto_type_name || result.draw_type}
                placeholder="Draw Type"
              />
            </div>
          </div>
          <div className="flex w-full gap-5">
            <div className="flex flex-col gap-2 w-full">
              <Label>Combination</Label>
              <Input
                type="text"
                disabled={true}
                value={result.combination}
                placeholder="Combination"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewResultModal;
