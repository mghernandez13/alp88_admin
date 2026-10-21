import React from "react";
import { ChevronDown } from "lucide-react";
// import { getTimes } from "../../utils/helper";
import Label from "../generic/Label";
import Input from "../generic/Input";
import SecondaryButton from "../generic/buttons/Secondary";
import PrimaryButton from "../generic/buttons/Primary";

export interface BetTypeFormData {
  gameType: string;
  drawTime: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface BetTypeFormProps {
  formData: BetTypeFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onSubmit: (e: React.SubmitEvent) => void;
  loading: boolean;
  onCancel: () => void;
}

const BetTypeForm: React.FC<BetTypeFormProps> = ({
  formData,
  onChange,
  onSubmit,
  loading,
  onCancel,
}) => {
  // const times = getTimes();

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white dark:bg-black p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xl"
    >
      <div className="flex flex-col gap-6">
        <div className="flex w-full gap-4">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Game Type</Label>
            <div className="relative">
              <select
                name="gameType"
                value={formData.gameType}
                onChange={onChange}
                className="bg-white dark:bg-[#16191d] border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white w-full p-2 rounded-md focus:ring-2 focus:ring-yellow-500 outline-none appearance-none cursor-pointer"
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
          {/* <div className="flex flex-col gap-2 w-full md:w-1/2">
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
          </div> */}
        </div>

        <div className="flex w-full gap-4">
          <div className="flex flex-col gap-2 w-full">
            <Label>Name</Label>
            <Input
              name="name"
              value={formData.name}
              onChange={onChange}
              required
            />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Label>Code</Label>
            <Input
              name="code"
              value={formData.code}
              onChange={onChange}
              required
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
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
      <div className="mt-8 flex justify-end space-x-4">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default BetTypeForm;
