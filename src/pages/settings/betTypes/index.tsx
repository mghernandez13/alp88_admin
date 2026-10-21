import Headline from "../../../components/generic/Headline";
import AdminTemplate from "../../../templates/AdminTemplate";
import DataTable from "../../../components/generic/table";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  GET_BET_TYPES,
  UPDATE_BET_TYPE,
  BULK_UPDATE_BET_TYPES_STATUS,
} from "../../../graphql/queries/betTypes";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import ViewBetTypeModal from "../../../components/modals/betTypes/ViewBetTypeModal";
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
import type { SortDirection } from "../../../types/constants";
import type {
  BetTypesQueryData,
  BetTypesQueryVariables,
} from "../../../types/api";
import PrimaryButton from "../../../components/generic/buttons/Primary";
import IconTableActionButton from "../../../components/generic/buttons/IconTableActionButton";

const BetTypesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const searchQuery = searchParams.get("search") || "";
  const navigate = useNavigate();

  const [sortConfig, setSortConfig] = useState<{
    column: string;
    direction: SortDirection;
  }>({
    column: "name",
    direction: "DescNullsLast",
  });
  const [sortVariable, setSortVariable] = useState<Record<string, string>[]>(
    [],
  );
  const [pageSize, setPageSize] = useState<number>(5);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selectedGameTypes, setSelectedGameTypes] = useState<string[]>([]);
  const offset = (currentPage - 1) * pageSize;

  // build filter object dynamically based on search and selected game types
  const filterObj = useMemo(() => {
    const terms = searchQuery ? `%${searchQuery}%` : "%";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const andArr: any[] = [
      {
        or: [
          { game_type: { ilike: terms } },
          { name: { ilike: terms } },
          { code: { ilike: terms } },
        ],
      },
      { is_archive: { eq: false } },
    ];
    if (selectedGameTypes.length > 0) {
      andArr.push({ game_type: { in: selectedGameTypes } });
    }
    return { and: andArr };
  }, [searchQuery, selectedGameTypes]);

  const { data: allBetTypesData } = useQuery<BetTypesQueryData>(GET_BET_TYPES, {
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  const { data, loading, error } = useQuery<
    BetTypesQueryData,
    BetTypesQueryVariables
  >(GET_BET_TYPES, {
    variables: {
      first: pageSize,
      offset,
      filter: filterObj,
      sortOrder: sortVariable,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  const [updateBetType] = useMutation(UPDATE_BET_TYPE, {
    refetchQueries: [
      {
        query: GET_BET_TYPES,
        variables: {
          first: pageSize,
          offset,
          filter: filterObj,
          sortOrder: sortVariable,
        },
      },
    ],
  });

  const [bulkUpdateStatus, { loading: bulkLoading }] = useMutation(
    BULK_UPDATE_BET_TYPES_STATUS,
    {
      refetchQueries: [
        {
          query: GET_BET_TYPES,
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
        title: `Delete Bet Type`,
        text: `Are you sure you want delete?`,
        showCancelButton: true,
        reverseButtons: true,
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await updateBetType({
              variables: {
                id,
                isArchive: true,
              },
            });
            Swal.fire({
              icon: "success",
              title: "Delete Bet Type",
              text: `Bet type successfully deleted!`,
            });
          } catch (e) {
            Swal.fire({
              icon: "error",
              title: "Delete Bet Type",
              text: `Error occurred while trying to deleting bet type: ${e}`,
            });
          }
        }
      });
    },
    [updateBetType],
  );

  const handleOnDeleteSelected = useCallback(
    (selectedIndexes: number[]) => {
      const selectedIds = selectedIndexes
        .map((index) => {
          const lotto = data?.bet_typesCollection?.edges?.[index]?.node;
          return String(lotto?.id);
        })
        .filter(Boolean) as string[];

      if (selectedIds.length === 0) return;

      Swal.fire({
        icon: "warning",
        title: "Delete Selected Bet Types",
        text: `Are you sure you want to delete ${selectedIds.length} bet type(s)?`,
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
              text: `${selectedIds.length} bet type(s) successfully deleted!`,
            });
          } catch (e) {
            Swal.fire({
              icon: "error",
              title: "Delete Error",
              text: `Error occurred while deleting bet types: ${e}`,
            });
          }
        }
      });
    },
    [data?.bet_typesCollection?.edges, bulkUpdateStatus],
  );

  const toggleViewModal = useCallback((id: string) => {
    setViewingId(id);
  }, []);

  const columns = useMemo(() => {
    return {
      length: 5,
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
          {/* <th
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
          </th> */}
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
          <th
            scope="col"
            onClick={() => handleSort("code")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Code
            {sortConfig.column === "code" ? (
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
            Active
          </th>
        </>
      ),
    };
  }, [handleSort, sortConfig.column, sortConfig.direction]);

  const tableData = useMemo(() => {
    return (
      data?.bet_typesCollection?.edges?.map((item) => {
        return {
          gameType: item.node.game_type || "",
          // drawTime: item.node.draw_time ? formatTo12h(item.node.draw_time) : "",
          name: item.node.name,
          code: item.node.code,
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
                  onClick={() => toggleViewModal(String(item.node.id))}
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
                    navigate(`/settings/bet-types/update/${item.node.id}`)
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
                  onClick={() => handleDelete(String(item.node.id))}
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
  }, [data, handleDelete, navigate, toggleViewModal]);

  const gameTypeOptions = useMemo(() => {
    const counts: Record<string, number> = { "2D": 0, "3D": 0, LP3: 0 };
    allBetTypesData?.bet_typesCollection?.edges.forEach(({ node }) => {
      if (node.game_type && counts[node.game_type] !== undefined) {
        counts[node.game_type] += 1;
      }
    });
    return [
      { name: "2D", value: "2D", count: counts["2D"] },
      { name: "3D", value: "3D", count: counts["3D"] },
      { name: "LP3", value: "LP3", count: counts["LP3"] },
    ];
  }, [allBetTypesData]);

  const tableFilter = {
    gameType: {
      label: "Game Type",
      selectedFilter: selectedGameTypes,
      setSelectedFilter: setSelectedGameTypes,
      data: gameTypeOptions,
    },
  };

  useEffect(() => {
    // synchronize sort variable for query. using effect so that variable updates
    // when sortConfig changes. eslint rule disabled in other pages as well.
    setSortVariable([{ [sortConfig.column]: sortConfig.direction }]);
  }, [sortConfig]);

  // reset pagination only when game type filter changes
  useEffect(() => {
    setSearchParams({
      ...(searchQuery && { search: searchQuery }),
      page: "1",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGameTypes]);

  const totalCount = data?.bet_typesCollection?.totalCount ?? 0;

  return (
    <AdminTemplate>
      <div className="w-full px-4 sm:mx-2 md:mx-10 py-6">
        <div className="flex items-center justify-between mb-8">
          <Headline>Bet Types</Headline>
          <PrimaryButton onClick={() => navigate("./create")}>
            Create Bet Type
          </PrimaryButton>
        </div>

        <DataTable
          loading={loading || bulkLoading}
          error={error}
          tableName="Bet Type"
          columns={columns}
          data={tableData}
          pagination={{
            currentPage,
            totalCount,
            pageSize,
          }}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          hasNextPage={
            data?.bet_typesCollection?.pageInfo?.hasNextPage ?? false
          }
          pageSize={pageSize}
          setPageSize={setPageSize}
          tableFilter={tableFilter}
          onDeleteSelected={handleOnDeleteSelected}
        />

        <ViewBetTypeModal
          isOpen={!!viewingId}
          betTypeId={viewingId || ""}
          onClose={() => setViewingId(null)}
        />
      </div>
    </AdminTemplate>
  );
};

export default BetTypesPage;
