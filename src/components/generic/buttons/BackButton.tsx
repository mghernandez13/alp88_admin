const BackButton = ({
  onClick,
  children,
  ...props
}: {
  onClick: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 bg-white dark:bg-black"
      {...props}
    >
      {children}
    </button>
  );
};

export default BackButton;
