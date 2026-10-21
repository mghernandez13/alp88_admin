import { useCallback, useEffect, useMemo, useState } from "react";
import type { SetStateAction } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronsUpDown, ChevronUp, Eye } from "lucide-react";
import { UserAuth } from "../../components/context/AuthContext";
import Headline from "../../components/generic/Headline";
import DataTable from "../../components/generic/table";
import { supabase } from "../../db/supabase";
import { useCheckUserPermissions } from "../../hooks/useCheckUserPermission";
import AdminTemplate from "../../templates/AdminTemplate";
import type {
  DummyResultHeader,
  DummyResultsIndexPayload,
} from "../../types/dummyResults";
import { formatDrawDate } from "../../utils/helper";

type SortColumn = "created_at" | "draw_date" | "draw_type" | "combination";

const DummyResultsPage = () => {
  useCheckUserPermissions("View Dummy Results");
  const { session, loadingPage } = UserAuth();
  const permissions = session?.user.user_metadata.permissions;
  const canView =
    !loadingPage &&
    !!session &&
    Array.isArray(permissions) &&
    permissions.includes("View Dummy Results");
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get("page"));
  const currentPage =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const searchQuery = searchParams.get("search") || "";
  const [pageSize, setPageSize] = useState(10);
  const [selectedDrawTypeFilter, setSelectedDrawTypeFilter] = useState<
    string[]
  >([]);
  const [sortConfig, setSortConfig] = useState<{
    column: SortColumn;
    ascending: boolean;
  }>({ column: "created_at", ascending: false });
  const [payload, setPayload] = useState<DummyResultsIndexPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [retry, setRetry] = useState(0);
  const offset = (currentPage - 1) * pageSize;
  const userId = session?.user.id;
  const drawTypes = useMemo(
    () => selectedDrawTypeFilter.map(Number),
    [selectedDrawTypeFilter],
  );

  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    let cancelled = false;

    const loadResults = async () => {
      setLoading(true);
      setError(undefined);
      setPayload(null);
      try {
        const { data, error: requestError } = await supabase
          .rpc("get_dummy_results_index", {
            p_search: searchQuery,
            p_draw_types: drawTypes,
            p_sort: sortConfig.column,
            p_ascending: sortConfig.ascending,
            p_offset: offset,
            p_limit: pageSize,
          })
          .abortSignal(controller.signal);
        if (requestError) throw requestError;
        if (!data)
          throw new Error("No response received while loading dummy results.");
        if (!cancelled) setPayload(data as DummyResultsIndexPayload);
      } catch (requestError: unknown) {
        if (cancelled) return;
        const message =
          requestError &&
          typeof requestError === "object" &&
          "message" in requestError &&
          typeof requestError.message === "string"
            ? requestError.message
            : "Failed to load dummy results. Please try again.";
        setError(new Error(message));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadResults();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    canView,
    userId,
    searchQuery,
    drawTypes,
    sortConfig,
    offset,
    pageSize,
    retry,
  ]);

  const resetPage = useCallback(() => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("page", "1");
      return next;
    });
  }, [setSearchParams]);

  const handleDrawTypeFilterChange = useCallback(
    (value: SetStateAction<string[]>) => {
      setSelectedDrawTypeFilter(value);
      resetPage();
    },
    [resetPage],
  );

  const handlePageSizeChange = useCallback(
    (value: SetStateAction<number>) => {
      setPageSize(value);
      resetPage();
    },
    [resetPage],
  );

  const handleSort = useCallback(
    (column: SortColumn) => {
      setSortConfig((previous) => ({
        column,
        ascending: previous.column === column ? !previous.ascending : true,
      }));
      resetPage();
    },
    [resetPage],
  );

  const tableFilter = useMemo(
    () => ({
      drawType: {
        label: "Draw Type",
        selectedFilter: selectedDrawTypeFilter,
        setSelectedFilter: handleDrawTypeFilterChange,
        data: (payload?.drawTypes ?? []).map((drawType) => ({
          name: drawType.name,
          value: String(drawType.id),
          count: drawType.count,
        })),
      },
    }),
    [payload, selectedDrawTypeFilter, handleDrawTypeFilterChange],
  );

  const columns = useMemo(
    () => ({
      length: 4,
      render: (
        <>
          {(
            [
              ["draw_date", "Draw Date"],
              ["draw_type", "Draw Type"],
              ["combination", "Combination"],
            ] as const
          ).map(([column, label]) => {
            const Icon =
              sortConfig.column !== column
                ? ChevronsUpDown
                : sortConfig.ascending
                  ? ChevronUp
                  : ChevronDown;
            return (
              <th
                key={column}
                scope="col"
                aria-sort={
                  sortConfig.column === column
                    ? sortConfig.ascending
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className="relative px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => handleSort(column)}
                  className="inline-flex items-center gap-2 bg-transparent uppercase font-inherit"
                >
                  {label}
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </button>
              </th>
            );
          })}
          <th scope="col" className="px-4 py-3 text-right">
            Actions
          </th>
        </>
      ),
    }),
    [handleSort, sortConfig],
  );

  const tableData = useMemo(
    () =>
      (payload?.rows ?? []).map((row: DummyResultHeader) => ({
        draw_date: formatDrawDate(row.draw_date),
        draw_type: row.lotto_types?.name ?? "",
        combination: row.combination,
        action: (
          <div className="flex gap-2 items-center justify-end">
            <Link
              to={`/dummy-results/details/${row.id}`}
              aria-label={`View dummy results for ${row.lotto_types?.name ?? "draw"} on ${formatDrawDate(row.draw_date)}`}
              title="View Summary"
              className="inline-flex items-center p-0.5 text-sm font-medium text-gray-500 hover:text-gray-800 rounded-lg focus-visible:ring-2 focus-visible:ring-yellow-500 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <Eye className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
        ),
      })),
    [payload],
  );

  const totalCount = payload?.totalCount ?? 0;

  return (
    <AdminTemplate>
      <div className="w-full px-4 sm:mx-2 md:mx-10 py-6">
        <div className="flex items-center justify-between mb-8">
          <Headline>Dummy Results</Headline>
        </div>
        {loadingPage ? (
          <p role="status">Loading permissions...</p>
        ) : !canView ? (
          <p role="alert">You do not have permission to view Dummy Results.</p>
        ) : (
          <>
            {error && (
              <div role="alert" className="mb-4 text-red-600 dark:text-red-400">
                {error.message}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Retry
                </button>
              </div>
            )}
            <DataTable
              loading={loading}
              error={error}
              tableName="Draw Result"
              columns={columns}
              data={tableData}
              tableFilter={tableFilter}
              pagination={{ currentPage, totalCount, pageSize }}
              searchParams={searchParams}
              setSearchParams={setSearchParams}
              hasNextPage={offset + pageSize < totalCount}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50, 100]}
              syncSearchWithUrl
              setPageSize={handlePageSizeChange}
              bulkAction={false}
            />
          </>
        )}
      </div>
    </AdminTemplate>
  );
};

export default DummyResultsPage;
