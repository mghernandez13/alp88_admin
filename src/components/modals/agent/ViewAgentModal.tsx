import { AnimatePresence, motion } from "framer-motion";
import type { ModalProps } from "../../../types/generic";
import { User, X } from "lucide-react";
import Label from "../../generic/Label";
import Input from "../../generic/Input";
import { useEffect, useState } from "react";
import type { GetUserQueryVariables, UsersQueryData } from "../../../types/api";
import { GET_USER } from "../../../graphql/queries/user";
import { useLazyQuery, useQuery } from "@apollo/client/react";
import { GET_ROLE } from "../../../graphql/queries/roles";
import type { RolesQueryData, GetRoleQueryVariables } from "../../../types/api";

interface ViewAgentModalProps extends ModalProps {
  userId: string;
}

const ViewAgentModal: React.FC<ViewAgentModalProps> = (props) => {
  const { isOpen, onClose, userId } = props;
  const [uplineName, setUplineName] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    permissionId: "",
    roleName: "-",
    avatarUrl: "",
    remittancePercent: "",
    incomePercent: "",
    isQuotaBased: false,
    isActive: true,
  });

  const { data } = useQuery<UsersQueryData, GetUserQueryVariables>(GET_USER, {
    variables: {
      userId: String(userId),
    },
  });

  const [getUplineDetails] = useLazyQuery<UsersQueryData>(GET_USER, {
    fetchPolicy: "network-only",
  });

  const { data: roleData } = useQuery<RolesQueryData, GetRoleQueryVariables>(
    GET_ROLE,
    {
      variables: { roleId: formData.permissionId },
      skip: !formData.permissionId,
      fetchPolicy: "network-only",
    },
  );

  useEffect(() => {
    const node = data?.profilesCollection.edges[0].node;
    const remittancePercent = node?.remittance_percent ?? 60;
    const incomePercent = 100 - remittancePercent;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData((prev) => ({
      ...prev,
      firstName: String(node?.first_name),
      lastName: String(node?.last_name),
      email: String(node?.email),
      permissionId: node?.permission_id ?? "",
      avatarUrl: String(node?.avatar_url),
      remittancePercent: String(remittancePercent),
      incomePercent: String(incomePercent),
      isQuotaBased: Boolean(node?.is_quota_based),
      isActive: Boolean(node?.status),
    }));
    const upline = node?.upline;
    if (upline) {
      getUplineDetails({
        variables: {
          userId: String(upline),
        },
      })
        .then((res) => {
          const uplineData = res.data?.profilesCollection.edges[0].node;
          if (uplineData) {
            // Fetch permission name for upline
            let isUplineAdmin = false;
            if (uplineData.permission_id) {
              const uplineRoleName =
                roleData?.permissionsCollection?.edges?.[0]?.node?.id ===
                uplineData.permission_id
                  ? roleData?.permissionsCollection?.edges?.[0]?.node?.name
                  : undefined;
              if (
                uplineRoleName &&
                uplineRoleName.toLowerCase().includes("admin")
              ) {
                isUplineAdmin = true;
              }
            }
            setUplineName(
              isUplineAdmin
                ? `Site admin - ${uplineData.first_name} ${uplineData.last_name}`
                : `${uplineData.first_name} ${uplineData.last_name} - ${uplineData.email}`,
            );
          } else {
            setUplineName("");
          }
        })
        .catch(() => {
          setUplineName("");
        });
    } else {
      setUplineName("");
    }
  }, [data, getUplineDetails, roleData]);

  useEffect(() => {
    if (roleData?.permissionsCollection?.edges?.[0]?.node?.name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData((prev) => ({
        ...prev,
        roleName: roleData.permissionsCollection.edges[0].node.name,
      }));
    } else {
      setFormData((prev) => ({ ...prev, roleName: "-" }));
    }
  }, [roleData]);

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
            className="themed-scrollbar relative bg-white dark:bg-black border border-gray-200 dark:border-gray-700 w-full max-w-2xl p-8 rounded-lg shadow-2xl z-[70] max-h-[90vh] overflow-y-auto"
          >
            <div>
              <button
                onClick={onClose}
                className="absolute bg-transparent top-4 right-4 text-gray-900 dark:text-white hover:border-none hover:text-gray-600"
              >
                <X size={20} />
              </button>
              <div className="flex flex-col items-center mb-8 p-4 bg-gray-50 dark:bg-[#16191d] rounded-lg border border-gray-200 dark:border-gray-700 mt-10">
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
                    <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-500">
                      <User className="text-gray-600 dark:text-gray-400 w-10 h-10" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:flex-wrap gap-6">
                <div className="flex w-full gap-5">
                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>First Name</Label>
                    <Input
                      type="text"
                      name="firstName"
                      disabled={true}
                      value={formData.firstName}
                      placeholder="Enter first name"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Last Name</Label>
                    <Input
                      type="text"
                      name="lastName"
                      disabled={true}
                      value={formData.lastName}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                </div>

                <div className="flex w-full gap-5">
                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled={true}
                      placeholder="agent@tresdos.com"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Role</Label>
                    <Input
                      type="text"
                      name="roleName"
                      value={formData.roleName}
                      disabled={true}
                      className="bg-white dark:bg-[#16191d] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white w-full p-2 rounded-md"
                      required
                    />
                  </div>
                </div>
                <div className="flex w-full gap-5">
                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Remit %</Label>
                    <Input
                      type="text"
                      name="remitPercent"
                      value={formData.remittancePercent}
                      disabled={true}
                      placeholder=""
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2 w-full md:w-1/2">
                    <Label>Income %</Label>
                    <Input
                      type="text"
                      name="incomePercent"
                      value={formData.incomePercent}
                      disabled={true}
                      placeholder=""
                      required
                    />
                  </div>
                </div>
                <div className="flex w-full">
                  <div className="flex flex-col gap-2 w-full">
                    <Label>Upline</Label>
                    <Input
                      type="text"
                      name="upline"
                      value={uplineName}
                      disabled={true}
                      placeholder=""
                      required
                    />
                  </div>
                </div>
                <div className="flex w-full gap-5">
                  <div className="flex gap-2 mt-2 w-full md:w-1/2 items-center">
                    <input
                      type="checkbox"
                      id="isQuotaBased"
                      name="isQuotaBased"
                      disabled={true}
                      checked={formData.isQuotaBased}
                      className="w-5 h-5 accent-yellow-500 bg-white dark:bg-[#16191d] border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="isActive"
                      className="text-gray-700 dark:text-gray-300 font-medium cursor-pointer"
                    >
                      Is Quota Based?
                    </label>
                  </div>
                  <div className="flex gap-2 mt-2 w-full md:w-1/2 items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      disabled={true}
                      checked={formData.isActive}
                      className="w-5 h-5 accent-yellow-500 bg-white dark:bg-[#16191d] border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="isActive"
                      className="text-gray-700 dark:text-gray-300 font-medium cursor-pointer"
                    >
                      Is Active
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-10 rounded-md transition-all shadow-md active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ViewAgentModal;
