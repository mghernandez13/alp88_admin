import Headline from "../../../components/generic/Headline";
import AdminTemplate from "../../../templates/AdminTemplate";
import DataTable from "../../../components/generic/table";
import { useQuery } from "@apollo/client/react";
import { GET_ROLES } from "../../../graphql/queries/roles";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCallback, useMemo, useState } from "react";
import {
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  Eye,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useMutation } from "@apollo/client/react";
import Swal from "sweetalert2";
import { DELETE_ROLE } from "../../../graphql/queries/roles";
import type { SortDirection } from "../../../types/constants";
import type { RolesQueryData, RolesQueryVariables } from "../../../types/api";
import { ADMIN_PERMISSIONS, USER_PERMISSIONS } from "../../../types/constants";
import ViewRoleModal from "./ViewRoleModal";
import PermissionDot from "./dots";
import PrimaryButton from "../../../components/generic/buttons/Primary";
import { useCheckUserPermissions } from "../../../hooks/useCheckUserPermission";
import IconTableActionButton from "../../../components/generic/buttons/IconTableActionButton";

const RolesPage: React.FC = () => {
  useCheckUserPermissions("View Roles");

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<{
    name: string;
    permissions: string[];
  } | null>(null);
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

  const sortVariableMemo = useMemo(() => {
    return [{ [sortConfig.column]: sortConfig.direction }];
  }, [sortConfig.column, sortConfig.direction]);

  const [pageSize, setPageSize] = useState<number>(5);
  const offset = (currentPage - 1) * pageSize;

  // build search term for query
  const searchTerm = useMemo(() => {
    return searchQuery ? `%${searchQuery}%` : "%";
  }, [searchQuery]);

  const [deleteRole] = useMutation(DELETE_ROLE, {
    refetchQueries: ["GetPermissions"],
    awaitRefetchQueries: true,
  });

  const { data, loading, error } = useQuery<
    RolesQueryData,
    RolesQueryVariables
  >(GET_ROLES, {
    variables: {
      first: pageSize,
      offset,
      searchTerm,
      sortOrder: sortVariableMemo,
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  const handleDelete = useCallback(
    async (roleId: string) => {
      const result = await Swal.fire({
        title: "Delete Role?",
        text: "Are you sure you want to delete this role?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete",
      });
      if (result.isConfirmed) {
        try {
          await deleteRole({ variables: { id: roleId } });
          Swal.fire("Deleted!", "Role has been deleted.", "success");
        } catch {
          Swal.fire("Error", "Failed to delete role.", "error");
        }
      }
    },
    [deleteRole],
  );

  const handleBulkDelete = useCallback(
    async (selectedIndexes: number[], resetSelectedRows: () => void) => {
      const selectedIds = selectedIndexes
        .map((index) => {
          const role = data?.permissionsCollection?.edges?.[index]?.node;
          return role?.id;
        })
        .filter(Boolean);
      if (selectedIds.length === 0) return;
      const result = await Swal.fire({
        icon: "warning",
        title: "Delete Selected Roles",
        text: `Are you sure you want to delete ${selectedIds.length} role(s)?`,
        showCancelButton: true,
        reverseButtons: true,
      });
      if (result.isConfirmed) {
        try {
          await Promise.all(
            selectedIds.map((id) => deleteRole({ variables: { id } })),
          );
          Swal.fire({
            icon: "success",
            title: "Delete Roles",
            text: `Roles successfully deleted!`,
          });
          resetSelectedRows();
        } catch (e) {
          Swal.fire({
            icon: "error",
            title: "Delete Roles",
            text: `Error occurred while deleting: ${e}`,
          });
        }
      }
    },
    [deleteRole, data],
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

  const columns = useMemo(() => {
    return {
      length: 5,
      render: (
        <>
          <th
            scope="col"
            onClick={() => handleSort("name")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Name
            {sortConfig.column === "name" ? (
              sortConfig.direction === "AscNullsFirst" ? (
                <ChevronUp className="absolute right-2 top-4 w-4 h-4" />
              ) : (
                <ChevronDown className="absolute right-2 top-4 w-4 h-4" />
              )
            ) : (
              <ChevronsUpDown className="absolute right-2 top-4 w-4 h-4" />
            )}
          </th>
          <th scope="col" className="px-4 py-3">
            Permissions
          </th>
          <th
            scope="col"
            onClick={() => handleSort("users")}
            className="relative px-4 py-3 cursor-pointer"
          >
            Users
          </th>
          <th scope="col" className="px-4 py-3"></th>
        </>
      ),
    };
  }, [sortConfig.column, sortConfig.direction, handleSort]);

  const tableData = useMemo(() => {
    return (
      data?.permissionsCollection?.edges
        ?.map((item) => {
          if (!item.node) return null;
          const rolePerms = item.node.permissions || [];
          return {
            name: item.node.name,
            permissions: (
              <div>
                <div className="mb-2">
                  <span className="font-semibold text-yellow-400 text-xs mr-2">
                    Admin Permissions:
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ADMIN_PERMISSIONS.map((perm) => (
                      <PermissionDot
                        key={perm}
                        isAdmin={rolePerms.includes(perm)}
                        perm={perm}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-blue-400 text-xs mr-2">
                    User Permissions:
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {USER_PERMISSIONS.map((perm) => (
                      <PermissionDot
                        key={perm}
                        isAdmin={rolePerms.includes(perm)}
                        perm={perm}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ),
            users: item.node.users?.totalCount ?? 0,
            action: (
              <td className="flex gap-2 px-4 py-3 items-center justify-end">
                <div className="relative flex flex-col items-center group">
                  <IconTableActionButton
                    type="button"
                    onClick={() => {
                      setSelectedRole({
                        name: item.node.name,
                        permissions: rolePerms,
                      });
                      setViewModalOpen(true);
                    }}
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
                    type="button"
                    onClick={() => navigate(`update/${item.node.id}`)}
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
                    onClick={() => handleDelete(item.node.id)}
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
        })
        .filter((item): item is NonNullable<typeof item> => item !== null) ?? []
    );
  }, [data, navigate, handleDelete]);

  const totalCount = data?.permissionsCollection?.totalCount ?? 0;

  return (
    <AdminTemplate>
      <div className="w-full px-4 sm:mx-2 md:mx-10 py-6">
        <div className="flex items-center justify-between mb-8">
          <Headline>Roles</Headline>
          <PrimaryButton onClick={() => navigate("./create")}>
            Create Role
          </PrimaryButton>
        </div>

        <DataTable
          loading={loading}
          error={error}
          tableName="Role"
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
            data?.permissionsCollection?.pageInfo?.hasNextPage ?? false
          }
          pageSize={pageSize}
          setPageSize={setPageSize}
          onDeleteSelected={handleBulkDelete}
        />
        {viewModalOpen && selectedRole && (
          <ViewRoleModal
            open={viewModalOpen}
            onClose={() => setViewModalOpen(false)}
            role={selectedRole}
          />
        )}
      </div>
    </AdminTemplate>
  );
};

export default RolesPage;
