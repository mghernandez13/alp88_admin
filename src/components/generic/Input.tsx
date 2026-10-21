const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (
  props,
) => {
  const { className = "", type, ...rest } = props;
  const dateThemeClass =
    type === "date" || type === "time"
      ? "[color-scheme:light] dark:[color-scheme:dark]"
      : "";

  return (
    <input
      {...rest}
      type={type}
      className={`w-full bg-white dark:bg-[#16191d] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none ${dateThemeClass} ${className}`.trim()}
    />
  );
};

export default Input;
