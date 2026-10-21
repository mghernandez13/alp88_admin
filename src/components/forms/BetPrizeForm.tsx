import React, { useEffect } from "react";
import Label from "../generic/Label";
import Input from "../generic/Input";
import SearchableSelect from "../generic/SelectWithSearch";
import { formatTo12h } from "../../utils/helper";
import PrimaryButton from "../generic/buttons/Primary";
import SecondaryButton from "../generic/buttons/Secondary";
import { useLazyQuery } from "@apollo/client/react";
import type {
  BetTypesQueryData,
  BetTypesQueryVariables,
} from "../../types/api";
import { GET_BET_TYPES } from "../../graphql/queries/betTypes";

export interface BetPrizeFormData {
  lottoTypeId: string;
  betTypeId: string;
  betAmount: string;
  prize: string;
  isActive: boolean;
  super_jackpot?: boolean;
  super_jackpot_multiplier?: string;
}

export interface LottoTypeOption {
  id: string;
  name: string;
  gameType: string;
  drawTime: string;
}

interface BetPrizeFormProps {
  formData: BetPrizeFormData;
  lottoTypes: LottoTypeOption[];
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  onCancel: () => void;
}

const BetPrizeForm: React.FC<BetPrizeFormProps> = ({
  formData,
  lottoTypes,
  onChange,
  onSubmit,
  loading,
  onCancel,
}) => {
  const selectedType = lottoTypes.find((lt) => lt.id === formData.lottoTypeId);
  const gameType = selectedType?.gameType;

  const [fetchBetTypes, { data: betTypesData }] = useLazyQuery<
    BetTypesQueryData,
    BetTypesQueryVariables
  >(GET_BET_TYPES, {
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (gameType) {
      fetchBetTypes({
        variables: {
          first: 500,
          offset: 0,
          filter: {
            and: [
              { game_type: { eq: gameType } },
              { is_archive: { eq: false } },
            ],
          },
          sortOrder: [{ name: "AscNullsFirst" }],
        },
      });
    }
  }, [fetchBetTypes, gameType, selectedType]);

  const betTypes =
    betTypesData?.bet_typesCollection?.edges
      ?.map((e) => ({
        id: e.node?.id ?? "",
        name: e.node?.name ?? "",
      }))
      .filter((item) => item.id !== "") ?? [];

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white dark:bg-black p-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xl"
    >
      <div className="flex flex-col gap-6">
        <div className="flex w-full gap-4">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Lotto Type</Label>
            <SearchableSelect
              name="lottoTypeId"
              data={lottoTypes.map((type) => ({
                id: type.id,
                label: type.name,
                level: 0,
              }))}
              preSelectedOption={
                lottoTypes
                  .map((type) => ({
                    id: type.id,
                    label: type.name,
                    level: 0,
                  }))
                  .find((option) => option.id === formData.lottoTypeId) ?? null
              }
              handleFormChange={(option) =>
                onChange({
                  target: {
                    name: "lottoTypeId",
                    value: option.id,
                    type: "select",
                  },
                } as unknown as React.ChangeEvent<HTMLInputElement>)
              }
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Game Type</Label>
            <Input
              name="gameType"
              value={selectedType?.gameType ?? ""}
              disabled
              readOnly
            />
          </div>
        </div>

        <div className="flex w-full gap-4">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Draw Time</Label>
            <Input
              name="drawTime"
              value={
                selectedType?.drawTime ? formatTo12h(selectedType.drawTime) : ""
              }
              disabled
              readOnly
            />
          </div>
          {gameType !== "LP3" && (
            <div className="flex flex-col gap-2 w-full md:w-1/2">
              <Label>Bet Type</Label>
              <SearchableSelect
                name="betTypeId"
                data={betTypes.map((type) => ({
                  id: type.id,
                  label: type.name,
                  level: 0,
                }))}
                preSelectedOption={
                  betTypes
                    .map((type) => ({
                      id: type.id,
                      label: type.name,
                      level: 0,
                    }))
                    .find((option) => option.id === formData.betTypeId) ?? null
                }
                handleFormChange={(option) =>
                  onChange({
                    target: {
                      name: "betTypeId",
                      value: option.id,
                      type: "select",
                    },
                  } as unknown as React.ChangeEvent<HTMLInputElement>)
                }
              />
            </div>
          )}
        </div>

        <div className="flex w-full gap-4">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Bet Amount</Label>
            <Input
              name="betAmount"
              type="text"
              value={formData.betAmount}
              onChange={onChange}
              required
            />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <Label>Prize</Label>
            <Input
              name="prize"
              type="text"
              value={formData.prize}
              onChange={onChange}
              required
            />
          </div>
        </div>

        <div className="flex w-full gap-4">
          <div className="flex items-center gap-2 mt-2 w-full md:w-1/2">
            <input
              type="checkbox"
              name="super_jackpot"
              checked={!!formData.super_jackpot}
              onChange={onChange}
              className="w-5 h-5 accent-yellow-500 bg-white dark:bg-[#16191d] border-gray-300 dark:border-gray-600 rounded cursor-pointer"
            />
            <label className="text-gray-700 dark:text-gray-300 font-medium cursor-pointer">
              Enable Super Jackpot
            </label>
          </div>
          {formData.super_jackpot && (
            <div className="flex flex-col gap-2 w-full md:w-1/2 mt-2">
              <Label>Super Jackpot Multiplier</Label>
              <Input
                name="super_jackpot_multiplier"
                type="number"
                step="0"
                min="0"
                value={formData.super_jackpot_multiplier ?? ""}
                onChange={onChange}
                required={!!formData.super_jackpot}
                pattern="^\\d+(\\.\\d{1,2})?$"
                placeholder="0.00"
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (
                    ["e", "E", "+", "-"].includes(e.key) ||
                    (e.key === "." &&
                      (e.currentTarget.value.includes(".") ||
                        e.currentTarget.selectionStart === 0))
                  ) {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          )}
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

export default BetPrizeForm;
