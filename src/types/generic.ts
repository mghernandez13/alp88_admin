import type { ErrorLike } from "@apollo/client";
import type { JSX } from "react";
import type { SetURLSearchParams } from "react-router-dom";

export type Props = {
  className?: string;
};

export type TableFilterData = {
  name: string;
  count: number;
  value: string;
};

export interface TableFilter {
  [key: string]: {
    label: string;
    selectedFilter: string[];
    setSelectedFilter: React.Dispatch<React.SetStateAction<string[]>>;
    data: TableFilterData[];
  };
}

export interface TablePagination {
  currentPage: number;
  pageSize: number;
  totalCount: number;
}

export interface TableColumnsProps {
  name: string;
  field: string;
  withSort: boolean;
  handleSort?: (columnName: string) => void;
}
export interface TableRecordProps {
  loading: boolean;
  error: ErrorLike | undefined;
  tableName: string;
  columns: {
    length: number;
    render: React.ReactNode;
  };

  data: Record<string, string | JSX.Element | undefined | number | boolean>[];
  tableFilter?: TableFilter;
  pagination: TablePagination;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  hasNextPage: boolean;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  bulkAction?: boolean;
  /**
   * Where the bulk-delete trigger is rendered: "column" (default) keeps the
   * existing chevron menu inside the checkbox column header; "toolbar"
   * renders a dropdown in the TableHeader toolbar instead, visible only
   * once rows are selected.
   */
  bulkActionPlacement?: "column" | "toolbar";

  /**
   * Called when the user chooses "Delete selected" from the header menu.
   * The table component itself just manages which rows are selected; the
   * parent can perform whatever action it needs on those indexes.
   */
  onDeleteSelected?: (
    selectedIndexes: number[],
    resetSelectedRows: () => void,
  ) => void;
}

export interface TablePaginationProps {
  loading: boolean;
  properties: TablePagination;
  setSearchParams: SetURLSearchParams;
  hasNextPage: boolean;
  searchParams: URLSearchParams;
}

export interface TableHeaderProps {
  tableName: string;
  tableFilter?: TableFilter;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  /** optional list of page size options to show in dropdown */
  pageSizeOptions?: number[];
  /** number of currently selected table rows, used to show the toolbar bulk-delete dropdown */
  selectedCount?: number;
  /** invoked when the toolbar "Delete selected" menu item is clicked */
  onDeleteSelectedClick?: () => void;
  bulkActionPlacement?: "column" | "toolbar";
}

export interface UserRoleCountQuery {
  admin: {
    totalCount: number;
  };
  main_agent: {
    totalCount: number;
  };
  agent: {
    totalCount: number;
  };
}

export interface AgentFormDataProps {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  permissionId: string | null;
  avatarUrl: string;
  isQuotaBased: boolean;
  remittancePercent: number | null;
  isActive: boolean;
  upline?: string | null;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface SelectOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

export interface SearchableSelectOption {
  id: string;
  value?: string;
  label: string;
  level: number;
}

export interface DashboardCardProps {
  startDate: string;
  endDate: string;
}

export interface SummaryProps {
  selectedDate: string;
  onReload?: () => void;
}

export interface BetsSummaryProps extends SummaryProps {
  gameType?: string;
}

export type AgentHierarchyRow = {
  id: string;
  full_name: string;
  email: string;
  upline: string | null;
};

export type AgentOption = {
  id: string;
  value: string;
  label: string;
  level?: number;
};
