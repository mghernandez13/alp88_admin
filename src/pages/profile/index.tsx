import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import AdminTemplate from "../../templates/AdminTemplate";
import Headline from "../../components/generic/Headline";
import Input from "../../components/generic/Input";
import Label from "../../components/generic/Label";
import Loading from "../../components/generic/icons/Loading";
import { supabase } from "../../db/supabase";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_USER,
  UPDATE_USER,
  UPDATE_USER_EMAIL,
} from "../../graphql/queries/user";
import type { AgentFormDataProps } from "../../types/generic";
import ChangePasswordModal from "../../components/modals/agent/ChangePassword";
import { UserAuth } from "../../components/context/AuthContext";
import type { GetUserQueryVariables, UsersQueryData } from "../../types/api";

const MyProfilePage: React.FC = () => {
  // Assume userId is available from auth/session or params
  const { session } = UserAuth();
  const userId = session?.user?.id;
  const { data } = useQuery<UsersQueryData, GetUserQueryVariables>(GET_USER, {
    variables: { userId: String(userId) },
  });
  const [updateUser] = useMutation(UPDATE_USER);
  const [updateUserEmail] = useMutation(UPDATE_USER_EMAIL);
  const [formData, setFormData] = useState<AgentFormDataProps>({
    firstName: "",
    lastName: "",
    email: "",
    permissionId: null,
    avatarUrl: "",
    isQuotaBased: false,
    isActive: true,
    remittancePercent: 0,
    upline: null,
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (data?.profilesCollection?.edges?.[0]?.node) {
      const user = data.profilesCollection.edges[0].node;
      setFormData({
        firstName: String(user.first_name),
        lastName: String(user.last_name),
        email: String(user.email),
        permissionId: user.permission_id ?? null,
        avatarUrl: String(user.avatar_url),
        isQuotaBased: Boolean(user.is_quota_based),
        isActive: Boolean(user.status),
        remittancePercent: user.remittance_percent ?? 0,
        upline: null,
      });
    }
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Max size 2MB");
    if (!file.type.startsWith("image/")) return alert("Only images allowed");
    setUploading(true);
    try {
      if (formData.avatarUrl) {
        const oldPath = formData.avatarUrl.split("/").pop();
        if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
      }
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `agent-avatars/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, avatarUrl: data.publicUrl }));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Avatar Upload Failed",
        text: String(error),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser({
        variables: {
          id: userId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          isActive: formData.isActive,
          isArchive: false,
          avatarUrl: formData.avatarUrl,
          isQuotaBased: formData.isQuotaBased,
        },
      });
      await updateUserEmail({ variables: { userId, email: formData.email } });
      Swal.fire({
        icon: "success",
        title: "Profile Updated",
        text: "Your profile was updated successfully. You must relogin to see the changes.",
      });
    } catch (error) {
      Swal.fire({ icon: "error", title: "Update Failed", text: String(error) });
    }
  };

  return (
    <AdminTemplate>
      <div className="flex-col w-full px-4 sm:mx-2 md:mx-10 py-6">
        <div className="mb-5">
          <Headline>My Profile</Headline>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-black p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xl mx-auto"
        >
          <div className="flex flex-col items-center mb-8 p-4 bg-gray-50 dark:bg-[#16191d] rounded-lg border border-gray-200 dark:border-gray-700">
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
                <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-400 dark:border-gray-500">
                  <span className="text-yellow-500 bg-yellow-500 text-2xl">
                    👤
                  </span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <Loading />
                </div>
              )}
            </div>
            <label className="cursor-pointer bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-xs px-4 py-2 rounded-md transition-colors flex items-center gap-2">
              Upload Profile Image
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
                onChange={handleChange}
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
                onChange={handleChange}
                placeholder="Enter last name"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="flex flex-col gap-2 relative">
              <Label>Password</Label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowPasswordModal(true);
                }}
                className="pt-2 underline"
              >
                Change Password here
              </a>
            </div>
          </div>
          <div className="mt-8 flex gap-5 justify-end">
            <button
              type="submit"
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-10 rounded-md transition-all shadow-md active:scale-95"
            >
              Update Profile
            </button>
          </div>
          <ChangePasswordModal
            userId={String(userId)}
            userEmail={formData.email}
            isOpen={showPasswordModal}
            onClose={() => setShowPasswordModal(false)}
            requireOldPassword
          />
        </form>
      </div>
    </AdminTemplate>
  );
};

export default MyProfilePage;
