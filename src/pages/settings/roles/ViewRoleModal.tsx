import React, { useEffect, useRef } from "react";
import Label from "../../../components/generic/Label";
import { ADMIN_PERMISSIONS, USER_PERMISSIONS } from "../../../types/constants";

interface ViewRoleModalProps {
  open: boolean;
  onClose: () => void;
  role: {
    name: string;
    permissions: string[];
  };
}

// Removed PermissionDot, replaced with disabled checkboxes below

const ViewRoleModal: React.FC<ViewRoleModalProps> = ({
  open,
  onClose,
  role,
}) => {
  // Close modal on outside click
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-black p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xl w-full max-w-xl"
        style={{
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Name</Label>
            <input
              type="text"
              value={role.name}
              readOnly
              className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded px-3 py-2 border border-gray-300 dark:border-gray-600"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Admin Permissions</Label>
            <div className="grid grid-cols-4 gap-6 mb-6">
              {["view", "add", "edit", "delete"].map((type) => (
                <div key={type}>
                  <span className="text-yellow-400 font-semibold mb-2 block">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                  {ADMIN_PERMISSIONS.filter((p) =>
                    type === "view"
                      ? p.toLowerCase().includes("view") ||
                        p.toLowerCase().includes("login")
                      : p.toLowerCase().includes(type),
                  ).map((perm) => (
                    <label key={perm} className="flex items-center gap-2 mb-2">
                      <span
                        style={{
                          position: "relative",
                          display: "inline-block",
                          width: "1.25rem",
                          height: "1.25rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={role.permissions.includes(perm)}
                          disabled
                          className="bg-yellow-500 border-yellow-500 focus:ring-yellow-500"
                          style={{
                            WebkitAppearance: "none",
                            appearance: "none",
                            width: "1.25rem",
                            height: "1.25rem",
                            borderRadius: "0.25rem",
                            border: "2px solid #eab308",
                            backgroundColor: role.permissions.includes(perm)
                              ? "#eab308"
                              : "var(--theme-checkbox-background)",
                            cursor: "not-allowed",
                          }}
                        />
                        {role.permissions.includes(perm) && (
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            style={{
                              position: "absolute",
                              top: "0.15rem",
                              left: "0.15rem",
                              width: "0.95rem",
                              height: "0.95rem",
                              pointerEvents: "none",
                            }}
                          >
                            <path
                              d="M6 10.5L9 13.5L14 7.5"
                              stroke="#000"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="text-gray-900 dark:text-white text-xs">
                        {perm}
                      </span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <Label>User Permissions</Label>
            <div className="grid grid-cols-4 gap-6">
              {USER_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 mb-2">
                  <span
                    style={{
                      position: "relative",
                      display: "inline-block",
                      width: "1.25rem",
                      height: "1.25rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={role.permissions.includes(perm)}
                      disabled
                      className="bg-yellow-500 border-yellow-500 focus:ring-yellow-500"
                      style={{
                        WebkitAppearance: "none",
                        appearance: "none",
                        width: "1.25rem",
                        height: "1.25rem",
                        borderRadius: "0.25rem",
                        border: "2px solid #eab308",
                        backgroundColor: role.permissions.includes(perm)
                          ? "#eab308"
                          : "var(--theme-checkbox-background)",
                        cursor: "not-allowed",
                      }}
                    />
                    {role.permissions.includes(perm) && (
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                          position: "absolute",
                          top: "0.15rem",
                          left: "0.15rem",
                          width: "0.95rem",
                          height: "0.95rem",
                          pointerEvents: "none",
                        }}
                      >
                        <path
                          d="M6 10.5L9 13.5L14 7.5"
                          stroke="#000"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="text-gray-900 dark:text-white text-xs">
                    {perm}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold py-3 px-6 rounded-md transition-all shadow-md active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewRoleModal;
