import Headline from "../../../components/generic/Headline";
import AdminTemplate from "../../../templates/AdminTemplate";
import DataTable from "../../../components/generic/table";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  GET_LOTTO_TYPE_OPTIONS,
  UPDATE_LOTTO_TYPE,
  BULK_UPDATE_LOTTO_STATUS,
} from "../../../graphql/queries/lotto";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ViewLottoTypeModal from "../../../components/modals/lottoTypes/ViewLottoTypeModal";
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Eye,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { DAYS_OF_WEEK, type SortDirection } from "../../../types/constants";
import { formatTo12h } from "../../../utils/helper";
import type { LottoQueryData, LottoQueryVariables } from "../../../types/api";
import PrimaryButton from "../../../components/generic/buttons/Primary";
import { useCheckUserPermissions } from "../../../hooks/useCheckUserPermission";
import IconTableActionButton from "../../../components/generic/buttons/IconTableActionButton";

const LottoTypesPage: React.FC = () => {
  useCheckUserPermissions("View Lotto Types");

  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const searchQuery = searchParams.get("search") || "";
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState<{
    column: string;
    direction: SortDirection;
  }>({
    column: "created_at",
    direction: "DescNullsLast",
  });
  const [sortVariable, setSortVariable] = useState<Record<string, string>[]>(
    [],
  );
  const [pageSize, setPageSize] = useState<number>(10);
  const offset = (currentPage - 1) * pageSize;
  const [popupRow, setPopupRow] = useState<number | null>(null);
  const [popupDays, setPopupDays] = useState<string[]>([]);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [viewingLottoId, setViewingLottoId] = useState<string | null>(null);
  const [selectedGameTypes, setSelectedGameTypes] = useState<string[]>([]);

  const closePopup = () => setPopupRow(null);

  // build filter object dynamically based on search and selected game types
  const filterObj = useMemo(() => {
    const terms = searchQuery ? `%${searchQuery}%` : "%";
    const andArr: unknown[] = [
      {
        or: [{ game_type: { ilike: terms } }, { name: { ilike: terms } }],
      },
      { is_archive: { eq: false } },
    ];
    if (selectedGameTypes.length > 0) {
      andArr.push({ game_type: { in: selectedGameTypes } });
    }
    return { and: andArr };
  }, [searchQuery, selectedGameTypes]);

  const { data, loading, error } = useQuery<
    LottoQueryData,
    LottoQueryVariables
  >(GET_LOTTO_TYPE_OPTIONS, {
    variables: {
      first: pageSize,
      offset,
      filter: filterObj,
      sortOrder: sortVariable,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  const [updateLottoType, { loading: updateLottoLoading }] = useMutation(
    UPDATE_LOTTO_TYPE,
    {
      refetchQueries: [
        {
          query: GET_LOTTO_TYPE_OPTIONS,
          variables: {
            first: pageSize,
            offset,
            filter: filterObj,
            sortOrder: sortVariable,
          },
        },
      ],
    },
  );

  const [bulkUpdateStatus, { loading: bulkUpdateLoading }] = useMutation(
    BULK_UPDATE_LOTTO_STATUS,
    {
      refetchQueries: [
        {
          query: GET_LOTTO_TYPE_OPTIONS,
          variables: {
            first: pageSize,
            offset,
            filter: filterObj,
            sortOrder: sortVariable,
          },
        },
      ],
    },
  );

  // Static game type filter: only 2D, 3D, LP3, but counts from all lotto types (unfiltered)
  const allLottoTypes = useQuery<LottoQueryData, LottoQueryVariables>(
    GET_LOTTO_TYPE_OPTIONS,
    {
      variables: {
        first: 1000, // large enough to get all
        offset: 0,
        filter: { is_archive: { eq: false } },
        sortOrder: [{ name: "AscNullsFirst" }],
      },
      fetchPolicy: "network-only",
    },
  );

  const totalCount = data?.lotto_typesCollection?.totalCount ?? 0;
  const hasNextPage = Boolean(
    data?.lotto_typesCollection?.pageInfo?.hasNextPage,
  );

  const togglePopup = useCallback(
    (row: number, days: string[], e?: React.MouseEvent<HTMLButtonElement>) => {
      if (popupRow === row) {
        setPopupRow(null);
      } else {
        setPopupRow(row);
        setPopupDays(days);
        if (e) {
          const rect = e.currentTarget.getBoundingClientRect();
          setPopupPos({ top: rect.bottom, left: rect.left });
        }
      }
    },
    [popupRow],
  );

  const handleSort = useCallback(
    (columnName: string) => {
      let direction: SortDirection = "AscNullsFirst";
      if (
        sortConfig.column === columnName &&
        sortConfig.direction === "AscNullsFirst"
      ) {
        direction = "DescNullsLast";
      }
      setSortConfig({ column: columnName, direction });
    },
    [sortConfig.column, sortConfig.direction],
  );

  const handleDelete = useCallback(
    (id: string) => {
      Swal.fire({
        icon: "warning",
        title: "Delete Lotto Type",
        text: "Are you sure you want to delete this lotto type?",
        showCancelButton: true,
        reverseButtons: true,
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await updateLottoType({
              variables: {
                id,
                isArchive: true,
              },
            });
            Swal.fire({
              icon: "success",
              title: "Delete Success",
              text: "Lotto type successfully deleted!",
            });
          } catch (e) {
            Swal.fire({
              icon: "error",
              title: "Delete Error",
              text: `Error occurred while deleting lotto type: ${e}`,
            });
          }
        }
      });
    },
    [updateLottoType],
  );

  // helper to render the days popup via portal
  const renderDaysPopup = useCallback(
    (index: number) => {
      if (popupRow !== index || typeof document === "undefined") return null;

      return createPortal(
        <div
          className="w-40 bg-white dark:bg-[#222222] text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded shadow-lg z-20 days-popup-floating"
          style={{
            position: "absolute",
            top: popupPos.top,
            left: popupPos.left,
            transform: "translateY(4px)",
          }}
        >
          <ul className="flex-col p2">
            {DAYS_OF_WEEK.map((d) => {
              const active = popupDays?.includes(d);
              return (
                <li key={d} className="flex gap-2 m-2 items-center">
                  {active ? (
                    <div className="w-5 h-5 rounded-full border-2 border-yellow-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-yellow-500" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-500 dark:border-white-500 dark:border-gray-200 flex items-center justify-center">
                      <X className="w-3 h-3 text-gray-700 dark:text-white-500 dark:text-white" />
                    </div>
                  )}
                  <span
                    className={`text-sm ${active ? "text-yellow-500" : "text-gray-700 dark:text-white-500 dark:text-white"}`}
                  >
                    {d}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      );
    },
    [popupDays, popupPos.left, popupPos.top, popupRow],
  );

  const columns = useMemo(() => {
    return {
      length: 8,
      render: (
        <>
          <th
            scope="col"
            onClick={() => handleSort("game_type")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Game Type
            {sortConfig.column === "game_type" ? (
              sortConfig.direction === "AscNullsFirst" ? (
                <ChevronUp className="absolute left-24 top-4 w-4 h-4" />
              ) : (
                <ChevronDown className="absolute left-24 top-4 w-4 h-4" />
              )
            ) : (
              <ChevronsUpDown className="absolute left-24 top-4 w-4 h-4" />
            )}
          </th>

          <th
            scope="col"
            onClick={() => handleSort("draw_time")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Draw Time
            {sortConfig.column === "draw_time" ? (
              sortConfig.direction === "AscNullsFirst" ? (
                <ChevronUp className="absolute left-24 top-4 w-4 h-4" />
              ) : (
                <ChevronDown className="absolute left-24 top-4 w-4 h-4" />
              )
            ) : (
              <ChevronsUpDown className="absolute left-24 top-4 w-4 h-4" />
            )}
          </th>

          <th
            scope="col"
            onClick={() => handleSort("name")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Name
            {sortConfig.column === "name" ? (
              sortConfig.direction === "AscNullsFirst" ? (
                <ChevronUp className="absolute left-14 top-4 w-4 h-4" />
              ) : (
                <ChevronDown className="absolute left-14 top-4 w-4 h-4" />
              )
            ) : (
              <ChevronsUpDown className="absolute left-14 top-4 w-4 h-4" />
            )}
          </th>

          <th scope="col" className="px-4 py-3">
            Days Active
          </th>

          <th scope="col" className="px-4 py-3">
            #Digits
          </th>

          <th scope="col" className="px-4 py-3">
            Min#
          </th>

          <th scope="col" className="px-4 py-3">
            Max#
          </th>

          <th scope="col" className="px-4 py-3">
            Active
          </th>
        </>
      ),
    };
  }, [handleSort, sortConfig.column, sortConfig.direction]);

  const tableData = useMemo(() => {
    return (
      data?.lotto_typesCollection?.edges?.map((item, index) => {
        return {
          gameType: item?.node?.game_type,
          drawTime: item?.node?.draw_time
            ? formatTo12h(item.node.draw_time)
            : "—",
          name: item?.node?.name,
          daysActive: (
            <div className="relative days-popup-container">
              <button
                type="button"
                className="text-yellow-500 hover:underline bg-transparent"
                onClick={(e) =>
                  togglePopup(index, item?.node?.days_active ?? [], e)
                }
              >
                View
              </button>
              {renderDaysPopup(index)}
            </div>
          ),
          digits: item?.node?.number_of_digits,
          minNumber: item?.node?.min_number,
          maxNumber: item?.node?.max_number,
          active: item?.node?.is_active ? (
            <div className="flex items-center">
              <div className="w-5 h-5 rounded-full border-2 border-yellow-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-yellow-500" />
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="w-5 h-5 rounded-full border-2 border-red-500 flex items-center justify-center">
                <X className="w-3 h-3 text-red-500" />
              </div>
            </div>
          ),
          action: (
            <td className="flex gap-2 px-4 py-3 items-center justify-end">
              <div className="relative flex flex-col items-center group">
                <IconTableActionButton
                  onClick={() => setViewingLottoId(String(item?.node?.id))}
                  type="button"
                >
                  <Eye className="w-5 h-5" />
                </IconTableActionButton>
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center">
                  <span className="relative z-10 p-2 text-xs leading-none text-gray-900 dark:text-white whitespace-no-wrap bg-gray-100 dark:bg-gray-900 shadow-lg rounded-md">
                    View
                  </span>
                  <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-100 dark:bg-gray-900"></div>
                </div>
              </div>
              <div className="relative flex flex-col items-center group">
                <IconTableActionButton
                  onClick={() =>
                    navigate(`/settings/lotto-types/update/${item?.node?.id}`)
                  }
                  type="button"
                >
                  <SquarePen className="w-5 h-5" />
                </IconTableActionButton>
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center">
                  <span className="relative z-10 p-2 text-xs leading-none text-gray-900 dark:text-white whitespace-no-wrap bg-gray-100 dark:bg-gray-900 shadow-lg rounded-md">
                    Edit
                  </span>
                  <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-100 dark:bg-gray-900"></div>
                </div>
              </div>
              <div className="relative flex flex-col items-center group">
                <IconTableActionButton
                  type="button"
                  onClick={() => handleDelete(String(item?.node?.id))}
                >
                  <Trash2 className="w-5 h-5" />
                </IconTableActionButton>
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center">
                  <span className="relative z-10 p-2 text-xs leading-none text-gray-900 dark:text-white whitespace-no-wrap bg-gray-100 dark:bg-gray-900 shadow-lg rounded-md">
                    Delete
                  </span>
                  <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-100 dark:bg-gray-900"></div>
                </div>
              </div>
            </td>
          ),
        };
      }) ?? []
    );
  }, [
    data?.lotto_typesCollection?.edges,
    handleDelete,
    navigate,
    renderDaysPopup,
    togglePopup,
  ]);

  const gameTypeOptions = useMemo(() => {
    const counts: Record<string, number> = { "2D": 0, "3D": 0, LP3: 0 };
    allLottoTypes.data?.lotto_typesCollection?.edges.forEach(({ node }) => {
      if (counts[node.game_type] !== undefined) {
        counts[node.game_type] += 1;
      }
    });
    return [
      { name: "2D", value: "2D", count: counts["2D"] },
      { name: "3D", value: "3D", count: counts["3D"] },
      { name: "LP3", value: "LP3", count: counts["LP3"] },
    ];
  }, [allLottoTypes.data]);

  const tableFilter = {
    gameType: {
      label: "Game Type",
      selectedFilter: selectedGameTypes,
      setSelectedFilter: setSelectedGameTypes,
      data: gameTypeOptions,
    },
  };

  // reset pagination when filter changes
  useEffect(() => {
    setSearchParams({ search: searchQuery, page: "1" });
  }, [searchQuery, selectedGameTypes, setSearchParams]);

  const handleOnDeleteSelected = useCallback(
    (selectedIndexes: number[]) => {
      const selectedIds = selectedIndexes
        .map((index) => {
          const lotto = data?.lotto_typesCollection?.edges?.[index]?.node;
          return Number(lotto?.id);
        })
        .filter(Boolean) as number[];

      if (selectedIds.length === 0) return;

      Swal.fire({
        icon: "warning",
        title: "Delete Selected Lotto Types",
        text: `Are you sure you want to delete ${selectedIds.length} lotto type(s)?`,
        showCancelButton: true,
        reverseButtons: true,
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await bulkUpdateStatus({
              variables: {
                lottoIds: selectedIds,
                isArchive: true,
              },
            });
            Swal.fire({
              icon: "success",
              title: "Delete Success",
              text: `${selectedIds.length} lotto type(s) successfully deleted!`,
            });
          } catch (e) {
            Swal.fire({
              icon: "error",
              title: "Delete Error",
              text: `Error occurred while deleting lotto types: ${e}`,
            });
          }
        }
      });
    },
    [data?.lotto_typesCollection?.edges, bulkUpdateStatus],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSortVariable([{ [sortConfig.column]: sortConfig.direction }]);
  }, [sortConfig]);

  // close popup when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRow !== null) {
        const target = e.target as HTMLElement;
        if (
          !target.closest(".days-popup-container") &&
          !target.closest(".days-popup-floating")
        ) {
          closePopup();
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popupRow]);

  return (
    <AdminTemplate>
      <div className="flex-col w-full sm:mx-2 py-2 md:mx-10">
        <div className="flex items-center justify-between mb-8">
          <Headline>Lotto Types</Headline>
          <PrimaryButton onClick={() => navigate("./create")}>
            Create Lotto Type
          </PrimaryButton>
        </div>
        <DataTable
          loading={loading || updateLottoLoading || bulkUpdateLoading}
          error={error}
          tableName="Lotto Type"
          columns={columns}
          data={tableData}
          pagination={{
            currentPage,
            totalCount,
            pageSize,
          }}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          hasNextPage={hasNextPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          tableFilter={tableFilter}
          onDeleteSelected={handleOnDeleteSelected}
        />
      </div>
      {viewingLottoId && (
        <ViewLottoTypeModal
          isOpen={Boolean(viewingLottoId)}
          onClose={() => setViewingLottoId(null)}
          lottoTypeId={viewingLottoId}
        />
      )}
    </AdminTemplate>
  );
};

export default LottoTypesPage;
