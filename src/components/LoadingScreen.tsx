import React from "react";

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-black backdrop-blur-sm">
      {/* Container for the Spinner */}
      <div className="relative flex items-center justify-center">
        {/* Outer Glowing Ring */}
        <div className="absolute h-24 w-24 rounded-full border-4 border-yellow-900/20"></div>

        {/* The Animated Spinner */}
        <svg
          className="animate-spin h-20 w-20 text-yellow-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-100"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      <div className="mt-6 flex flex-col items-center">
        <h2 className="text-xl font-semibold text-yellow-500 tracking-widest animate-pulse">
          LOADING
        </h2>
        <p className="text-yellow-900/70 text-sm mt-2 font-mono">
          Verifying Session...
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
