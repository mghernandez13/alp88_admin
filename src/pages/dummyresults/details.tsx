import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, FileSpreadsheet, Plus, RefreshCw } from "lucide-react";
import Swal from "sweetalert2";
import AdminTemplate from "../../templates/AdminTemplate";
import Headline from "../../components/generic/Headline";
import { UserAuth } from "../../components/context/AuthContext";
import { useTheme } from "../../components/context/ThemeContext";
import { useCheckUserPermissions } from "../../hooks/useCheckUserPermission";
import DummyWinnerFormModal from "../../components/modals/dummyResults/DummyWinnerFormModal";
import type {
  DummyWinnerRecord,
  DummyWinnerValues,
} from "../../types/dummyResults";
import {
  deleteDummyWinner,
  fetchDummyResult,
  fetchDummyWinners,
  saveDummyWinner,
} from "../../utils/dummyResults";
import {
  createWinnerImageAsset,
  type WinnerImageAsset,
  type WinnerImageRow,
} from "../../utils/winners";
import { formatCurrency } from "../../utils/currency";
import { generateWinnerExcelFile } from "../../utils/excel";

const errorMessage = (error: unknown) =>
  error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "Unable to load Dummy Results. Please try again.";
const buttonClass =
  "inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-semibold disabled:opacity-50";

const DummyResultDetailsPage = () => {
  useCheckUserPermissions("View Dummy Results");
  const { resultId: routeId } = useParams();
  const resultId = Number(routeId);
  const validId = Number.isSafeInteger(resultId) && resultId > 0;
  const { session, loadingPage } = UserAuth();
  const permissions = session?.user.user_metadata.permissions as
    | string[]
    | undefined;
  const canView = !loadingPage && !!permissions?.includes("View Dummy Results");
  const { theme } = useTheme();
  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState<{
    id: number;
    baseline: Awaited<ReturnType<typeof fetchDummyResult>>;
    dummy: DummyWinnerRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    asset: WinnerImageAsset;
    rows: WinnerImageRow[];
    theme: string;
    generation: number;
  } | null>(null);
  const generation = useRef(0);
  const [imagePage, setImagePage] = useState(1);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    winner: DummyWinnerRecord | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!canView || !validId) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [baseline, dummy] = await Promise.all([
          fetchDummyResult(resultId, controller.signal),
          fetchDummyWinners(resultId, controller.signal),
        ]);
        if (!controller.signal.aborted)
          setLoaded({ id: resultId, baseline, dummy });
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [canView, validId, resultId, revision]);

  const current = loaded?.id === resultId ? loaded : null;
  const result = current?.baseline.result;
  const entries = useMemo(() => {
    if (!current) return [];
    return [
      ...current.baseline.winners.map((row, index) => ({
        key: `official-${index}`,
        row,
        dummy: null as DummyWinnerRecord | null,
      })),
      ...current.dummy.map((dummy) => ({
        key: dummy.id,
        dummy,
        row: {
          admin: dummy.admin,
          bettorName: dummy.bettor_name,
          bet: dummy.bet,
          remarks: dummy.remarks,
          prize: Number(dummy.prize),
        },
      })),
    ].sort(
      (a, b) =>
        a.row.admin.localeCompare(b.row.admin) ||
        a.row.bettorName.localeCompare(b.row.bettorName) ||
        a.key.localeCompare(b.key),
    );
  }, [current]);
  const rows = useMemo(() => entries.map(({ row }) => row), [entries]);
  const imageCount = Math.max(1, Math.ceil(rows.length / 400));
  const currentImagePage = Math.min(imagePage, imageCount);
  const imageRows = useMemo(
    () => rows.slice((currentImagePage - 1) * 400, currentImagePage * 400),
    [rows, currentImagePage],
  );

  useEffect(() => {
    const version = ++generation.current;
    if (!canView || loading || loadError || !result || !rows.length) return;
    let cancelled = false;
    let asset: WinnerImageAsset | null = null;
    const generate = async () => {
      setPreviewError(null);
      try {
        asset = await createWinnerImageAsset({
          rows: imageRows,
          selectedDate: result.draw_date,
          drawName: result.lotto_types.name,
          winningCombination: result.combination,
          logoImageSrc: result.lotto_types.logo_image,
          theme,
          fileNamePrefix: `dummy_results_${result.id}_part_${currentImagePage}`,
        });
        if (cancelled) asset.revoke();
        else setPreview({ asset, rows: imageRows, theme, generation: version });
      } catch (error) {
        if (!cancelled) setPreviewError(errorMessage(error));
      }
    };
    void generate();
    return () => {
      cancelled = true;
      generation.current = version + 1;
      asset?.revoke();
    };
  }, [
    canView,
    imageRows,
    rows.length,
    result,
    theme,
    loading,
    loadError,
    currentImagePage,
  ]);

  const ready =
    !loading &&
    !loadError &&
    !busy &&
    preview?.rows === imageRows &&
    preview.theme === theme &&
    preview.generation === generation.current;
  const filtered = entries.filter(({ row }) =>
    Object.values(row).join(" ").toLowerCase().includes(search.toLowerCase()),
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 20)),
  );
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);

  const handleSave = async (values: DummyWinnerValues) => {
    if (mutationLock.current) throw new Error("Another change is in progress.");
    if (
      !canView ||
      !permissions?.includes(
        editing?.winner ? "Edit Dummy Results" : "Add Dummy Results",
      )
    )
      throw new Error("Permission denied.");
    mutationLock.current = true;
    setBusy(true);
    try {
      await saveDummyWinner(resultId, editing?.winner?.id ?? null, values);
      // Reload both sources. A failed reload is a page error, not a failed save
      // that could encourage a duplicate insert.
      setLoading(true);
      setRevision((value) => value + 1);
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const handleDelete = async (winner: DummyWinnerRecord) => {
    if (mutationLock.current || !permissions?.includes("Delete Dummy Results"))
      return;
    mutationLock.current = true;
    try {
      const confirmation = await Swal.fire({
        title: "Delete Dummy Winner?",
        text: `Delete ${winner.bettor_name}? Official winners will not change.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete",
      });
      if (!confirmation.isConfirmed) return;
      setBusy(true);
      await deleteDummyWinner(resultId, winner.id);
      setLoading(true);
      setRevision((value) => value + 1);
    } catch (error) {
      await Swal.fire({
        title: "Delete Failed",
        text: errorMessage(error),
        icon: "error",
      });
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  };

  const downloadExcel = async () => {
    if (loading || busy || !result || !rows.length) return;
    try {
      await generateWinnerExcelFile({
        rows: rows.map((row) => ({
          Admin: row.admin,
          "Bettor Name": row.bettorName,
          Bet: row.bet,
          Remarks: row.remarks,
          Prize: row.prize,
        })),
        fileName: `dummy_results_${result.id}_${result.draw_date}`,
        selectedDate: result.draw_date,
        drawName: result.lotto_types.name,
        winningCombination: result.combination,
      });
    } catch (error) {
      await Swal.fire({
        title: "Download Failed",
        text: errorMessage(error),
        icon: "error",
      });
    }
  };

  return (
    <AdminTemplate>
      <div className="w-full p-4 md:p-8">
        <Link to="/dummy-results" className="text-sm hover:underline">
          ← Dummy Results
        </Link>
        <div className="my-5 flex flex-wrap items-center justify-between gap-4">
          <Headline>Dummy Results</Headline>
          {canView && validId && (
            <button
              className={buttonClass}
              disabled={loading || busy}
              onClick={() => {
                setLoading(true);
                setRevision((value) => value + 1);
              }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          )}
        </div>
        <p className="mb-6 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm">
          Shared dummy workspace. Official winners are live and read-only.
          Changes here never affect Results or Summary.
        </p>
        {!canView ? (
          <p>
            {loadingPage
              ? "Loading permissions…"
              : "View Dummy Results permission is required."}
          </p>
        ) : !validId ? (
          <p role="alert">Invalid result ID.</p>
        ) : loading ? (
          <p role="status">Loading results and winners…</p>
        ) : loadError ? (
          <p role="alert" className="text-red-600 dark:text-red-400">
            {loadError} Use Refresh to retry.
          </p>
        ) : !result ? (
          <p>Result not found or archived.</p>
        ) : (
          <>
            <div className="mb-6 grid gap-4 rounded-xl bg-white p-6 dark:bg-black sm:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">Draw Date</p>
                {result.draw_date}
              </div>
              <div>
                <p className="text-sm text-gray-500">Draw Type</p>
                {result.lotto_types.name}
              </div>
              <div>
                <p className="text-sm text-gray-500">Winning Combination</p>
                {result.combination}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {rows.length} Winners · PHP{" "}
                {formatCurrency(
                  rows.reduce((total, row) => total + row.prize, 0),
                )}
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  className={buttonClass}
                  disabled={!ready}
                  onClick={() => {
                    if (ready) preview.asset.download();
                  }}
                >
                  <Download size={16} />
                  PNG{imageCount > 1 ? ` Part ${currentImagePage}` : ""}
                </button>
                <button
                  className={buttonClass}
                  disabled={busy || !rows.length}
                  onClick={() => void downloadExcel()}
                >
                  <FileSpreadsheet size={16} />
                  Excel · All Winners
                </button>
                {permissions?.includes("Add Dummy Results") && (
                  <button
                    className={`${buttonClass} bg-yellow-500 text-black`}
                    disabled={busy}
                    onClick={() => setEditing({ winner: null })}
                  >
                    <Plus size={16} />
                    Add Dummy Winner
                  </button>
                )}
              </div>
            </div>
            {imageCount > 1 && (
              <div className="mb-3 flex items-center gap-3">
                <span>
                  Image part {currentImagePage} of {imageCount} (up to 400
                  winners each). Excel includes all winners.
                </span>
                <button
                  className={buttonClass}
                  disabled={currentImagePage <= 1}
                  onClick={() => setImagePage(currentImagePage - 1)}
                >
                  Previous Image
                </button>
                <button
                  className={buttonClass}
                  disabled={currentImagePage >= imageCount}
                  onClick={() => setImagePage(currentImagePage + 1)}
                >
                  Next Image
                </button>
              </div>
            )}
            <section
              aria-label="Winner image preview"
              className="mb-8 max-h-[65vh] overflow-auto rounded-xl border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-black"
            >
              {!rows.length ? (
                <p className="p-6 text-center">
                  No winners yet. Add a dummy winner to create a preview.
                </p>
              ) : previewError ? (
                <p role="alert">{previewError} Use Refresh to retry.</p>
              ) : ready ? (
                <img
                  className="h-auto w-full"
                  src={preview.asset.imageUrl}
                  alt={`${result.lotto_types.name} combined official and dummy winners`}
                />
              ) : (
                <p role="status" className="p-6">
                  Generating preview…
                </p>
              )}
            </section>
            <label className="mb-4 block">
              Search winners
              <input
                className="ml-3 rounded-lg border border-gray-300 bg-white p-2 dark:border-gray-700 dark:bg-black"
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <div className="overflow-x-auto rounded-xl bg-white dark:bg-black">
              <table className="w-full text-left text-sm">
                <thead className="bg-yellow-500 text-black">
                  <tr>
                    {[
                      "Admin",
                      "Bettor Name",
                      "Bet",
                      "Remarks",
                      "Prize",
                      "Source",
                      "Actions",
                    ].map((label) => (
                      <th key={label} className="p-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map(({ key, row, dummy }) => (
                    <tr
                      key={key}
                      className="border-b border-gray-200 dark:border-gray-800"
                    >
                      <td className="p-3 break-words">{row.admin}</td>
                      <td className="p-3 break-words">{row.bettorName}</td>
                      <td className="p-3">{row.bet}</td>
                      <td className="p-3 break-words">{row.remarks}</td>
                      <td className="p-3 whitespace-nowrap">
                        PHP {formatCurrency(row.prize)}
                      </td>
                      <td className="p-3">
                        {dummy ? "Dummy" : "Official · Read-only"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-3">
                          {dummy &&
                            permissions?.includes("Edit Dummy Results") && (
                              <button
                                disabled={busy}
                                className="text-blue-600 dark:text-blue-400 disabled:opacity-50"
                                onClick={() => setEditing({ winner: dummy })}
                              >
                                Edit
                              </button>
                            )}
                          {dummy &&
                            permissions?.includes("Delete Dummy Results") && (
                              <button
                                disabled={busy}
                                className="text-red-600 dark:text-red-400 disabled:opacity-50"
                                onClick={() => void handleDelete(dummy)}
                              >
                                Delete
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && <p className="p-4">No matching winners.</p>}
            </div>
            <div className="mt-4 flex items-center justify-end gap-4">
              <button
                className={buttonClass}
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of{" "}
                {Math.max(1, Math.ceil(filtered.length / 20))}
              </span>
              <button
                className={buttonClass}
                disabled={currentPage * 20 >= filtered.length}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
            {editing && (
              <DummyWinnerFormModal
                key={`${resultId}-${editing.winner?.id ?? "new"}`}
                winner={editing.winner}
                onClose={() => setEditing(null)}
                onSave={handleSave}
              />
            )}
          </>
        )}
      </div>
    </AdminTemplate>
  );
};

export default DummyResultDetailsPage;
