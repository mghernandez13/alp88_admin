import { useQuery } from "@apollo/client/react";
import DataTable from "../../components/generic/table";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GET_RESULTS } from "../../graphql/queries/results";
import { GET_LOTTO_TYPES } from "../../graphql/queries/lotto";
import type { LottoQueryData, LottoQueryVariables } from "../../types/api";
import type {
  ResultsQueryData,
  ResultsQueryVariables,
} from "../../types/results";
import ViewResultModal from "../../components/modals/results/ViewResultModal";
import AdminTemplate from "../../templates/AdminTemplate";
import { formatDrawDate } from "../../utils/helper";
import { ChevronDown, ChevronsUpDown, ChevronUp, Eye } from "lucide-react";
import Headline from "../../components/generic/Headline";

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const searchQuery = searchParams.get("search") || "";
  const [sortConfig, setSortConfig] = useState<{
    column: string;
    direction: string;
  }>({ column: "created_at", direction: "DescNullsLast" });
  const [pageSize, setPageSize] = useState<number>(10);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedResult] = useState<
    ResultsQueryData["draw_resultsCollection"]["edges"][number]["node"] | null
  >(null);
  const [sortVariable, setSortVariable] = useState<Record<string, string>[]>([
    { created_at: "DescNullsFirst" },
  ]);
  const [selectedDrawTypeFilter, setSelectedDrawTypeFilter] = useState<
    string[]
  >([]);
  const offset = (currentPage - 1) * pageSize;

  const searchTerm = useMemo(() => {
    return searchQuery ? `%${searchQuery}%` : "%";
  }, [searchQuery]);

  const { data: lottoTypesData } = useQuery<
    LottoQueryData,
    LottoQueryVariables
  >(GET_LOTTO_TYPES, {
    variables: {
      first: 100,
      offset: 0,
      filter: { is_archive: { eq: false } },
      sortOrder: [{ name: "AscNullsFirst" }],
    },
    fetchPolicy: "network-only",
  });

  const filterObj = useMemo((): ResultsQueryVariables["filter"] => {
    const baseFilter: Record<string, unknown> = {
      is_archive: { eq: false },
      combination: { ilike: searchTerm },
    };
    if (selectedDrawTypeFilter.length > 0) {
      baseFilter.draw_type = { in: selectedDrawTypeFilter };
    }
    return baseFilter;
  }, [searchTerm, selectedDrawTypeFilter]);

  const { data, loading, error } = useQuery<
    ResultsQueryData,
    ResultsQueryVariables
  >(GET_RESULTS, {
    variables: {
      first: pageSize,
      offset,
      searchTerm,
      sortOrder: sortVariable,
      filter: filterObj,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  // Use master data for static filter counts (imitate agents/bets table)
  const drawTypeFilterData = useMemo(() => {
    return (
      lottoTypesData?.lotto_typesCollection?.edges.map(({ node }) => ({
        name: node.name,
        value: String(node.id),
        count: node?.draw_resultsCollection?.totalCount ?? 0,
      })) || []
    );
  }, [lottoTypesData]);

  const tableFilter = {
    drawType: {
      label: "Draw Type",
      selectedFilter: selectedDrawTypeFilter,
      setSelectedFilter: setSelectedDrawTypeFilter,
      data: drawTypeFilterData,
    },
  };

  const handleSort = useCallback(
    (columnName: string) => {
      let direction = "AscNullsFirst";
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

  const handleViewDetails = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, resultId: number) => {
      e.preventDefault();
      // Your logic to handle viewing details
      navigate(`/results/details/${resultId}`);
    },
    [navigate],
  );

  const columns = useMemo(() => {
    return {
      length: 4,
      render: (
        <>
          <th
            scope="col"
            onClick={() => handleSort("draw_date")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Draw Date
            {sortConfig.column === "draw_date" ? (
              sortConfig.direction === "AscNullsFirst" ? (
                <ChevronUp className="absolute right-20 top-4 w-4 h-4" />
              ) : (
                <ChevronDown className="absolute right-20 top-4 w-4 h-4" />
              )
            ) : (
              <ChevronsUpDown className="absolute right-20 top-4 w-4 h-4" />
            )}
          </th>
          <th
            scope="col"
            onClick={() => handleSort("draw_type")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Draw Type
            {sortConfig.column === "draw_type" ? (
              sortConfig.direction === "AscNullsFirst" ? (
                <ChevronUp className="absolute right-20 top-4 w-4 h-4" />
              ) : (
                <ChevronDown className="absolute right-20 top-4 w-4 h-4" />
              )
            ) : (
              <ChevronsUpDown className="absolute right-20 top-4 w-4 h-4" />
            )}
          </th>
          <th
            scope="col"
            onClick={() => handleSort("combination")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Combination
            {sortConfig.column === "combination" ? (
              sortConfig.direction === "AscNullsFirst" ? (
                <ChevronUp className="absolute right-20 top-4 w-4 h-4" />
              ) : (
                <ChevronDown className="absolute right-20 top-4 w-4 h-4" />
              )
            ) : (
              <ChevronsUpDown className="absolute right-20 top-4 w-4 h-4" />
            )}
          </th>
          <th scope="col" className="px-4 py-3 text-right">
            Actions
          </th>
        </>
      ),
    };
  }, [handleSort, sortConfig]);

  const lottoTypeMap = useMemo(() => {
    const map: Record<string, string> = {};
    lottoTypesData?.lotto_typesCollection?.edges.forEach(({ node }) => {
      map[node.id] = node.name;
    });
    return map;
  }, [lottoTypesData]);

  const tableData = useMemo(() => {
    return (data?.draw_resultsCollection?.edges || []).map(({ node }) => {
      if (!node) return {};
      return {
        draw_date: formatDrawDate(node.draw_date ?? ""),
        draw_type: node.lotto_types?.name ?? "",
        combination: node.combination,
        action: (
          <td className="flex gap-2 px-4 py-3 items-center justify-end">
            <div className="relative flex flex-col items-center group">
              <a
                href="#"
                onClick={(e) => handleViewDetails(e, node.id)}
                className="inline-flex items-center p-0.5 text-sm font-medium text-center text-gray-500 hover:text-gray-800 rounded-lg focus:outline-none dark:text-gray-400 dark:hover:text-gray-100"
              >
                <Eye className="w-5 h-5" />
              </a>
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center">
                <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-gray-900 shadow-lg rounded-md">
                  View Summary
                </span>
                <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-900"></div>
              </div>
            </div>
          </td>
        ),
      };
    });
  }, [data?.draw_resultsCollection?.edges, handleViewDetails, lottoTypeMap]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSortVariable([{ [sortConfig.column]: sortConfig.direction }]);
  }, [sortConfig]);

  const totalCount = data?.draw_resultsCollection?.totalCount ?? 0;

  return (
    <AdminTemplate>
      <div className="w-full px-4  sm:mx-2 md:mx-10 py-6">
        <div className="flex items-center justify-between mb-8">
          <Headline>Draw Results</Headline>
          <button
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-2 rounded-lg shadow"
            onClick={() => navigate("/results/create")}
          >
            Create Result
          </button>
        </div>
        <DataTable
          loading={loading}
          error={error}
          tableName="Draw Result"
          columns={columns}
          data={tableData}
          tableFilter={tableFilter}
          pagination={{
            currentPage,
            totalCount,
            pageSize,
          }}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          hasNextPage={
            data?.draw_resultsCollection?.pageInfo?.hasNextPage ?? false
          }
          pageSize={pageSize}
          setPageSize={setPageSize}
          bulkAction={false}
          onDeleteSelected={() => {}}
        />
        {viewModalOpen && (
          <ViewResultModal
            open={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            result={
              selectedResult
                ? {
                    draw_date: selectedResult.draw_date,
                    draw_type: selectedResult.draw_type,
                    combination: selectedResult.combination,
                    lotto_type_name:
                      lottoTypeMap[String(selectedResult.draw_type)],
                  }
                : null
            }
          />
        )}
      </div>
    </AdminTemplate>
  );
};

export default ResultsPage;
