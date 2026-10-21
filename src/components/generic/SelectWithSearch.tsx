import { useEffect, useState } from "react";
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Transition,
} from "@headlessui/react";
import { ChevronUpDownIcon } from "@heroicons/react/20/solid";
import type { SearchableSelectOption } from "../../types/generic";

interface SearchableSelectProps {
  data?: SearchableSelectOption[];
  name?: string;
  isHirarchical?: boolean;
  preSelectedOption?: SearchableSelectOption | null;
  handleFormChange: (e: SearchableSelectOption) => void;
}

export default function SearchableSelect(props: SearchableSelectProps) {
  const { data, name, isHirarchical, preSelectedOption, handleFormChange } =
    props;
  const [selected, setSelected] = useState<SearchableSelectOption | null>(
    preSelectedOption ?? null,
  );

  const [query, setQuery] = useState("");
  const filteredPeople =
    query === ""
      ? data
      : data?.filter((item) =>
          item?.label?.toLowerCase().includes(query.toLowerCase()),
        );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(preSelectedOption ?? null);
  }, [preSelectedOption]);

  return (
    <div className="w-">
      <Combobox
        name={name}
        value={selected}
        onChange={(option) => {
          setSelected(option);
          if (option) handleFormChange(option);
        }}
      >
        <div className="relative mt-1">
          <div
            className={`relative w-full cursor-default overflow-hidden rounded-lg bg-white dark:bg-[#16191d] p-1 text-left border transition-all duration-200 ${
              query !== "" || selected
                ? "border-gray-300 dark:border-gray-700"
                : "border-gray-300 dark:border-gray-700"
            } focus-within:border-yellow-500 dark:focus-within:border-yellow-500 focus-within:ring-1 focus-within:ring-yellow-500`}
          >
            <ComboboxInput
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-transparent focus:ring-0 outline-none"
              displayValue={(item: SearchableSelectOption) => item?.label}
              onChange={(event) => setQuery(event.target.value)}
            />

            <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2 bg-transparent">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-500 dark:text-gray-400"
                aria-hidden="true"
              />
            </ComboboxButton>
          </div>

          <Transition
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery("")}
          >
            <ComboboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-[#16191d] py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
              {filteredPeople?.length === 0 && query !== "" ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-600 dark:text-gray-400">
                  Nothing found.
                </div>
              ) : (
                filteredPeople?.map((person) => (
                  <ComboboxOption
                    key={person.id}
                    value={person}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pr-4 transition-all ${
                        active
                          ? "bg-yellow-600/20 text-yellow-500"
                          : "text-gray-700 dark:text-gray-300"
                      } ${person.level === 0 ? "border-b border-gray-200 dark:border-gray-700" : ""} ${person.level === 0 && !active ? "bg-gray-100/80 dark:bg-gray-800/80" : ""}`
                    }
                    style={{ paddingLeft: `${(person.level + 1) * 1}rem` }} // Dynamic indent
                  >
                    <div className="flex items-center gap-2">
                      {/* Indefinite level indicators */}
                      {person.level > 0 && (
                        <span
                          className="text-gray-600 dark:text-gray-400"
                          style={{ minWidth: `${person.level}ch` }}
                        >
                          {Array.from(
                            { length: person.level - 1 },
                            () => "│",
                          ).join("")}
                          {person.level === 1 ? "├" : "└"}
                        </span>
                      )}

                      <span
                        className={`${person.level === 0 ? "font-bold text-yellow-500" : "font-normal"}`}
                      >
                        {person.label}
                      </span>

                      {person.level === 0 && isHirarchical && (
                        <span className="text-[10px] bg-yellow-500/10 px-1 rounded text-yellow-500">
                          ROOT
                        </span>
                      )}
                    </div>
                  </ComboboxOption>
                ))
              )}
            </ComboboxOptions>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}
