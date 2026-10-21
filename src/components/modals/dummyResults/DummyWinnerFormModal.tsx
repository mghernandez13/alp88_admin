import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { X } from "lucide-react";
import Input from "../../generic/Input";
import Label from "../../generic/Label";
import type {
  DummyWinnerRecord,
  DummyWinnerValues,
} from "../../../types/dummyResults";
import { validateDummyWinner } from "../../../utils/dummyResults";

interface DummyWinnerFormModalProps {
  winner: DummyWinnerRecord | null;
  onClose: () => void;
  onSave: (values: DummyWinnerValues) => Promise<void>;
}

const DummyWinnerFormModal = ({
  winner,
  onClose,
  onSave,
}: DummyWinnerFormModalProps) => {
  const id = useId();
  const [values, setValues] = useState<DummyWinnerValues>(() => ({
    admin: winner?.admin ?? "",
    bettor_name: winner?.bettor_name ?? "",
    bet: winner?.bet ?? "",
    remarks: winner?.remarks ?? "JACKPOT",
    prize: winner ? String(winner.prize) : "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (!submittingRef.current) onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      // Validate without converting Bet or passing a numeric Prize to the parent.
      validateDummyWinner(values);
      await onSave(values);
      onClose();
    } catch (saveError: unknown) {
      const message =
        saveError &&
        typeof saveError === "object" &&
        "message" in saveError &&
        typeof saveError.message === "string"
          ? saveError.message
          : "Unable to save the dummy winner. Please try again.";
      setError(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onClose={handleClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel className="relative w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black p-8 shadow-2xl">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              aria-label="Close dummy winner form"
              className="absolute right-3 top-3 bg-transparent text-gray-900 dark:text-white disabled:opacity-50"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <DialogTitle className="mb-6 text-xl font-bold text-gray-900 dark:text-white">
              {winner ? "Edit Dummy Winner" : "Add Dummy Winner"}
            </DialogTitle>
            <form
              onSubmit={handleSubmit}
              aria-busy={submitting}
              aria-describedby={error ? `${id}-error` : undefined}
            >
              <fieldset disabled={submitting} className="space-y-4">
                {(
                  [
                    ["admin", "Admin", 200],
                    ["bettor_name", "Bettor Name", 200],
                    ["bet", "Bet", 200],
                    ["remarks", "Remarks", 500],
                  ] as const
                ).map(([field, label, maxLength]) => (
                  <div key={field}>
                    <Label htmlFor={`${id}-${field}`} isRequired>
                      {label}
                    </Label>
                    <Input
                      id={`${id}-${field}`}
                      name={field}
                      type="text"
                      required
                      maxLength={maxLength}
                      value={values[field]}
                      onChange={(event) =>
                        setValues((previous) => ({
                          ...previous,
                          [field]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <div>
                  <Label htmlFor={`${id}-prize`} isRequired>
                    Prize
                  </Label>
                  <Input
                    id={`${id}-prize`}
                    name="prize"
                    type="text"
                    inputMode="decimal"
                    required
                    pattern="[0-9]+([.][0-9]{1,2})?"
                    title="Enter a positive amount up to 999999999999.99 with at most two decimal places."
                    aria-describedby={`${id}-prize-help`}
                    value={values.prize}
                    onChange={(event) =>
                      setValues((previous) => ({
                        ...previous,
                        prize: event.target.value,
                      }))
                    }
                  />
                  <p
                    id={`${id}-prize-help`}
                    className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                  >
                    Positive PHP amount, maximum 999999999999.99; up to two
                    decimal places.
                  </p>
                </div>
              </fieldset>
              {error && (
                <p
                  id={`${id}-error`}
                  role="alert"
                  className="mt-4 text-sm text-red-600 dark:text-red-400"
                >
                  {error}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-gray-900 dark:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-yellow-500 hover:bg-yellow-600 px-4 py-2 font-semibold text-black disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Winner"}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default DummyWinnerFormModal;
