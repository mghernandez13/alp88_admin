import React, { useCallback, useState } from "react";
import { KeyRound, X, Eye, EyeOff } from "lucide-react";
import Label from "../../generic/Label";
import Input from "../../generic/Input";
import { useMutation } from "@apollo/client/react";
import { RESET_USER_PASSWORD } from "../../../graphql/queries/user";
import Swal from "sweetalert2";
import Loading from "../../generic/icons/Loading";
import { AnimatePresence, motion } from "framer-motion";
import SecondaryButton from "../../generic/buttons/Secondary";
import PrimaryButton from "../../generic/buttons/Primary";
import { supabase } from "../../../db/supabase";

const ChangePasswordModal: React.FC<{
  isOpen: boolean;
  userId: string;
  userEmail: string;
  onClose: () => void;
  requireOldPassword?: boolean;
}> = ({ isOpen, onClose, requireOldPassword = false, userId, userEmail }) => {
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    oldPasswordError: false,
    newPasswordError: false,
    confirmPasswordError: false,
    oldPasswordErrorMessage: "",
    newPasswordErrorMessage: "",
    confirmPasswordErrorMessage: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [resetPassword, { loading }] = useMutation(RESET_USER_PASSWORD);

  const formValidation = useCallback(() => {
    if (requireOldPassword && formData.oldPassword === "") {
      setFormData((prev) => ({
        ...prev,
        oldPasswordErrorMessage: "Old Password is required",
        oldPasswordError: true,
      }));
      return false;
    }
    if (formData.newPassword === "") {
      setFormData((prev) => ({
        ...prev,
        oldPasswordError: false,
        oldPasswordErrorMessage: "",
        newPasswordErrorMessage: "Password is required",
        newPasswordError: true,
      }));
      return false;
    }
    if (formData.confirmPassword === "") {
      setFormData((prev) => ({
        ...prev,
        oldPasswordError: false,
        oldPasswordErrorMessage: "",
        newPasswordError: false,
        confirmPasswordErrorMessage: "Confirm Password is required",
        confirmPasswordError: true,
      }));
      return false;
    }
    if (requireOldPassword && formData.oldPassword === formData.newPassword) {
      setFormData((prev) => ({
        ...prev,
        oldPasswordError: false,
        oldPasswordErrorMessage: "",
        newPasswordErrorMessage:
          "New Password must be different from Old Password",
        newPasswordError: true,
      }));
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setFormData((prev) => ({
        ...prev,
        oldPasswordError: false,
        oldPasswordErrorMessage: "",
        newPasswordError: false,
        confirmPasswordErrorMessage: "Password and Confirm Password mismatch!",
        confirmPasswordError: true,
      }));
      return false;
    }

    setFormData((prev) => ({
      ...prev,
      oldPasswordError: false,
      newPasswordError: false,
      confirmPasswordError: false,
      oldPasswordErrorMessage: "",
      newPasswordErrorMessage: "",
      confirmPasswordErrorMessage: "",
    }));

    return true;
  }, [formData, requireOldPassword]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value } = target;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = async () => {
    if (!formValidation()) return;

    if (requireOldPassword) {
      if (!userEmail) {
        Swal.fire({
          icon: "error",
          title: "Change Password",
          text: "Unable to verify old password. Please log in again.",
        });
        return;
      }

      const { error: oldPasswordError } =
        await supabase.auth.signInWithPassword({
          email: userEmail,
          password: formData.oldPassword,
        });

      if (oldPasswordError) {
        setFormData((prev) => ({
          ...prev,
          oldPasswordError: true,
          oldPasswordErrorMessage: "Old Password is incorrect",
        }));
        return;
      }
    }

    const { error } = await resetPassword({
      variables: {
        userId,
        password: formData.newPassword,
      },
    });

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Change Password",
        text: `Error occurred while updating password: ${error.message}`,
      });
    } else {
      Swal.fire({
        icon: "success",
        title: "Change Password",
        text: `Password successfully updated!`,
      });
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              mass: 0.8,
            }}
            className="relative bg-white dark:bg-black border border-gray-200 dark:border-gray-700 w-full max-w-md p-8 rounded-lg shadow-2xl z-[70]"
          >
            <div>
              <button
                onClick={onClose}
                className="absolute bg-transparent top-4 right-4 text-gray-900 dark:text-white hover:border-none hover:text-gray-600"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <KeyRound size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Change Password
                </h2>
              </div>

              <div className="space-y-4">
                {requireOldPassword && (
                  <div className="flex flex-col gap-2 relative">
                    <Label>Old Password</Label>
                    <div className="relative w-full">
                      <Input
                        type={showPasswords.oldPassword ? "text" : "password"}
                        name="oldPassword"
                        value={formData.oldPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords((prev) => ({
                            ...prev,
                            oldPassword: !prev.oldPassword,
                          }))
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                      >
                        {showPasswords.oldPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    {formData.oldPasswordError && (
                      <span className="text-red-500 italic text-xs">
                        {formData.oldPasswordErrorMessage}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 relative">
                  <Label>New Password</Label>
                  <div className="relative w-full">
                    <Input
                      type={showPasswords.newPassword ? "text" : "password"}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          newPassword: !prev.newPassword,
                        }))
                      }
                      className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                    >
                      {showPasswords.newPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {formData.newPasswordError && (
                    <span className="text-red-500 italic text-xs">
                      {formData.newPasswordErrorMessage}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2 relative">
                  <Label>Confirm Password</Label>
                  <div className="relative w-full">
                    <Input
                      type={showPasswords.confirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          confirmPassword: !prev.confirmPassword,
                        }))
                      }
                      className="absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                    >
                      {showPasswords.confirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPasswordError && (
                    <span className="text-red-500 italic text-xs">
                      {formData.confirmPasswordErrorMessage}
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                  <PrimaryButton
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={loading}
                  >
                    {loading ? <Loading /> : "Update Password"}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ChangePasswordModal;
