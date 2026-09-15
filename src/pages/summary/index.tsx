import React, { useMemo } from "react";
import Headline from "../../components/generic/Headline";
import Input from "../../components/generic/Input";
// import PrimaryButton from "../../components/generic/buttons/Primary";
import AdminTemplate from "../../templates/AdminTemplate";
import { getTodayDateString, humanizeDateString } from "../../utils/datetime";
import Lp3Summary from "../../components/Lp3Summary";
import BetsSummary from "../../components/BetsSummary";
import AgentSummaryTable from "../../components/AgentSummaryTable";
import { useSearchParams } from "react-router-dom";

const SummaryPage: React.FC = () => {
  const dateToday = getTodayDateString();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlDisplayDate = useMemo(() => {
    const param = searchParams.get("displayDate");
    return param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : dateToday;
  }, [searchParams, dateToday]);

  // Placeholder state for date pickers
  const displayDate = urlDisplayDate;
  // const [startDate, setStartDate] = useState(dateToday);
  // const [endDate, setEndDate] = useState(dateToday);

  const handleOnReload = () => {
    setSearchParams({ displayDate });
    window.location.href = `?displayDate=${displayDate}`;
  };

  return (
    <AdminTemplate>
      <div className="w-full h-min-screen px-4 sm:mx-2 my-6 md:mx-10 min-h-screen bg-black p-8 rounded-2xl">
        <div className="flex flex-col gap-6 w-full">
          {/* Lotto type dropdown and date selectors */}
          <div className="flex justify-end gap-4 items-end mb-2">
            {/* Date Inputs */}
            <div className="flex flex-col">
              <label className="text-gray-300 text-sm mb-1">
                Select Date to Display Summary
              </label>
              <Input
                type="date"
                value={displayDate}
                onChange={(e) => {
                  setSearchParams({ displayDate: e.target.value });
                }}
                className="w-40"
              />
            </div>
            {/* <div className="flex flex-wrap gap-4">
              <div className="flex flex-col">
                <label className="text-gray-300 text-sm mb-1">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-gray-300 text-sm mb-1">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex mt-6">
                <PrimaryButton>Download Report</PrimaryButton>
              </div>
            </div> */}
          </div>

          {/* Headline */}
          <Headline className="text-center mt-2 mb-4">
            Daily Summary ({humanizeDateString(displayDate)})
          </Headline>

          <Lp3Summary onReload={handleOnReload} selectedDate={displayDate} />

          {/* Lotto Draws Summary Cards Grid */}

          <BetsSummary gameType="3D" selectedDate={displayDate} />
          <BetsSummary gameType="2D" selectedDate={displayDate} />

          {/* Hierarchical Team Table */}
          <AgentSummaryTable selectedDate={displayDate} />
        </div>
      </div>
    </AdminTemplate>
  );
};

export default SummaryPage;
