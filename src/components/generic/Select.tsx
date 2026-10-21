import { ChevronDown } from "lucide-react";

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  children,
  ...props
}) => {
  return (
    <div className="relative">
      <select
        className="bg-white dark:bg-[#16191d] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white w-full p-2 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none appearance-none cursor-pointer"
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
        <ChevronDown />
      </div>
    </div>
  );
};

export default Select;
