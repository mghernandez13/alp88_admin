import { useCallback } from "react";
import type { TablePaginationProps } from "../../../types/generic";
import { getPaginationRange } from "../../../utils/helper";

const TablePagination: React.FC<TablePaginationProps> = (props) => {
  const { properties, loading, setSearchParams, hasNextPage, searchParams } =
    props;
  const { totalCount, pageSize, currentPage } = properties;
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = totalCount === 0 ? 0 : currentPage * pageSize - pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);
  const paginationRange = getPaginationRange(currentPage, totalPages);
  const searchQuery = searchParams.get("search") ?? null;

  const handlePageNavigation = useCallback(
    (page: number) => {
      setSearchParams({
        ...(searchQuery && {
          search: searchQuery,
        }),
        page: page.toString(),
      });
    },
    [searchQuery, setSearchParams],
  );

  if (loading) return <></>;

  return (
    <nav
      className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4"
      aria-label="Table navigation"
    >
      <span className="flex gap-2 text-sm font-normal text-gray-500 dark:text-gray-400">
        Showing
        <span className="font-semibold text-gray-900 dark:text-white">
          {from}-{to}
        </span>
        of
        <span className="font-semibold text-gray-900 dark:text-white">
          {totalCount}
        </span>
      </span>
      <ul className="inline-flex gap-2 items-stretch -space-x-px">
        <li>
          <button
            disabled={loading || currentPage === 1}
            onClick={() => handlePageNavigation(currentPage - 1)}
            className="flex items-center justify-center h-full py-1.5 px-3 ml-0 text-gray-500 bg-white dark:bg-[#222222] rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <span className="sr-only">Previous</span>
            <svg
              className="w-5 h-5"
              aria-hidden="true"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </li>

        {paginationRange.map((page, index) => {
          // If page is '...', clicking it should go to the middle page between previous and next visible page numbers
          let onClickHandler = undefined;
          if (typeof page === "number") {
            onClickHandler = () => handlePageNavigation(page);
          } else if (page === "...") {
            // Find previous and next page numbers
            let prev: string | null = null,
              next: string | null = null;
            // Look backwards for previous number
            for (let i = index - 1; i >= 0; i--) {
              if (typeof paginationRange[i] === "number") {
                prev = paginationRange[i].toString();
                break;
              }
            }
            // Look forwards for next number
            for (let i = index + 1; i < paginationRange.length; i++) {
              if (typeof paginationRange[i] === "number") {
                next = paginationRange[i].toString();
                break;
              }
            }
            if (prev !== null && next !== null) {
              const middle = Math.floor((Number(prev) + Number(next)) / 2);
              onClickHandler = () => handlePageNavigation(middle);
            }
          }
          return (
            <li key={index}>
              <button
                disabled={loading || (page === "..." && !onClickHandler)}
                onClick={onClickHandler}
                className={`flex items-center justify-center text-sm py-2 px-3 leading-tight text-gray-500 border border-gray-300 hover:bg-gray-100 hover:text-gray-700 ${currentPage === page ? `bg-[#f3f6dc] dark:bg-[#222910]` : `bg-white dark:bg-[#222222]`} dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white`}
              >
                {page}
              </button>
            </li>
          );
        })}

        <li>
          <button
            disabled={loading || !hasNextPage}
            className="flex items-center justify-center h-full py-1.5 px-3 leading-tight text-gray-500 rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 bg-white dark:bg-[#222222] dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
            onClick={() => handlePageNavigation(currentPage + 1)}
          >
            <span className="sr-only">Next</span>
            <svg
              className="w-5 h-5"
              aria-hidden="true"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default TablePagination;
