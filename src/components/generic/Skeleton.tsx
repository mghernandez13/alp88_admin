import React from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  className = "",
  style = {},
}) => {
  return (
    <span
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      style={{
        display: "inline-block",
        width,
        height,
        ...style,
      }}
    />
  );
};

export default Skeleton;
