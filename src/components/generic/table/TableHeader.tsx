import { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import type { TableHeaderProps } from "../../../types/generic";
import DateFilterDropdown from "./DateFilterDropdown";
import { ChevronDown, Clock3 } from "lucide-react";

const TableHeader: React.FC<TableHeaderProps> = (props) => {
  const {
    tableFilter,
    searchParams,
    setSearchParams,
    pageSize,
    setPageSize,
    pageSizeOptions = [5, 10, 20, 50, 100, 500, 1000],
    selectedCount = 0,
    onDeleteSelectedClick,
    bulkActionPlacement = "column",
  } = props;
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const deleteMenuRef = useRef<HTMLDivElement | null>(null);
  const searchQuery = searchParams.get("search") || "";
  const [inputValue, setInputValue] = useState(searchQuery);
  // Track which filter dropdown is open (by label)
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const filterMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [searchChange, setSearchChange] = useState(false);

  // Open/close a specific filter dropdown
  const toggleShowFilter = useCallback((label: string) => {
    setOpenFilter((prev) => {
      if (prev === label) {
        setDropdownPosition(null);
        return null;
      }
      // Calculate position for portal dropdown
      const btn = document.getElementById(`filterDropdownButton-${label}`);
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
      }
      return label;
    });
  }, []);

  const handleClickFilterMenu = useCallback(
    (event: MouseEvent | globalThis.MouseEvent) => {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target as Node) &&
        filterMenuButtonRef.current &&
        !filterMenuButtonRef.current.contains(event.target as Node)
      ) {
        setOpenFilter(null);
      }
    },
    [],
  );

  // const handleCheckboxChange = (role: string) => {
  //   tableFilter?.setSelectedFilter((prev) => {
  //     const newFilter = prev.includes(role)
  //       ? prev.filter((r) => r !== role)
  //       : [...prev, role];
  //     // Remove page and search params when changing role filter
  //     setSearchParams({});
  //     return newFilter;
  //   });
  // };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickFilterMenu);

    return () => {
      document.removeEventListener("mousedown", handleClickFilterMenu);
    };
  }, [handleClickFilterMenu]);

  useEffect(() => {
    const handleClickOutsideDeleteMenu = (event: MouseEvent) => {
      if (
        deleteMenuRef.current &&
        !deleteMenuRef.current.contains(event.target as Node)
      ) {
        setDeleteMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideDeleteMenu);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideDeleteMenu);
    };
  }, []);

  // hide the toolbar dropdown again once the selection is cleared
  useEffect(() => {
    if (selectedCount === 0) setDeleteMenuOpen(false);
  }, [selectedCount]);

  // Debounce: Update URL after 500ms of no typing
  useEffect(() => {
    if (searchChange) {
      const timeoutId = setTimeout(() => {
        setSearchParams({
          search: inputValue,
          page: "1",
        });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  return (
    <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4">
      <div className="w-full md:w-1/2">
        <div className="flex items-center gap-3">
          <label className="sr-only">Page size</label>
          <select
            value={String(pageSize)}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setPageSize(newSize);
              setSearchParams({ search: inputValue, page: "1" });
            }}
            className="bg-[#222222] border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 py-2 px-1 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          >
            {pageSizeOptions.map((opt) => {
              return (
                <option key={opt} value={String(opt)}>
                  {opt} / page
                </option>
              );
            })}
          </select>
          <label className="sr-only">Search</label>
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-gray-500 dark:text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill-rule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              value={inputValue}
              onChange={(e) => {
                setSearchChange(true);
                setInputValue(e.target.value);
              }}
              className="bg-[#222222] border border-gray-300 text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2 dark:border-gray-600 dark:focus:ring-primary-500 dark:focus:border-primary-500"
              placeholder="Search"
              required
            />
          </div>
        </div>
      </div>
      <div className="w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 items-stretch md:items-center justify-end md:space-x-3 flex-shrink-0">
        {/* Create button removed as requested */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          {bulkActionPlacement === "toolbar" && selectedCount > 0 && (
            <div className="relative" ref={deleteMenuRef}>
              <button
                onClick={() => setDeleteMenuOpen((o) => !o)}
                className={`w-full md:w-auto flex items-center justify-center py-2 px-4 text-sm font-medium text-gray-900 focus:outline-none bg-[#222222] rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-primary-700 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 ${deleteMenuOpen ? "ring-2 ring-primary-500" : ""}`}
                type="button"
              >
                {`Actions (${selectedCount})`}
                <ChevronDown className="-mr-1 ml-1.5 w-5 h-5" />
              </button>
              {deleteMenuOpen && (
                <div className="absolute left-0 mt-2 w-40 bg-[#222222] border border-gray-200 dark:border-gray-600 rounded shadow-lg z-10">
                  <button
                    onClick={() => {
                      setDeleteMenuOpen(false);
                      onDeleteSelectedClick?.();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 bg-black text-white"
                  >
                    Delete selected
                  </button>
                </div>
              )}
            </div>
          )}
          {tableFilter && (
            <>
              {Object.values(tableFilter).map((filter) => (
                <div key={filter.label} className="relative">
                  <button
                    id={`filterDropdownButton-${filter.label}`}
                    data-dropdown-toggle={`filterDropdown-${filter.label}`}
                    onClick={() => toggleShowFilter(filter.label)}
                    ref={filterMenuButtonRef}
                    className={`w-full md:w-auto flex items-center justify-center py-2 px-4 text-sm font-medium text-gray-900 focus:outline-none bg-[#222222] rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-primary-700 focus:z-10 focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 ${openFilter === filter.label ? "ring-2 ring-primary-500" : ""}`}
                    type="button"
                  >
                    {filter.label === "Date Filter" ? (
                      <Clock3 className="h-5 w-5 mr-2 text-gray-400" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        className="h-4 w-4 mr-2 text-gray-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    {filter.label}

                    <svg
                      className="-mr-1 ml-1.5 w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        clipRule="evenodd"
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      />
                    </svg>
                  </button>
                  {openFilter === filter.label &&
                    dropdownPosition &&
                    ReactDOM.createPortal(
                      <div
                        ref={filterMenuRef}
                        id={`filterDropdown-${filter.label}`}
                        style={{
                          position: "absolute",
                          top: dropdownPosition.top,
                          left: dropdownPosition.left,
                          zIndex: 9999,
                          width: "16rem",
                          minWidth: "12rem",
                          maxWidth: "90vw",
                        }}
                        className="p-3 bg-[#222910] rounded-lg shadow"
                      >
                        <h6 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                          Choose {filter.label}
                        </h6>
                        <ul
                          className="space-y-2 text-sm"
                          aria-labelledby={`filterDropdownButton-${filter.label}`}
                        >
                          {filter.label === "Date Filter" ? (
                            <DateFilterDropdown
                              filter={filter}
                              setOpenFilter={setOpenFilter}
                            />
                          ) : (
                            filter.data.map((item) => (
                              <li
                                className="flex items-center"
                                key={item.value}
                              >
                                <input
                                  id={item.value}
                                  type="checkbox"
                                  value={item.value}
                                  checked={filter.selectedFilter.includes(
                                    item.value,
                                  )}
                                  className="w-4 h-4 accent-yellow-500 bg-[#16191d] border-gray-600 rounded cursor-pointer"
                                  onChange={() =>
                                    filter.setSelectedFilter((prev) =>
                                      prev.includes(item.value)
                                        ? prev.filter((v) => v !== item.value)
                                        : [...prev, item.value],
                                    )
                                  }
                                />
                                <label className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {item.name}
                                  {/* ({item.count}) */}
                                </label>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>,
                      document.body,
                    )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableHeader;
