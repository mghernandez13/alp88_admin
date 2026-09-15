import { useState, useEffect, useRef, useCallback } from "react";
import LoadingSpinner from "../../LoadingSpinner";
import TablePagination from "./TablePagination";
import TableHeader from "./TableHeader";
import type { TableRecordProps } from "../../../types/generic";
import { ChevronDown } from "lucide-react";

const DataTable: React.FC<TableRecordProps> = (props) => {
  const {
    loading,
    pagination,
    tableName,
    columns,
    data,
    error,
    tableFilter,
    searchParams,
    setSearchParams,
    hasNextPage,
    pageSize,
    setPageSize,
    onDeleteSelected,
    bulkAction = true,
    bulkActionPlacement = "column",
  } = props;

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedRows(new Set(data.map((_, index) => index)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen((o) => !o);

  // ref for the header cell container so we can detect clicks outside
  const menuRef = useRef<HTMLTableCellElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDeleteSelected = useCallback(() => {
    setMenuOpen(false);
    if (onDeleteSelected) {
      onDeleteSelected(Array.from(selectedRows), () =>
        setSelectedRows(new Set()),
      );
    }
  }, [onDeleteSelected, selectedRows]);

  return (
    <div className="bg-black relative shadow-md sm:rounded-lg overflow-hidden">
      <TableHeader
        tableName={tableName}
        tableFilter={tableFilter}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        pageSize={pageSize}
        setPageSize={setPageSize}
        selectedCount={selectedRows.size}
        onDeleteSelectedClick={handleDeleteSelected}
        bulkActionPlacement={bulkActionPlacement}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-[#222910] dark:text-gray-400">
            <tr>
              {bulkAction && (
                <th scope="col" className="px-4 py-3 relative">
                  <div className="flex items-center space-x-1">
                    <input
                      type="checkbox"
                      checked={
                        data
                          ? selectedRows.size === data.length && data.length > 0
                          : false
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className=" accent-yellow-500 bg-[#16191d] border-gray-600 w-4 h-4 cursor-pointer"
                    />
                    {bulkActionPlacement === "column" && (
                      <>
                        <button
                          onClick={toggleMenu}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded bg-transparent"
                          aria-label="More options"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        {menuOpen && (
                          <div
                            ref={menuRef}
                            className="absolute left-0 mt-8 w-40 bg-[#222222] border border-gray-200 dark:border-gray-600 rounded shadow-lg z-10"
                          >
                            <button
                              onClick={handleDeleteSelected}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 bg-black text-white"
                            >
                              Delete selected
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </th>
              )}
              {columns.render}
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              data &&
              data.length > 0 &&
              data.map((dataItem, rowIndex) => (
                <tr className="border-b dark:border-gray-700">
                  {bulkAction && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={(e) =>
                          handleRowSelect(rowIndex, e.target.checked)
                        }
                        className=" accent-yellow-500 bg-[#16191d] border-gray-600 w-4 h-4 cursor-pointer"
                      />
                    </td>
                  )}
                  {Object.values(dataItem).map((item, index) => (
                    <>
                      {index === 0 ? (
                        <td
                          scope="row"
                          className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white"
                        >
                          {item}
                        </td>
                      ) : (
                        <td className="px-4 py-3">{item}</td>
                      )}
                    </>
                  ))}
                </tr>
              ))}
            {loading && (
              <tr>
                <td colSpan={columns?.length + 2} className="text-center p-5">
                  <LoadingSpinner width={70} height={70} />
                </td>
              </tr>
            )}
            {!loading &&
              ((error && error.message !== "") || data?.length === 0) && (
                <tr>
                  <td colSpan={columns?.length + 2} className="text-center p-5">
                    {error?.message ?? "No Records Found"}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
      <TablePagination
        properties={pagination}
        loading={loading}
        setSearchParams={setSearchParams}
        hasNextPage={hasNextPage}
        searchParams={searchParams}
      />
    </div>
  );
};

export default DataTable;
