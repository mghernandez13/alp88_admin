import { Download, FileSpreadsheet, X } from "lucide-react";
import React from "react";

interface WinnerImagePreviewModalProps {
  isOpen: boolean;
  title: string;
  imageUrl: string;
  fileName: string;
  onClose: () => void;
  onDownload: () => void;
  onDownloadExcel: () => void;
}

const WinnerImagePreviewModal: React.FC<WinnerImagePreviewModalProps> = ({
  isOpen,
  title,
  imageUrl,
  fileName,
  onClose,
  onDownload,
  onDownloadExcel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-[70] w-full max-w-7xl rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-black shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {fileName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-300 dark:border-gray-700 p-2 text-gray-900 dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-auto bg-gray-50 dark:bg-black p-4">
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt={title}
              className="h-auto w-full max-w-full rounded-xl border border-gray-200 dark:border-gray-800 object-contain"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onDownloadExcel}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download Excel
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-yellow-400"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerImagePreviewModal;
