import { useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  BarChart as RechartsBarChart,
} from "recharts";
import Skeleton from "../../components/generic/Skeleton";
import { supabase } from "../../db/supabase";
import { GET_LOTTO_TYPES } from "../../graphql/queries/lotto";
import type { LottoQueryData, LottoQueryVariables } from "../../types/api";
import type { DashboardCardProps } from "../../types/generic";
import { formatCurrency } from "../../utils/currency";
import {
  getDateRange,
  getTodayDayName,
  getUniqueDayNamesInRange,
} from "../../utils/datetime";

interface TwoDBetStatsResponse {
  byLottoTypeId?: Record<string, Partial<TwoDBetStats>>;
  totalBets?: number;
  totalStraightBets?: number;
  totalRambolitoBets?: number;
  totalWinners?: number;
  totalPrize?: number;
  dailyGrossSale?: Record<string, number>;
  dailyNetSale?: Record<string, number>;
  dailyStraightWinners?: Record<string, number>;
  dailyRambolitoWinners?: Record<string, number>;
  dailyMonthlyBracketWinners?: Record<string, number>;
  dailyPetsadaWinners?: Record<string, number>;
}

interface TwoDBetStats {
  totalBets: number;
  totalStraightBets: number;
  totalRambolitoBets: number;
  totalWinners: number;
  totalPrize: number;
  dailyGrossSale: Record<string, number>;
  dailyNetSale: Record<string, number>;
  dailyStraightWinners: Record<string, number>;
  dailyRambolitoWinners: Record<string, number>;
  dailyMonthlyBracketWinners: Record<string, number>;
  dailyPetsadaWinners: Record<string, number>;
}

const BAR_WIDTH = 60;
const EMPTY_STATS: TwoDBetStats = {
  totalBets: 0,
  totalStraightBets: 0,
  totalRambolitoBets: 0,
  totalWinners: 0,
  totalPrize: 0,
  dailyGrossSale: {},
  dailyNetSale: {},
  dailyStraightWinners: {},
  dailyRambolitoWinners: {},
  dailyMonthlyBracketWinners: {},
  dailyPetsadaWinners: {},
};

const TwoDCard: React.FC<DashboardCardProps> = ({ startDate, endDate }) => {
  const dayNameToday = getTodayDayName();
  const [daysActive, setDaysActive] = useState<string[]>([dayNameToday]);
  const [statsByLottoId, setStatsByLottoId] = useState<
    Record<string, TwoDBetStats>
  >({});
  const [statsLoading, setStatsLoading] = useState(false);

  const dateRange = getDateRange(startDate, endDate);

  const formatDateForDisplay = (date: string) => {
    const [, month, day] = date.split("-");
    return `${month}-${day}`;
  };

  const { data: twoDDrawToday, loading: twoDLoading } = useQuery<
    LottoQueryData,
    LottoQueryVariables
  >(GET_LOTTO_TYPES, {
    variables: {
      first: 100,
      offset: 0,
      filter: {
        and: [
          { game_type: { eq: "2D" } },
          { is_active: { eq: true } },
          { is_archive: { eq: false } },
          { days_active: { contains: daysActive } },
        ],
      },
      sortOrder: [{ draw_time: "AscNullsFirst" }],
    },
    fetchPolicy: "cache-first",
  });

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      const twoDToday = twoDDrawToday?.lotto_typesCollection.edges;
      const twoDIds =
        twoDToday
          ?.map((edge) => Number(edge.node.id))
          .filter((id) => Number.isFinite(id)) ?? [];

      if (!twoDIds.length) {
        setStatsByLottoId({});
        return;
      }

      setStatsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke(
          "dashboard-2d-bet-stats",
          {
            body: {
              lottoTypeIds: twoDIds,
              startDate,
              endDate,
            },
          },
        );

        if (error) {
          throw error;
        }

        const payload = (data ?? {}) as TwoDBetStatsResponse;

        if (!cancelled) {
          const mappedStats: Record<string, TwoDBetStats> = {};

          for (const lottoTypeId of twoDIds) {
            const key = String(lottoTypeId);
            const lottoPayload =
              payload.byLottoTypeId?.[key] ??
              (twoDIds.length === 1 ? payload : undefined);

            mappedStats[key] = {
              totalBets: lottoPayload?.totalBets ?? 0,
              totalStraightBets: lottoPayload?.totalStraightBets ?? 0,
              totalRambolitoBets: lottoPayload?.totalRambolitoBets ?? 0,
              totalWinners: lottoPayload?.totalWinners ?? 0,
              totalPrize: lottoPayload?.totalPrize ?? 0,
              dailyGrossSale: lottoPayload?.dailyGrossSale ?? {},
              dailyNetSale: lottoPayload?.dailyNetSale ?? {},
              dailyStraightWinners: lottoPayload?.dailyStraightWinners ?? {},
              dailyRambolitoWinners: lottoPayload?.dailyRambolitoWinners ?? {},
              dailyMonthlyBracketWinners:
                lottoPayload?.dailyMonthlyBracketWinners ?? {},
              dailyPetsadaWinners: lottoPayload?.dailyPetsadaWinners ?? {},
            };
          }

          setStatsByLottoId(mappedStats);
        }
      } catch (error) {
        console.error("Failed to fetch 3D bet stats:", error);
        if (!cancelled) {
          setStatsByLottoId({});
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [twoDDrawToday, startDate, endDate]);

  useEffect(() => {
    setDaysActive(getUniqueDayNamesInRange(startDate, endDate));
  }, [startDate, endDate]);

  const lottoEdges = twoDDrawToday?.lotto_typesCollection.edges ?? [];

  if (!lottoEdges.length) {
    return null;
  }

  return (
    <>
      {lottoEdges.map((lottoType) => {
        const lottoStats =
          statsByLottoId[String(lottoType.node.id)] ?? EMPTY_STATS;

        const dailySalesData = dateRange.map((date) => ({
          date: formatDateForDisplay(date),
          grossSales: lottoStats.dailyGrossSale[date] ?? 0,
          netSales: lottoStats.dailyNetSale[date] ?? 0,
        }));

        const dailyWinnersData = dateRange.map((date) => ({
          date: formatDateForDisplay(date),
          straightWinners: lottoStats.dailyStraightWinners[date] ?? 0,
          rambolitoWinners: lottoStats.dailyRambolitoWinners[date] ?? 0,
          monthlyBracketWinners:
            lottoStats.dailyMonthlyBracketWinners[date] ?? 0,
          petsadaWinners: lottoStats.dailyPetsadaWinners[date] ?? 0,
        }));

        return (
          <div key={lottoType.node.id} className="w-full mx-auto mt-10">
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 mb-10 bg-black rounded-2xl p-6 shadow-2xl border border-[#2d3748]">
              <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
                {twoDLoading ? (
                  <Skeleton width={75} height={75} />
                ) : (
                  <div className="w-20 h-20 mb-4 sm:mb-0 sm:mr-4 flex items-center justify-center bg-white rounded-xl shadow-md border-2 border-[#fbbf24]">
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={lottoType.node.logo_image}
                        alt={`${lottoType.node.name} logo`}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-row gap-4 sm:gap-8 w-full md:w-auto mt-4 md:mt-0">
                  <div className="flex flex-col items-center sm:items-start px-4 sm:px-0">
                    <span className="text-sm text-slate-400 font-medium tracking-wide">
                      Total Bets
                    </span>
                    <span className="text-3xl font-extrabold text-yellow-400 drop-shadow-lg">
                      {twoDLoading || statsLoading ? (
                        <Skeleton className="mt-2" width={50} height={40} />
                      ) : (
                        lottoStats.totalBets
                      )}
                    </span>
                  </div>

                  <div className="hidden lg:block w-px h-10 bg-slate-700 mx-6" />

                  <div className="flex flex-col items-center sm:items-start px-4 sm:px-0">
                    <span className="text-sm text-slate-400 font-medium tracking-wide">
                      Total Straight Bets
                    </span>
                    <span className="text-3xl font-extrabold text-yellow-400 drop-shadow-lg">
                      {twoDLoading || statsLoading ? (
                        <Skeleton className="mt-2" width={50} height={40} />
                      ) : (
                        lottoStats.totalStraightBets
                      )}
                    </span>
                  </div>

                  <div className="hidden lg:block w-px h-10 bg-slate-700 mx-6" />

                  <div className="flex flex-col items-center sm:items-start px-4 sm:px-0">
                    <span className="text-sm text-slate-400 font-medium tracking-wide">
                      Total Ramble Bets
                    </span>
                    <span className="text-3xl font-extrabold text-yellow-400 drop-shadow-lg">
                      {twoDLoading || statsLoading ? (
                        <Skeleton className="mt-2" width={50} height={40} />
                      ) : (
                        lottoStats.totalRambolitoBets
                      )}
                    </span>
                  </div>

                  <div className="hidden lg:block w-px h-10 bg-slate-700 mx-6" />

                  <div className="flex flex-col items-center sm:items-start px-4 sm:px-0">
                    <span className="text-sm text-slate-400 font-medium tracking-wide">
                      Total Winners
                    </span>
                    <span className="text-3xl font-extrabold text-yellow-400 drop-shadow-lg">
                      {twoDLoading || statsLoading ? (
                        <Skeleton className="mt-2" width={50} height={40} />
                      ) : (
                        lottoStats.totalWinners
                      )}
                    </span>
                  </div>

                  <div className="hidden lg:block w-px h-10 bg-slate-700 mx-6" />

                  <div className="flex flex-col items-center sm:items-start px-4 sm:px-0">
                    <span className="text-sm text-slate-400 font-medium tracking-wide">
                      Total Prize
                    </span>
                    <span className="text-3xl font-extrabold text-yellow-400 drop-shadow-lg">
                      {twoDLoading || statsLoading ? (
                        <Skeleton className="mt-2" width={50} height={40} />
                      ) : (
                        formatCurrency(lottoStats.totalPrize)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col gap-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 bg-black rounded-2xl p-4 sm:p-8 shadow-2xl border border-[#2d3748] transition-transform hover:scale-[1.02] min-w-0">
                  <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div
                      style={{
                        minWidth: `${Math.max(dailySalesData.length, 1) * BAR_WIDTH}px`,
                      }}
                    >
                      <ResponsiveContainer width="100%" height={400}>
                        <RechartsBarChart
                          data={dailySalesData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#374151"
                          />
                          <XAxis dataKey="date" stroke="#cbd5e1" />
                          <YAxis stroke="#cbd5e1" />
                          <Tooltip
                            contentStyle={{
                              background: "#1f2937",
                              border: "none",
                              color: "#fff",
                            }}
                          />
                          <Legend wrapperStyle={{ color: "#fff" }} />
                          <Bar
                            dataKey="grossSales"
                            fill="#fbbf24"
                            name="Gross Sales"
                          />
                          <Bar
                            dataKey="netSales"
                            fill="#60a5fa"
                            name="Net Sales"
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-black rounded-2xl p-4 sm:p-8 shadow-2xl border border-[#2d3748] transition-transform hover:scale-[1.02] min-w-0">
                  <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div
                      style={{
                        minWidth: `${Math.max(dailyWinnersData.length, 1) * BAR_WIDTH}px`,
                      }}
                    >
                      <ResponsiveContainer width="100%" height={400}>
                        <RechartsBarChart
                          data={dailyWinnersData}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#374151"
                          />
                          <XAxis dataKey="date" stroke="#cbd5e1" />
                          <YAxis stroke="#cbd5e1" />
                          <Tooltip
                            contentStyle={{
                              background: "#1f2937",
                              border: "none",
                              color: "#fff",
                            }}
                          />
                          <Legend wrapperStyle={{ color: "#fff" }} />
                          <Bar
                            dataKey="straightWinners"
                            fill="#fbbf24"
                            name="Straight Winners"
                          />
                          <Bar
                            dataKey="rambolitoWinners"
                            fill="#35e94d"
                            name="Ramble Winners"
                          />
                          <Bar
                            dataKey="monthlyBracketWinners"
                            fill="#60a5fa"
                            name="Monthly Bracket Winners"
                          />
                          <Bar
                            dataKey="petsadaWinners"
                            fill="#e91857"
                            name="Petsada Winners"
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default TwoDCard;
