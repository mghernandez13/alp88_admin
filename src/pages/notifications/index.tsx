import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import DataTable from "../../components/generic/table";
import Headline from "../../components/generic/Headline";
import { UserAuth } from "../../components/context/AuthContext";
import { GET_NOTIFICATIONS } from "../../graphql/queries/notifications";
import type {
  NotificationsQueryData,
  NotificationsQueryVariables,
} from "../../types/api";
import type { SortDirection } from "../../types/constants";
import AdminTemplate from "../../templates/AdminTemplate";

const NotificationsPage: React.FC = () => {
  const { session } = UserAuth();
  const receiverId = session?.user?.id;

  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const searchQuery = searchParams.get("search") || "";
  const [pageSize, setPageSize] = useState<number>(10);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const offset = (currentPage - 1) * pageSize;

  const [sortConfig, setSortConfig] = useState<{
    column: string;
    direction: SortDirection;
  }>({
    column: "created_at",
    direction: "DescNullsLast",
  });

  const [sortVariable, setSortVariable] = useState<Record<string, string>[]>([
    { created_at: "DescNullsLast" },
  ]);

  const searchTerm = useMemo(() => {
    return searchQuery ? `%${searchQuery}%` : "%";
  }, [searchQuery]);

  const { data, loading, error } = useQuery<
    NotificationsQueryData,
    NotificationsQueryVariables
  >(GET_NOTIFICATIONS, {
    variables: {
      first: pageSize,
      offset,
      searchTerm,
      receiverId,
      sortOrder: sortVariable,
      startDate: dateRange.start
        ? `${dateRange.start}T00:00:00.000`
        : undefined,
      endDate: dateRange.end ? `${dateRange.end}T23:59:59.999` : undefined,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
    skip: !receiverId,
  });

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

  const columns = useMemo(() => {
    return {
      length: 6,
      render: (
        <>
          <th
            scope="col"
            onClick={() => handleSort("id")}
            className="relative px-4 py-3 cursor-pointer"
          >
            <span className="mr-2">ID</span>
            {sortConfig.column === "id" ? (
              sortConfig.direction === "AscNullsFirst" ? (
                <ChevronUp className="absolute right-2 top-3 w-4 h-4" />
              ) : (
                <ChevronDown className="absolute right-2 top-3 w-4 h-4" />
              )
            ) : (
              <ChevronsUpDown className="absolute right-2 top-3 w-4 h-4" />
            )}
          </th>
          <th
            scope="col"
            onClick={() => handleSort("sender")}
            className="relative flex px-4 py-3 cursor-pointer"
          >
            <span className="mr-2">Sender</span>
            {sortConfig.column === "sender" ? (
              sortConfig.direction === "AscNullsFirst" ? (
                <ChevronUp className="absolute right-2 w-4 h-4" />
              ) : (
                <ChevronDown className="absolute right-2 w-4 h-4" />
              )
            ) : (
              <ChevronsUpDown className="absolute right-2 w-4 h-4" />
            )}
          </th>
          <th scope="col" className="px-4 py-3">
            Title
          </th>
          <th scope="col" className="px-4 py-3">
            Content
          </th>
          <th
            scope="col"
            onClick={() => handleSort("unread")}
            className="relative px-4 py-3 cursor-pointer"
          >
            <span className="mr-2">Unread</span>
            {sortConfig.column === "unread" ? (
              sortConfig.direction === "AscNullsFirst" ? (
                <ChevronUp className="absolute right-2 top-3 w-4 h-4" />
              ) : (
                <ChevronDown className="absolute right-2 top-3 w-4 h-4" />
              )
            ) : (
              <ChevronsUpDown className="absolute right-2 top-3 w-4 h-4" />
            )}
          </th>
          <th
            scope="col"
            onClick={() => handleSort("created_at")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Created At
            {sortConfig.column === "created_at" ? (
              sortConfig.direction === "AscNullsFirst" ? (
                <ChevronUp className="absolute right-2 top-3 w-4 h-4" />
              ) : (
                <ChevronDown className="absolute right-2 top-3 w-4 h-4" />
              )
            ) : (
              <ChevronsUpDown className="absolute right-2 top-3 w-4 h-4" />
            )}
          </th>
        </>
      ),
    };
  }, [handleSort, sortConfig.column, sortConfig.direction]);

  const tableData = useMemo(() => {
    return (
      data?.notificationsCollection?.edges?.map(({ node }) => ({
        id: node.id,
        sender: node.sender,
        title: node.title,
        content: node.content,
        unread: node.unread ? "Yes" : "No",
        created_at: node.created_at,
      })) ?? []
    );
  }, [data?.notificationsCollection?.edges]);

  useEffect(() => {
    setSortVariable([{ [sortConfig.column]: sortConfig.direction }]);
  }, [sortConfig]);

  const totalCount = data?.notificationsCollection?.totalCount ?? 0;

  const tableFilter = {
    dateRange: {
      label: "Date Filter",
      selectedFilter: [],
      setSelectedFilter: () => {},
      data: [
        {
          name: "Date Filter",
          value: "date-filter",
          count: 0,
          start: dateRange.start,
          end: dateRange.end,
          setDateRange,
        },
      ],
    },
  };

  return (
    <AdminTemplate>
      <div className="w-full px-4 sm:mx-2 md:mx-10 py-6">
        <div className="flex items-center justify-between mb-8">
          <Headline>Notifications</Headline>
        </div>

        <DataTable
          loading={loading}
          error={error}
          tableName="Notifications"
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
            data?.notificationsCollection?.pageInfo?.hasNextPage ?? false
          }
          pageSize={pageSize}
          setPageSize={setPageSize}
          bulkAction={false}
          onDeleteSelected={() => {}}
          tableFilter={tableFilter}
        />
      </div>
    </AdminTemplate>
  );
};

export default NotificationsPage;
