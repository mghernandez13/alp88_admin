import React, { useState } from "react";
import Swal from "sweetalert2";
import { useMutation } from "@apollo/client/react";
import { GET_RESULTS } from "../../../graphql/queries/results";
import { UPDATE_RESULT } from "../../../graphql/queries/results";
import Label from "../../generic/Label";
import Input from "../../generic/Input";
import { X } from "lucide-react";
import { formatDrawDate } from "../../../utils/helper";
import { UserAuth } from "../../context/AuthContext";
import { CREATE_DRAW_RESULTS_LOG } from "../../../graphql/queries/resultsLogs";

interface EditWinningCombinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultId: number | undefined;
  currentCombination: string;
  drawDate: string;
  drawType: number | string;
  gameType?: string;
  numberOfDigits?: number;
  minNumber?: number;
  maxNumber?: number;
  onSuccess?: (newCombination: string) => void;
}

const EditWinningCombinationModal: React.FC<
  EditWinningCombinationModalProps
> = ({
  isOpen,
  onClose,
  resultId,
  currentCombination,
  drawDate,
  drawType,
  gameType,
  numberOfDigits = 6,
  minNumber = 0,
  maxNumber = 99,
  onSuccess,
}) => {
  const [combInputs, setCombInputs] = useState<string[]>([]);
  const { session } = UserAuth();
  const userId = session?.user?.id;
  const [updateResult, { loading }] = useMutation(UPDATE_RESULT, {
    refetchQueries: [
      {
        query: GET_RESULTS,
        variables: {
          first: 1,
          offset: 0,
          filter: resultId ? { id: { eq: resultId } } : undefined,
          sortOrder: undefined,
          searchTerm: "",
        },
      },
    ],
    awaitRefetchQueries: true,
  });
  const [createResultLog] = useMutation(CREATE_DRAW_RESULTS_LOG);

  // Sync combInputs state with prop when modal opens or currentCombination changes
  React.useEffect(() => {
    if (isOpen) {
      if (currentCombination && currentCombination.length > 0) {
        setCombInputs(currentCombination.split("-"));
      } else {
        setCombInputs(Array(numberOfDigits).fill(""));
      }
    }
  }, [isOpen, currentCombination, numberOfDigits]);

  const handleCombInputChange = (idx: number, value: string) => {
    if (!/^[0-9]*$/.test(value) && value !== "") return;
    if (value !== "") {
      const num = Number(value);
      if (num < minNumber || num > maxNumber) {
        Swal.fire({
          icon: "error",
          title: "Invalid Combination Value",
          text: `Each number must be between ${minNumber} and ${maxNumber}.`,
        });
        return;
      }
    }
    const newInputs = [...combInputs];
    newInputs[idx] = value;
    // Check for duplicates (ignore empty values)
    const filteredInputs = newInputs.filter((v) => v !== "");
    const hasDuplicates =
      new Set(filteredInputs).size !== filteredInputs.length;
    if (hasDuplicates && gameType === "LP3") {
      Swal.fire({
        icon: "error",
        title: "Duplicate Value",
        text: "Each digit in the winning combination must be unique.",
      });
      return;
    }
    setCombInputs(newInputs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const joined = combInputs.map((d) => d.trim()).join("-");
    const result = await Swal.fire({
      title: "Confirm Update",
      text: `Are you sure you want to update the winning combination to: ${joined}? This action will also reprocess the bets and will set a different list of winners`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    try {
      const { error } = await updateResult({
        variables: {
          id: resultId,
          combination: joined,
        },
      });
      Swal.fire({
        icon: "success",
        title: "Winning Combination Updated",
        text: "The winning combination has been updated successfully.",
      });

      await createResultLog({
        variables: {
          name: `WINNING COMBINATION UPDATE`,
          status: "FINISHED",
          created_by: userId, // Replace with actual user ID
          draw_result_id: resultId,
        },
      });

      if (error) {
        throw error;
      }

      onClose();
      if (onSuccess) onSuccess(joined);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err instanceof Error ? err.message : "An error occurred.",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-black border border-gray-200 dark:border-gray-700 w-full max-w-md p-8 rounded-lg shadow-2xl z-[70]">
        <button
          className="absolute top-3 right-3 text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-400 bg-transparent"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
          Edit Winning Combination
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="drawType">Draw Type</Label>
            <Input id="drawType" value={drawType ?? "-"} disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gameType">Game Type</Label>
            <Input id="gameType" value={gameType ?? "-"} disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="drawDate">Draw Date</Label>
            <Input
              id="drawDate"
              value={formatDrawDate(drawDate) ?? "-"}
              disabled
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Winning Combination</Label>
            <div className="flex gap-2">
              {Array.from({ length: numberOfDigits }).map((_, idx) => (
                <Input
                  key={idx}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  className="text-center w-16"
                  value={combInputs[idx] || ""}
                  onChange={(e) => handleCombInputChange(idx, e.target.value)}
                  required
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              className="px-4 py-2 bg-gray-100 dark:bg-gray-500 text-gray-900 dark:text-white rounded"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-500 text-black rounded"
              disabled={loading}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditWinningCombinationModal;
