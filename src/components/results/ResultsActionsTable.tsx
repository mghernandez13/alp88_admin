import type React from "react";
import { GET_DRAW_RESULTS_LOGS } from "../../graphql/queries/resultsLogs";
import type {
  DrawResultsLogsQueryData,
  QueryParamsVariables,
} from "../../types/api";
import { useQuery } from "@apollo/client/react";
import { useState, useEffect } from "react";
import Skeleton from "../generic/Skeleton";

interface ResultsActionsTableProps {
  resultId?: string;
}

const ResultsActionsTable: React.FC<ResultsActionsTableProps> = ({
  resultId,
}) => {
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch draw_results_logs for this result
  const {
    data: logsData,
    loading: logsLoading,
    // error: logsError, // removed unused variable
  } = useQuery<DrawResultsLogsQueryData, QueryParamsVariables>(
    GET_DRAW_RESULTS_LOGS,
    {
      variables: {
        first: pageSize,
        offset: (page - 1) * pageSize,
        filter: resultId
          ? { draw_result_id: { eq: parseInt(resultId) } }
          : undefined,
        sortOrder: [{ created_at: "DescNullsLast" }],
      },
      skip: !resultId,
      fetchPolicy: "network-only",
    },
  );

  const totalCount = logsData?.draw_results_logsCollection?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Reset to page 1 when resultId changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [resultId]);

  return (
    <div className="bg-white dark:bg-black rounded-lg p-6 mt-8 ml-6">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-lg text-gray-900 dark:text-white">
          Actions
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-600 dark:text-gray-400">
          <thead className="text-xs uppercase bg-gray-100 dark:bg-[#222222] text-gray-600 dark:text-gray-400">
            <tr>
              <th className="px-4 py-2 font-semibold">ID</th>
              <th className="px-4 py-2 font-semibold">Name</th>
              <th className="px-4 py-2 font-semibold">Initiated By</th>
              <th className="px-4 py-2 font-semibold">Target</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Happened At</th>
              <th className="px-4 py-2 font-semibold text-center"> </th>
            </tr>
          </thead>
          <tbody>
            {logsLoading ? (
              <tr>
                <td colSpan={7}>
                  <Skeleton width={"100%"} height={24} />
                </td>
              </tr>
            ) : logsData?.draw_results_logsCollection?.edges?.length ? (
              logsData.draw_results_logsCollection.edges.map(({ node }) => (
                <tr
                  key={node.id}
                  className="border-b border-gray-200 dark:border-gray-700"
                >
                  <td className="px-4 py-3 text-yellow-500 underline cursor-pointer">
                    {node.id}
                  </td>
                  <td className="px-4 py-3">{node.name}</td>
                  <td className="px-4 py-3">{node.profiles.full_name}</td>
                  <td className="px-4 py-3">
                    Result:{" "}
                    {node.draw_results && node.draw_results.draw_date
                      ? new Date(
                          node.draw_results.draw_date,
                        ).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        node.status === "FAILED"
                          ? "bg-red-700 text-white px-3 py-1 rounded-full text-xs font-bold"
                          : node.status === "STARTED"
                            ? "bg-blue-700 text-white px-3 py-1 rounded-full text-xs font-bold"
                            : "bg-green-700 text-white px-3 py-1 rounded-full text-xs font-bold"
                      }
                    >
                      {node.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(node.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {/* <span
                      className="inline-block w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                      title="View"
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        ></path>
                      </svg>
                    </span> */}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-gray-600 dark:text-gray-400 py-4"
                >
                  No actions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 mt-4">
          <button
            className="px-3 py-1 rounded bg-gray-100 dark:bg-[#222222] hover:bg-[#f3f6dc] dark:hover:bg-[#222910] text-gray-900 dark:text-white disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-gray-700 dark:text-gray-300">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-100 dark:bg-[#222222] hover:bg-[#f3f6dc] dark:hover:bg-[#222910] text-gray-900 dark:text-white disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ResultsActionsTable;
