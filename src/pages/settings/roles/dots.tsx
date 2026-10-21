const PermissionDot: React.FC<{ isAdmin: boolean; perm: string }> = ({
  isAdmin,
  perm,
}) => (
  <span className="relative group mr-2">
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: isAdmin ? "#c9e71d" : "#ef4444",
        verticalAlign: "middle",
      }}
    />
    <span className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:flex px-2 py-1 text-xs text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 rounded shadow-lg whitespace-nowrap">
      {perm}
    </span>
  </span>
);

export default PermissionDot;
