import type { PropsWithChildren } from "react";

const Headline = (props: PropsWithChildren<{ className?: string }>) => {
  const { className, children } = props;
  return (
    <h2
      className={`text-2xl/7 font-bold text-gray-900 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight ${className}`}
    >
      {children}
    </h2>
  );
};

export default Headline;
