import Headline from "../../components/generic/Headline";
import AdminTemplate from "../../templates/AdminTemplate";
import DataTable from "../../components/generic/table";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  GET_ROLE_COUNTS,
  GET_USERS,
  UPDATE_USER,
  BULK_UPDATE_USER_STATUS,
} from "../../graphql/queries/user";
import type {
  RolesQueryData,
  UsersQueryData,
  UsersQueryVariables,
} from "../../types/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GET_ROLES } from "../../graphql/queries/roles";
import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Eye,
  SquarePen,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import ViewAgentModal from "../../components/modals/agent/ViewAgentModal";
import { SUPER_ADMIN_EMAIL, type SortDirection } from "../../types/constants";
import { useCheckUserPermissions } from "../../hooks/useCheckUserPermission";
import PrimaryButton from "../../components/generic/buttons/Primary";
import IconTableActionButton from "../../components/generic/buttons/IconTableActionButton";

const AgentsPage: React.FC = () => {
  useCheckUserPermissions("View Agents");

  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;
  const searchQuery = searchParams.get("search") || "";
  const navigate = useNavigate();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string[]>([]);
  const [showViewAgentModal, setShowViewAgentModal] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
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

  const [pageSize, setPageSize] = useState<number>(5);
  const offset = (currentPage - 1) * pageSize;

  const {
    data,
    loading,
    error,
    refetch: refetchUsers,
  } = useQuery<UsersQueryData, UsersQueryVariables>(GET_USERS, {
    variables: {
      first: pageSize,
      offset,
      searchTerm: searchQuery ? `%${searchQuery}%` : "%",
      ...(selectedRoleFilter.length !== 0 && {
        roleFilter: selectedRoleFilter,
      }),
      sortOrder: sortVariable,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  const [updateUser, { loading: updateUserLoading }] = useMutation(UPDATE_USER);

  const [bulkUpdateStatus, { loading: bulkUpdateLoading }] = useMutation(
    BULK_UPDATE_USER_STATUS,
    {
      refetchQueries: [
        {
          query: GET_USERS,
          variables: {
            first: pageSize,
            offset,
            searchTerm: searchQuery ? `%${searchQuery}%` : "%",
            ...(selectedRoleFilter.length !== 0 && {
              roleFilter: selectedRoleFilter,
            }),
            sortOrder: sortVariable,
          },
        },
        {
          query: GET_ROLE_COUNTS,
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

  useEffect(() => {
    // Prepare the variable for the GraphQL query
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSortVariable([{ [sortConfig.column]: sortConfig.direction }]);
  }, [sortConfig]);

  const handleDelete = useCallback(
    (id: string) => {
      Swal.fire({
        icon: "warning",
        title: `Delete Agent`,
        text: `Are you sure you want delete?`,
        showCancelButton: true,
        reverseButtons: true,
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await updateUser({
              variables: {
                id,
                isArchive: true,
              },
            });
            await refetchUsers();
            Swal.fire({
              icon: "success",
              title: "Delete Agent",
              text: `Agent successfully deleted!`,
            });
          } catch (e) {
            Swal.fire({
              icon: "error",
              title: "Delete Agent",
              text: `Error occurred while trying to deleting Agent: ${e}`,
            });
          }
        }
      });
    },
    [refetchUsers, updateUser],
  );

  const toggleViewAgentModal = useCallback(
    (userId: string) => {
      setSelectedUserId(userId);
      setShowViewAgentModal(!showViewAgentModal);
    },
    [showViewAgentModal],
  );

  const columns = useMemo(() => {
    return {
      length: 7,
      render: (
        <>
          <th
            scope="col"
            onClick={() => handleSort("full_name")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Name
            {sortConfig.column === "full_name" ? (
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
            onClick={() => handleSort("email")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Email
            {sortConfig.column === "email" ? (
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
            Remit %
          </th>
          <th scope="col" className="px-4 py-3">
            Income %
          </th>
          {/* <th scope="col" className="px-4 py-3">
            Is Quota Based
          </th> */}
          <th scope="col" className="px-4 py-3">
            Role
          </th>
        </>
      ),
    };
  }, [handleSort, sortConfig.column, sortConfig.direction]);

  // Fetch all roles for mapping permissionId to role name
  const { data: rolesData } = useQuery<RolesQueryData>(GET_ROLES, {
    fetchPolicy: "network-only",
  });

  // Build a map of permissionId to role name
  const permissionIdToRoleName = useMemo(() => {
    const map: Record<string, string> = {};
    rolesData?.permissionsCollection?.edges.forEach(({ node }) => {
      map[node.id] = node.name;
    });
    return map;
  }, [rolesData]);

  const computeIncomePercent = (remitPercent: number | null): number | null => {
    // Assuming the income percent is calculated as 100 - remittance percent
    if (remitPercent === null || remitPercent === undefined) {
      return null;
    }
    return 100 - remitPercent;
  };

  const tableData = useMemo(() => {
    return (
      data?.profilesCollection?.edges?.map((item) => {
        return {
          name: `${item?.node?.first_name} ${item?.node?.last_name}`,
          email: item?.node?.email,
          remitPercent: item?.node?.remittance_percent ?? "-",
          incomePercent:
            computeIncomePercent(item?.node?.remittance_percent) ?? "-",
          // quotaBased: item.node.is_quota_based ? "yes" : "-",
          role: permissionIdToRoleName[item.node.permission_id ?? ""] || "-",
          action: (
            <td className="flex gap-2 px-4 py-3 items-center justify-end">
              <div className="relative flex flex-col items-center group">
                <IconTableActionButton
                  id="apple-imac-27-dropdown-button"
                  data-tooltip-target="tooltip-default"
                  onClick={() => toggleViewAgentModal(item.node.id)}
                  type="button"
                >
                  <Eye className="w-5 h-5" />
                </IconTableActionButton>

                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center">
                  <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-gray-900 shadow-lg rounded-md">
                    View
                  </span>
                  <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-900"></div>
                </div>
              </div>
              {item.node.email !== SUPER_ADMIN_EMAIL && (
                <>
                  <div className="relative flex flex-col items-center group">
                    <IconTableActionButton
                      onClick={() => navigate(`/agents/update/${item.node.id}`)}
                      type="button"
                    >
                      <SquarePen className="w-5 h-5" />
                    </IconTableActionButton>

                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center">
                      <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-gray-900 shadow-lg rounded-md">
                        Edit
                      </span>
                      <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-900"></div>
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
                      <span className="relative z-10 p-2 text-xs leading-none text-white whitespace-no-wrap bg-gray-900 shadow-lg rounded-md">
                        Delete
                      </span>
                      <div className="w-3 h-3 -mt-2 rotate-45 bg-gray-900"></div>
                    </div>
                  </div>
                </>
              )}
            </td>
          ),
        };
      }) ?? []
    );
  }, [
    data,
    handleDelete,
    navigate,
    permissionIdToRoleName,
    toggleViewAgentModal,
  ]);

  const totalCount = data?.profilesCollection.totalCount ?? 0;
  const hasNextPage = Boolean(data?.profilesCollection?.pageInfo?.hasNextPage);

  // Build filter options based on permissions
  const permissionRoleFilterOptions = useMemo(() => {
    return (
      rolesData?.permissionsCollection?.edges.map(({ node }) => ({
        name: node.name,
        count: node.users?.totalCount ?? 0,
        value: node.id,
      })) ?? []
    );
  }, [rolesData]);

  const tableFilter = {
    role: {
      label: "Role",
      selectedFilter: selectedRoleFilter,
      setSelectedFilter: setSelectedRoleFilter,
      data: permissionRoleFilterOptions,
    },
  };

  const handleOnDeleteSelected = useCallback(
    (selectedIndexes: number[], resetSelectedRows: () => void) => {
      const selectedIds = selectedIndexes
        .map((index) => {
          const user = data?.profilesCollection?.edges?.[index]?.node;
          return user?.id;
        })
        .filter(Boolean) as string[];

      if (selectedIds.length === 0) return;

      Swal.fire({
        icon: "warning",
        title: "Delete Selected Agents",
        text: `Are you sure you want to delete ${selectedIds.length} agent(s)?`,
        showCancelButton: true,
        reverseButtons: true,
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await bulkUpdateStatus({
              variables: {
                userIds: selectedIds,
                isArchive: true,
              },
            });
            Swal.fire({
              icon: "success",
              title: "Delete Agents",
              text: `${selectedIds.length} agent(s) successfully deleted!`,
            });
            resetSelectedRows();
          } catch (e) {
            Swal.fire({
              icon: "error",
              title: "Delete Agents",
              text: `Error occurred while trying to delete agents: ${e}`,
            });
          }
        }
      });
    },
    [data?.profilesCollection?.edges, bulkUpdateStatus],
  );

  return (
    <AdminTemplate>
      <div className="flex-col w-full sm:mx-2 py-2 md:mx-10">
        <div className="flex items-center justify-between mb-8">
          <Headline>Agents</Headline>
          <PrimaryButton onClick={() => navigate("./create")}>
            Create Agent
          </PrimaryButton>
        </div>
        <DataTable
          loading={loading || updateUserLoading || bulkUpdateLoading}
          error={error}
          tableName="Agent"
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
          tableFilter={tableFilter}
          pageSize={pageSize}
          setPageSize={setPageSize}
          onDeleteSelected={handleOnDeleteSelected}
        />
        <ViewAgentModal
          isOpen={showViewAgentModal}
          userId={selectedUserId}
          onClose={() => setShowViewAgentModal(!showViewAgentModal)}
        />
      </div>
    </AdminTemplate>
  );
};

export default AgentsPage;
