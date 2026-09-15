import { Eye, EyeOff, Loader2, Upload, User } from "lucide-react";
import Input from "../generic/Input";
import Label from "../generic/Label";
import { useCallback, useEffect, useRef, useState } from "react";
import Loading from "../generic/icons/Loading";
import ChangePasswordModal from "../modals/agent/ChangePassword";
import { supabase } from "../../db/supabase";
import type {
  AgentFormDataProps,
  SearchableSelectOption,
} from "../../types/generic";
import SelectWithSearch from "../generic/SelectWithSearch";
import { useQuery } from "@apollo/client/react";
import { GET_ROLES } from "../../graphql/queries/roles";
import type {
  UserTypes,
  RolesQueryData,
  RolesQueryVariables,
} from "../../types/api";

// ...existing code...
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import SecondaryButton from "../generic/buttons/Secondary";
import PrimaryButton from "../generic/buttons/Primary";
import Select from "../generic/Select";
import { SUPER_ADMIN_EMAIL } from "../../types/constants";
interface AgentFormProps {
  action: "add" | "edit";
  formData: AgentFormDataProps;
  setFormData: React.Dispatch<React.SetStateAction<AgentFormDataProps>>;
  loading: boolean;
  handleSubmit: (
    e: React.SubmitEvent,
    createAnother?: boolean,
  ) => Promise<void>;
  handleFormChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}

const AgentForm: React.FC<AgentFormProps> = (props) => {
  // Fetch roles for dropdown
  const { data: rolesData } = useQuery<RolesQueryData, RolesQueryVariables>(
    GET_ROLES,
    {
      variables: { isActive: true },
      fetchPolicy: "network-only",
    },
  );
  const {
    action,
    formData,
    setFormData,
    loading,
    handleSubmit,
    handleFormChange,
  } = props;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [uplineList, setUplineList] = useState<SearchableSelectOption[]>([]);
  const [createAnother, setCreateAnother] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { userId } = useParams();

  // New state for local upload feedback
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validations
    if (file.size > 2 * 1024 * 1024) return alert("Max size 2MB");
    if (!file.type.startsWith("image/")) return alert("Only images allowed");

    setUploading(true);
    try {
      // 2. Cleanup old image if exists
      if (formData.avatarUrl) {
        const oldPath = formData.avatarUrl.split("/").pop();
        if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
      }

      // 3. Upload new file
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `agent-avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 4. Get Public URL and update local form state
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update parent state so the final handleSubmit includes this URL
      setFormData({ ...formData, avatarUrl: data.publicUrl });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Swal.fire({
        icon: "error",
        title: "Avatar Upload Failed",
        text: `Error occurred while uploading avatar: ${errorMessage}`,
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleChangePasswordModal = useCallback(() => {
    setShowChangePasswordModal(!showChangePasswordModal);
  }, [showChangePasswordModal]);

  const openChangePasswordModal = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      e.preventDefault();
      toggleChangePasswordModal();
    },
    [toggleChangePasswordModal],
  );

  // Recursive function to build hierarchy at any depth, starting from all top-level agents
  const formatHierarchy = useCallback(
    (profiles?: UserTypes[]) => {
      if (!profiles) return [];

      const superAdmin = profiles.find((p) => p.email === SUPER_ADMIN_EMAIL);

      const result: Array<{ id: string; label: string; level: number }> = [];

      // Helper to recursively add downlines
      function addWithDownlines(user: UserTypes, level: number) {
        result.push({
          id: String(user.id),
          label: rolesData?.permissionsCollection?.edges.some(
            (role) =>
              role.node.id === user.permission_id &&
              role.node.name.toLowerCase().includes("admin"),
          )
            ? `Site Admin / ${String(user.full_name)}`
            : `${String(user.full_name)} - ${String(user.email)}`,
          level,
        });
        // Always compare as strings for id/upline to ensure correct nesting
        const downlines = profiles?.filter(
          (p) => String(p.upline) === String(user.id),
        );
        downlines?.forEach((downline) => addWithDownlines(downline, level + 1));
      }

      // If super admin exists, treat all agents with upline === null and not superadmin as its direct downlines
      if (superAdmin) {
        addWithDownlines(superAdmin, 0);
        const directDownlines = profiles.filter(
          (p) => p.upline === null && p.email !== SUPER_ADMIN_EMAIL,
        );
        directDownlines.forEach((agent) => addWithDownlines(agent, 1));
      } else {
        // If no super admin, treat all top-level agents as roots
        const topLevelAgents = profiles.filter((p) => p.upline === null);
        topLevelAgents.forEach((agent) => addWithDownlines(agent, 0));
      }

      return result;
    },
    [rolesData],
  );

  const handleCreateAnother = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    setCreateAnother(true);
    formRef.current?.requestSubmit();
  };

  useEffect(() => {
    let cancelled = false;

    const loadUplineList = async () => {
      let query = supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, full_name, email, permission_id, is_quota_based, remittance_percent, upline, status",
        )
        .eq("status", true)
        .eq("is_archive", false)
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.neq("id", userId);
      }

      const { data, error } = await query;

      if (error) {
        if (!cancelled) {
          setUplineList([]);
        }
        return;
      }

      if (!cancelled) {
        setUplineList(formatHierarchy((data ?? []) as UserTypes[]));
      }
    };

    void loadUplineList();

    return () => {
      cancelled = true;
    };
  }, [formatHierarchy, userId]);

  return (
    <form
      ref={formRef}
      onSubmit={(e) => handleSubmit(e, createAnother)}
      className="bg-black p-8 rounded-lg border border-gray-700 shadow-2xl"
    >
      <div className="flex flex-col items-center mb-8 p-4 bg-[#16191d] rounded-lg border border-gray-700">
        <div className="relative w-24 h-24 mb-4">
          {formData.avatarUrl &&
          formData.avatarUrl !== "null" &&
          formData.avatarUrl !== "undefined" ? (
            <img
              src={formData.avatarUrl}
              className="w-full h-full rounded-full object-cover border-2 border-yellow-500"
              alt="Avatar"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-500">
              <User className="text-gray-400 w-10 h-10" />
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
              <Loader2 className="animate-spin text-yellow-500" />
            </div>
          )}
        </div>

        <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white text-xs px-4 py-2 rounded-md transition-colors flex items-center gap-2">
          <Upload size={14} />
          {uploading ? <Loading /> : "Upload Profile Image"}
          <input
            type="file"
            className="hidden"
            onChange={handleAvatarUpload}
            accept="image/*"
            disabled={uploading}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <Label>First Name</Label>
          <Input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleFormChange}
            placeholder="Enter first name"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Last Name</Label>
          <Input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleFormChange}
            placeholder="Enter last name"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Email Address</Label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleFormChange}
            placeholder="agent@alphabet88.com"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Role</Label>
          <Select
            name="permissionId"
            value={formData.permissionId ?? ""}
            onChange={handleFormChange}
            required
          >
            <option value="">Select Role</option>
            {rolesData?.permissionsCollection?.edges.map(({ node }) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Upline</Label>
          <div className="relative">
            <SelectWithSearch
              preSelectedOption={
                uplineList.find((item) => item.id === formData.upline) ?? null
              }
              handleFormChange={(item) =>
                setFormData({ ...formData, upline: item.id })
              }
              name="upline"
              data={uplineList}
              isHirarchical={true}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Remittance Percent</Label>
          <Input
            type="number"
            name="remittancePercent"
            value={formData.remittancePercent ?? ""}
            onChange={handleFormChange}
            placeholder="Enter remittance percent"
            required
          />
        </div>

        <div className="flex flex-col gap-2 relative">
          <Label>Password</Label>
          {action === "edit" ? (
            <a
              href="#"
              onClick={openChangePasswordModal}
              className="pt-2 underline"
            >
              Change Password here
            </a>
          ) : (
            <div className="relative w-full">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleFormChange}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          )}
        </div>

        {action === "add" && (
          <div className="flex flex-col gap-2 relative">
            <Label>Confirm Password</Label>
            <div className="relative w-full">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleFormChange}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* <div className="flex gap-2 mt-2">
          <input
            type="checkbox"
            id="isQuotaBased"
            name="isQuotaBased"
            checked={formData.isQuotaBased}
            onChange={handleFormChange}
            className="w-5 h-5 accent-yellow-500 bg-[#16191d] border-gray-600 rounded cursor-pointer"
          />
          <label
            htmlFor="isQuotaBased"
            className="text-gray-300 font-medium cursor-pointer"
          >
            Is Quota based?
          </label>
        </div> */}

        <div className="flex gap-2 mt-2">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleFormChange}
            className="w-5 h-5 accent-yellow-500 bg-[#16191d] border-gray-600 rounded cursor-pointer"
          />
          <label
            htmlFor="isActive"
            className="text-gray-300 font-medium cursor-pointer"
          >
            Is Active
          </label>
        </div>
      </div>

      <div className="mt-8 flex gap-5 justify-end">
        {action === "add" && (
          <SecondaryButton
            type="button"
            disabled={loading}
            onClick={handleCreateAnother}
          >
            {loading ? <Loading /> : `Create & Add Another`}
          </SecondaryButton>
        )}
        <PrimaryButton disabled={loading} type="submit">
          {loading ? (
            <Loading />
          ) : action === "add" ? (
            `Create Agent`
          ) : (
            `Edit Agent`
          )}
        </PrimaryButton>
      </div>
      <ChangePasswordModal
        userId={String(userId)}
        userEmail={formData.email}
        isOpen={showChangePasswordModal}
        onClose={toggleChangePasswordModal}
      />
    </form>
  );
};

export default AgentForm;
