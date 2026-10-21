import React from "react";
import Label from "../../../components/generic/Label";
import Input from "../../../components/generic/Input";

export interface RoleFormData {
  name: string;
  permissions: string[];
}

interface RoleFormProps {
  formData: RoleFormData;
  adminPermissionsList: string[];
  userPermissionsList: string[];
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  onCancel: () => void;
}

const RoleForm: React.FC<RoleFormProps> = ({
  formData,
  adminPermissionsList,
  userPermissionsList,
  onChange,
  onSubmit,
  loading,
  onCancel,
}) => {
  // Helper functions for check all
  const getColumnPerms = (type: string) => {
    if (type === "view") {
      return adminPermissionsList.filter(
        (p) =>
          p.toLowerCase().includes("view") || p.toLowerCase().includes("login"),
      );
    }
    return adminPermissionsList.filter((p) => p.toLowerCase().includes(type));
  };

  const isAllChecked = (type: string) => {
    const perms = getColumnPerms(type);
    return perms.every((perm) => formData.permissions.includes(perm));
  };

  const handleCheckAll = (type: string) => {
    const perms = getColumnPerms(type);
    const allChecked = isAllChecked(type);
    let newPerms: string[];
    if (allChecked) {
      newPerms = formData.permissions.filter((perm) => !perms.includes(perm));
    } else {
      newPerms = Array.from(new Set([...formData.permissions, ...perms]));
    }
    // Simulate event for parent handler
    const event = {
      target: {
        name: "permissions",
        value: newPerms,
      },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(event);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white dark:bg-black p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xl"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <Label>Name</Label>
          <Input
            name="name"
            type="text"
            value={formData.name}
            onChange={onChange}
            placeholder="Role Name"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Admin Permissions</Label>
          <div className="grid grid-cols-4 gap-6 mb-6">
            {/* View Column */}
            <div>
              <span className="text-yellow-400 font-semibold mb-2 block">
                View
              </span>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={isAllChecked("view")}
                  onChange={() => handleCheckAll("view")}
                  className="accent-yellow-500"
                />
                <span className="text-gray-900 dark:text-white">
                  Select All
                </span>
              </label>
              {getColumnPerms("view").map((perm) => (
                <label key={perm} className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    name="permissions"
                    value={perm}
                    checked={formData.permissions.includes(perm)}
                    onChange={onChange}
                    className="accent-yellow-500"
                  />
                  <span className="text-gray-900 dark:text-white">{perm}</span>
                </label>
              ))}
            </div>
            {/* Add Column */}
            <div>
              <span className="text-yellow-400 font-semibold mb-2 block">
                Add
              </span>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={isAllChecked("add")}
                  onChange={() => handleCheckAll("add")}
                  className="accent-yellow-500"
                />
                <span className="text-gray-900 dark:text-white">
                  Select All
                </span>
              </label>
              {getColumnPerms("add").map((perm) => (
                <label key={perm} className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    name="permissions"
                    value={perm}
                    checked={formData.permissions.includes(perm)}
                    onChange={onChange}
                    className="accent-yellow-500"
                  />
                  <span className="text-gray-900 dark:text-white">{perm}</span>
                </label>
              ))}
            </div>
            {/* Edit Column */}
            <div>
              <span className="text-yellow-400 font-semibold mb-2 block">
                Edit
              </span>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={isAllChecked("edit")}
                  onChange={() => handleCheckAll("edit")}
                  className="accent-yellow-500"
                />
                <span className="text-gray-900 dark:text-white">
                  Select All
                </span>
              </label>
              {getColumnPerms("edit").map((perm) => (
                <label key={perm} className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    name="permissions"
                    value={perm}
                    checked={formData.permissions.includes(perm)}
                    onChange={onChange}
                    className="accent-yellow-500"
                  />
                  <span className="text-gray-900 dark:text-white">{perm}</span>
                </label>
              ))}
            </div>
            <div>
              <span className="text-yellow-400 font-semibold mb-2 block">
                Delete
              </span>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={isAllChecked("delete")}
                  onChange={() => handleCheckAll("delete")}
                  className="accent-yellow-500"
                />
                <span className="text-gray-900 dark:text-white text-xs">
                  Check All
                </span>
              </label>
              {getColumnPerms("delete").map((perm) => (
                <label key={perm} className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    name="permissions"
                    value={perm}
                    checked={formData.permissions.includes(perm)}
                    onChange={onChange}
                    className="accent-yellow-500"
                  />
                  <span className="text-gray-900 dark:text-white">{perm}</span>
                </label>
              ))}
            </div>
          </div>
          <Label>User Permissions</Label>
          <div className="grid grid-cols-4 gap-6">
            {userPermissionsList.map((perm) => (
              <label key={perm} className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  name="permissions"
                  value={perm}
                  checked={formData.permissions.includes(perm)}
                  onChange={onChange}
                  className="accent-yellow-500"
                />
                <span className="text-gray-900 dark:text-white">{perm}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="mt-8 flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold py-3 px-6 rounded-md transition-all shadow-md active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-10 rounded-md transition-all shadow-md active:scale-95"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default RoleForm;
