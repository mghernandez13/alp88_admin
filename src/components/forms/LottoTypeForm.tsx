import React, { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getTimes } from "../../utils/helper";
import { DAYS_OF_WEEK } from "../../types/constants";
import Label from "../generic/Label";
import Input from "../generic/Input";
import SecondaryButton from "../generic/buttons/Secondary";
import PrimaryButton from "../generic/buttons/Primary";
import { supabase } from "../../db/supabase";
import Swal from "sweetalert2";

export interface LottoFormData {
  gameType: string;
  drawTime: string;
  cutoffTime?: string;
  name: string;
  daysActive: string[];
  isActive: boolean;
  numberOfDigits: number;
  minNumber: number;
  maxNumber: number;
  logo_image?: string;
}

interface LottoTypeFormProps {
  formData: LottoFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onLogoChange: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  title: string; // "Create" or "Update"
  onCancel: () => void;
}

const LottoTypeForm: React.FC<LottoTypeFormProps> = ({
  formData,
  onChange,
  onLogoChange,
  onSubmit,
  loading,
  onCancel,
}) => {
  const times = getTimes();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>,
  ) => {
    let file: File | undefined;
    if ("dataTransfer" in e) {
      file = e.dataTransfer.files?.[0];
    } else {
      file = e.target.files?.[0];
    }
    if (!file) return;
    setUploading(true);
    setErrorMsg("");
    try {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Only image files are allowed.");
        setUploading(false);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setErrorMsg("Image must be less than 2MB.");
        setUploading(false);
        return;
      }
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `lotto-types/${fileName}`;
      const { error } = await supabase.storage
        .from("app")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (error) throw error;
      // Get public URL
      const { data } = supabase.storage.from("app").getPublicUrl(filePath);
      if (data?.publicUrl) {
        onLogoChange(data.publicUrl);
      }
    } catch {
      setErrorMsg("Error uploading image");
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  // Remove logo image from Supabase storage
  const handleRemoveLogo = async () => {
    if (!formData.logo_image) {
      onLogoChange("");
      return;
    }
    try {
      // Extract path after the bucket URL
      const url = formData.logo_image;
      const match = url.match(/\/storage\/v1\/object\/public\/app\/(.+)$/);
      const path = match?.[1];
      if (path) {
        await supabase.storage.from("app").remove([path]);
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Failed to remove logo image: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      onLogoChange("");
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleLogoUpload(e);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white dark:bg-black p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xl"
    >
      <div className="flex flex-col md:flex-row md:flex-wrap gap-6">
        <div className="flex w-full">
          {/* Logo Upload */}
          <div className="flex flex-col gap-2 w-full">
            <Label>Logo Image</Label>
            <div
              className={`flex flex-col items-center justify-center gap-2 border-2 ${dragActive ? "border-yellow-500 bg-yellow-900/10" : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-[#16191d]"} border-dashed rounded-md p-4 relative transition-colors`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              style={{ minHeight: 120 }}
            >
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleLogoUpload}
              />
              {!formData.logo_image && (
                <>
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload or Drag Image"}
                  </button>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    PNG, JPG, max 2MB
                  </span>
                  {errorMsg && (
                    <span className="text-xs text-red-400">{errorMsg}</span>
                  )}
                </>
              )}
              {formData.logo_image && (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={formData.logo_image}
                    alt="Logo Preview"
                    className="w-24 h-24 object-contain border border-gray-300 dark:border-gray-600 rounded bg-white"
                  />
                  <button
                    type="button"
                    className="px-2 py-1 text-xs bg-yellow-500 text-black rounded hover:bg-yellow-600"
                    onClick={handleRemoveLogo}
                  >
                    Remove
                  </button>
                </div>
              )}
              {dragActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-yellow-400 font-bold text-lg">
                    Drop image here
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex w-full gap-4">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Game Type</Label>
            <div className="relative">
              <select
                name="gameType"
                value={formData.gameType}
                onChange={onChange}
                className="bg-white dark:bg-[#16191d] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white w-full p-2 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none appearance-none cursor-pointer"
                required
              >
                <option value="" disabled>
                  Select game type
                </option>
                <option value="2D">2D</option>
                <option value="3D">3D</option>
                <option value="LP3">LP3</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <ChevronDown />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Name</Label>
            <Input
              name="name"
              value={formData.name}
              onChange={onChange}
              required
            />
          </div>
        </div>

        <div className="flex w-full gap-4">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Draw Time</Label>
            <div className="relative">
              <select
                name="drawTime"
                value={formData.drawTime}
                onChange={onChange}
                className="bg-white dark:bg-[#16191d] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white w-full p-2 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  Select time
                </option>
                {times.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <ChevronDown />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Cutoff Time</Label>
            <div className="relative">
              <select
                name="cutoffTime"
                value={formData.cutoffTime}
                onChange={onChange}
                className="bg-white dark:bg-[#16191d] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white w-full p-2 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none appearance-none cursor-pointer"
              >
                <option value="" disabled>
                  Select time
                </option>
                {times.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <ChevronDown />
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full gap-4">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Digits</Label>
            <Input
              type="text"
              name="numberOfDigits"
              value={
                formData.numberOfDigits !== 0 ? formData.numberOfDigits : ""
              }
              onChange={onChange}
              required
            />
          </div>
        </div>

        <div className="flex w-full gap-4">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Min #</Label>
            <Input
              type="text"
              name="minNumber"
              value={formData.minNumber}
              onChange={onChange}
              required
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Max #</Label>
            <Input
              type="text"
              name="maxNumber"
              value={formData.maxNumber}
              onChange={onChange}
              required
            />
          </div>
        </div>

        <div className="flex w-full gap-4">
          <div className="flex flex-col gap-4 w-full md:w-1/2">
            <Label>Days Active</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="daysActive"
                    value={day}
                    checked={formData.daysActive.includes(day)}
                    onChange={onChange}
                    className="w-4 h-4 accent-yellow-500 bg-white dark:bg-[#16191d] border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                  />
                  <label className="text-gray-700 dark:text-gray-300 font-medium cursor-pointer">
                    {day.slice(0, 3)}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-1/2">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={onChange}
              className="w-5 h-5 accent-yellow-500 bg-white dark:bg-[#16191d] border-gray-300 dark:border-gray-600 rounded cursor-pointer"
            />
            <label className="text-gray-700 dark:text-gray-300 font-medium cursor-pointer">
              Active
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end space-x-4">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? `Saving...` : `Save`}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default LottoTypeForm;
