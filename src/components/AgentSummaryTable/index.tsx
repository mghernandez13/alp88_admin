import type { SummaryProps } from "../../types/generic";
import { UserAuth } from "../context/AuthContext";
import type {
  AgentRow,
  LottoQueryData,
  LottoQueryVariables,
} from "../../types/api";
import { SUPER_ADMIN_EMAIL } from "../../types/constants";
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "../../db/supabase";
import LoadingSpinner from "../LoadingSpinner";
import PrimaryButton from "../generic/buttons/Primary";
import { generateExcelFile } from "../../utils/excel";
import { getDayNameFromDateString } from "../../utils/datetime";
import { useQuery } from "@apollo/client/react";
import { GET_LOTTO_TYPES } from "../../graphql/queries/lotto";

type DrawSlot = "2PM" | "5PM" | "9PM";

type BetSlot = { sbets: number; rbets: number; amount: number };

type EdgeStats = {
  overallTotal: number;
  remittances: {
    lp3: { amount: number };
    twoD: Record<DrawSlot, { amount: number }>;
    threeD: Record<DrawSlot, { amount: number }>;
    total: { amount: number };
  };
  lp3: { netAmount: number };
  twoD: Record<DrawSlot | "net", BetSlot>;
  threeD: Record<DrawSlot | "net", BetSlot>;
};

type EdgeProfile = {
  id: string;
  full_name: string | null;
  remittance_percent: number | null;
  upline?: string | null;
};

type AgentHierarchyProfile = {
  id: string;
  full_name: string | null;
  upline: string | null;
  remittance_percent: number | null;
};

type EdgeRow = {
  type: string;
  headAdmin?: EdgeProfile;
  admin?: EdgeProfile;
  stats: EdgeStats;
};

const pct = (n: number | null | undefined) => (n != null ? `${n}%` : "60%");
const fmt = (n: number) => n.toLocaleString();
const getRemittancePercent = (n: number | null | undefined) => n ?? 60;
const getRemittanceAmountFromPercent = (
  total: number,
  remittancePercent: number | null | undefined,
) => total * (getRemittancePercent(remittancePercent) / 100);
const bfmt = (s: EdgeStats, g: "twoD" | "threeD", slot: DrawSlot | "net") =>
  `${s[g][slot].sbets} | ${s[g][slot].rbets}`;

const mkZ = (): BetSlot => ({ sbets: 0, rbets: 0, amount: 0 });

const sumRows = (rows: EdgeRow[]): EdgeStats => {
  const t: EdgeStats = {
    overallTotal: 0,
    remittances: {
      lp3: { amount: 0 },
      twoD: {
        "2PM": { amount: 0 },
        "5PM": { amount: 0 },
        "9PM": { amount: 0 },
      },
      threeD: {
        "2PM": { amount: 0 },
        "5PM": { amount: 0 },
        "9PM": { amount: 0 },
      },
      total: { amount: 0 },
    },
    lp3: { netAmount: 0 },
    twoD: { "2PM": mkZ(), "5PM": mkZ(), "9PM": mkZ(), net: mkZ() },
    threeD: { "2PM": mkZ(), "5PM": mkZ(), "9PM": mkZ(), net: mkZ() },
  };
  for (const r of rows) {
    const s = r.stats;
    t.overallTotal += s.overallTotal;
    t.remittances.total.amount += s.remittances.total.amount;
    t.remittances.lp3.amount += s.remittances.lp3.amount;
    t.lp3.netAmount += s.lp3.netAmount;
    for (const sl of ["2PM", "5PM", "9PM"] as DrawSlot[]) {
      t.remittances.twoD[sl].amount += s.remittances.twoD[sl].amount;
      t.remittances.threeD[sl].amount += s.remittances.threeD[sl].amount;
      t.twoD[sl].sbets += s.twoD[sl].sbets;
      t.twoD[sl].rbets += s.twoD[sl].rbets;
      t.twoD[sl].amount += s.twoD[sl].amount;
      t.threeD[sl].sbets += s.threeD[sl].sbets;
      t.threeD[sl].rbets += s.threeD[sl].rbets;
      t.threeD[sl].amount += s.threeD[sl].amount;
    }
    t.twoD.net.sbets += s.twoD.net.sbets;
    t.twoD.net.rbets += s.twoD.net.rbets;
    t.twoD.net.amount += s.twoD.net.amount;
    t.threeD.net.sbets += s.threeD.net.sbets;
    t.threeD.net.rbets += s.threeD.net.rbets;
    t.threeD.net.amount += s.threeD.net.amount;
  }
  return t;
};

const toExportRow = (
  headAdminName: string,
  adminName: string,
  remittancePercent: number | null | undefined,
  s: EdgeStats,
  options?: {
    remittanceAllOverride?: number;
    level1Name?: string;
    level2Name?: string;
  },
): Record<string, number | string> => {
  const percent = getRemittancePercent(remittancePercent);
  const remittanceAll =
    options?.remittanceAllOverride ?? s.remittances.total.amount;

  return {
    "Head Admin": headAdminName,
    Admin: adminName,
    "Level 1": options?.level1Name ?? "",
    "Level 2": options?.level2Name ?? "",
    "Total Overall": s.overallTotal,
    "%": percent,
    "Remittance ALL": remittanceAll,
    "Remittance LP3": s.remittances.lp3.amount,
    "Remittance 2D 2PM": s.remittances.twoD["2PM"].amount,
    "Remittance 2D 5PM": s.remittances.twoD["5PM"].amount,
    "Remittance 2D 9PM": s.remittances.twoD["9PM"].amount,
    "Remittance 3D 2PM": s.remittances.threeD["2PM"].amount,
    "Remittance 3D 5PM": s.remittances.threeD["5PM"].amount,
    "LP3 6/55 9PM Amount": s.lp3.netAmount,
    "3D 2PM Bets (S|R)": `${s.threeD["2PM"].sbets} | ${s.threeD["2PM"].rbets}`,
    "3D 2PM Amount": s.threeD["2PM"].amount,
    "3D 5PM Bets (S|R)": `${s.threeD["5PM"].sbets} | ${s.threeD["5PM"].rbets}`,
    "3D 5PM Amount": s.threeD["5PM"].amount,
    "3D 9PM Bets (S|R)": `${s.threeD["9PM"].sbets} | ${s.threeD["9PM"].rbets}`,
    "3D 9PM Amount": s.threeD["9PM"].amount,
    "3D Net Bets (S|R)": `${s.threeD.net.sbets} | ${s.threeD.net.rbets}`,
    "3D Net Amount": s.threeD.net.amount,
    "2D 2PM Bets (S|R)": `${s.twoD["2PM"].sbets} | ${s.twoD["2PM"].rbets}`,
    "2D 2PM Amount": s.twoD["2PM"].amount,
    "2D 5PM Bets (S|R)": `${s.twoD["5PM"].sbets} | ${s.twoD["5PM"].rbets}`,
    "2D 5PM Amount": s.twoD["5PM"].amount,
    "2D 9PM Bets (S|R)": `${s.twoD["9PM"].sbets} | ${s.twoD["9PM"].rbets}`,
    "2D 9PM Amount": s.twoD["9PM"].amount,
    "2D Net Bets (S|R)": `${s.twoD.net.sbets} | ${s.twoD.net.rbets}`,
    "2D Net Amount": s.twoD.net.amount,
  };
};

const AgentSummaryTable = ({ selectedDate }: SummaryProps) => {
  const { session } = UserAuth();
  const userId = session?.user?.id as string | undefined;
  const [loading, setLoading] = useState(false);
  const [agentRows, setAgentRows] = useState<AgentRow[]>([]);
  const [agentHierarchyProfiles, setAgentHierarchyProfiles] = useState<
    AgentHierarchyProfile[]
  >([]);
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);

  const day = getDayNameFromDateString(selectedDate);

  // Fetch lotto types for dropdown
  const { data: lottoTypesData, loading: lp3Loading } = useQuery<
    LottoQueryData,
    LottoQueryVariables
  >(GET_LOTTO_TYPES, {
    variables: {
      first: 1,
      offset: 0,
      filter: {
        and: [
          { game_type: { eq: "LP3" } },
          { is_archive: { eq: false } },
          { is_active: { eq: true } },
          { days_active: { contains: [day] } },
        ],
      },
      sortOrder: [{ name: "AscNullsFirst" }],
    },
    fetchPolicy: "network-only",
  });

  const selectedLottoType =
    lottoTypesData?.lotto_typesCollection?.edges?.[0]?.node;

  const compareAgentProfiles = (
    a: { full_name?: string | null; email?: string | null } | undefined,
    b: { full_name?: string | null; email?: string | null } | undefined,
  ) => {
    const normalize = (value?: string | null) =>
      (value ?? "").trim().toLowerCase();
    const isSuperAdmin = (profile?: {
      full_name?: string | null;
      email?: string | null;
    }) =>
      profile?.email === SUPER_ADMIN_EMAIL ||
      normalize(profile?.full_name) === "super admin";

    const aIsSuper = isSuperAdmin(a);
    const bIsSuper = isSuperAdmin(b);

    if (aIsSuper !== bIsSuper) {
      return aIsSuper ? -1 : 1;
    }

    const aName = normalize(a?.full_name);
    const bName = normalize(b?.full_name);

    if (aName === bName) return 0;
    return aName.localeCompare(bName);
  };

  const groups = useMemo(
    () =>
      (agentRows as unknown as EdgeRow[])
        .reduce<Array<{ headAdmin: EdgeRow; admins: EdgeRow[] }>>(
          (acc, row) => {
            if (row.type === "headAdmin") {
              acc.push({ headAdmin: row, admins: [] });
            } else if (row.type === "admin" && acc.length > 0) {
              acc[acc.length - 1].admins.push(row);
            }
            return acc;
          },
          [],
        )
        .map((group) => ({
          ...group,
          admins: [...group.admins].sort((a, b) =>
            compareAgentProfiles(a.admin, b.admin),
          ),
        }))
        .sort((a, b) => compareAgentProfiles(a.headAdmin.headAdmin, b.headAdmin.headAdmin)),
    [agentRows],
  );

  const grandTotalStats = useMemo(() => {
    if (groups.length === 0) return null;

    return sumRows(
      groups.flatMap((group) => [group.headAdmin, ...group.admins]),
    );
  }, [groups]);

  const loggedInUserRemittancePercent = useMemo(
    () =>
      agentHierarchyProfiles.find((profile) => profile.id === userId)
        ?.remittance_percent ?? 60,
    [agentHierarchyProfiles, userId],
  );

  // Depth relative to the team's head admin: 1 = Admin, 2 = Level 1, 3+ = Level 2.
  const getAgentDepth = (
    profileId: string | null | undefined,
    headAdminId: string | null | undefined,
  ) => {
    if (!profileId || !headAdminId) return 1;

    let depth = 0;
    let currentId: string | null | undefined = profileId;
    const visited = new Set<string>();

    while (currentId && currentId !== headAdminId && !visited.has(currentId)) {
      visited.add(currentId);
      depth++;
      currentId = agentHierarchyProfiles.find(
        (profile) => String(profile.id) === String(currentId),
      )?.upline;
    }

    return depth || 1;
  };

  const renderDataRow = (
    row: EdgeRow,
    isHead: boolean,
    teamId: string,
    headAdminId?: string,
  ) => {
    const profile = isHead ? row.headAdmin : row.admin;
    const s = row.stats;
    const td = "px-2 py-2 whitespace-nowrap";
    const isHovered = hoveredTeamId === teamId;
    const depth = isHead ? 0 : getAgentDepth(profile?.id, headAdminId);
    return (
      <tr
        key={profile?.id}
        className={[
          isHead ? "font-semibold" : "",
          isHovered ? "bg-[#222910]" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onMouseEnter={() => setHoveredTeamId(teamId)}
        onMouseLeave={() =>
          setHoveredTeamId((current) => (current === teamId ? null : current))
        }
      >
        <td className="px-4 py-2">
          {isHead ? (profile?.full_name ?? "—") : ""}
        </td>
        <td className="px-4 py-2">
          {!isHead && depth === 1 ? (profile?.full_name ?? "—") : ""}
        </td>
        <td className="px-4 py-2">
          {!isHead && depth === 2 ? (profile?.full_name ?? "—") : ""}
        </td>
        <td className="px-4 py-2">
          {!isHead && depth >= 3 ? (profile?.full_name ?? "—") : ""}
        </td>
        <td className="px-4 py-2">{fmt(s.overallTotal)}</td>
        <td className="px-4 py-2">{pct(profile?.remittance_percent)}</td>
        <td className={td}>{fmt(s.remittances.total.amount)}</td>
        <td className={td}>{fmt(s.remittances.lp3.amount)}</td>
        <td className={td}>{fmt(s.remittances.twoD["2PM"].amount)}</td>
        <td className={td}>{fmt(s.remittances.twoD["5PM"].amount)}</td>
        <td className={td}>{fmt(s.remittances.twoD["9PM"].amount)}</td>
        <td className={td}>{fmt(s.remittances.threeD["2PM"].amount)}</td>
        <td className={td}>{fmt(s.remittances.threeD["5PM"].amount)}</td>
        <td className={td}>{fmt(s.lp3.netAmount)}</td>
        <td className={td}>{bfmt(s, "threeD", "2PM")}</td>
        <td className={td}>{fmt(s.threeD["2PM"].amount)}</td>
        <td className={td}>{bfmt(s, "threeD", "5PM")}</td>
        <td className={td}>{fmt(s.threeD["5PM"].amount)}</td>
        <td className={td}>{bfmt(s, "threeD", "9PM")}</td>
        <td className={td}>{fmt(s.threeD["9PM"].amount)}</td>
        <td className={td}>{bfmt(s, "threeD", "net")}</td>
        <td className={td}>{fmt(s.threeD.net.amount)}</td>
        <td className={td}>{bfmt(s, "twoD", "2PM")}</td>
        <td className={td}>{fmt(s.twoD["2PM"].amount)}</td>
        <td className={td}>{bfmt(s, "twoD", "5PM")}</td>
        <td className={td}>{fmt(s.twoD["5PM"].amount)}</td>
        <td className={td}>{bfmt(s, "twoD", "9PM")}</td>
        <td className={td}>{fmt(s.twoD["9PM"].amount)}</td>
        <td className={td}>{bfmt(s, "twoD", "net")}</td>
        <td className={td}>{fmt(s.twoD.net.amount)}</td>
      </tr>
    );
  };

  const handleDownloadAgentSummary = () => {
    if (groups.length === 0) return;

    const exportRows: Record<string, number | string>[] = [];

    for (const group of groups) {
      const headAdmin = group.headAdmin.headAdmin;
      const headName = headAdmin?.full_name ?? "—";
      const teamStats = sumRows([group.headAdmin, ...group.admins]);

      exportRows.push(
        toExportRow(
          headName,
          "",
          headAdmin?.remittance_percent,
          group.headAdmin.stats,
        ),
      );

      for (const adminRow of group.admins) {
        const adminName = adminRow.admin?.full_name ?? "—";
        const depth = getAgentDepth(adminRow.admin?.id, headAdmin?.id);
        exportRows.push(
          toExportRow(
            "",
            depth === 1 ? adminName : "",
            adminRow.admin?.remittance_percent,
            adminRow.stats,
            {
              level1Name: depth === 2 ? adminName : "",
              level2Name: depth >= 3 ? adminName : "",
            },
          ),
        );
      }

      const teamTotalRemittance = getRemittanceAmountFromPercent(
        teamStats.overallTotal,
        headAdmin?.remittance_percent,
      );

      exportRows.push(
        toExportRow(
          "TEAM TOTAL OVERALL",
          "",
          headAdmin?.remittance_percent,
          teamStats,
          { remittanceAllOverride: teamTotalRemittance },
        ),
      );
    }

    if (grandTotalStats) {
      exportRows.push(
        toExportRow(
          "GRAND TOTAL OVERALL",
          "",
          loggedInUserRemittancePercent,
          grandTotalStats,
          {
            remittanceAllOverride: getRemittanceAmountFromPercent(
              grandTotalStats.overallTotal,
              loggedInUserRemittancePercent,
            ),
          },
        ),
      );
    }

    generateExcelFile(exportRows, `agent_summary_${selectedDate}`);
  };

  useEffect(() => {
    let cancelled = false;

    const loadAgentRows = async () => {
      if (!userId) {
        if (!cancelled) setAgentRows([]);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke(
          "agent-summary-rows",
          {
            body: { date: selectedDate },
          },
        );

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setAgentRows(Array.isArray(data) ? (data as AgentRow[]) : []);
        }
      } catch (error) {
        console.error("Failed to fetch agent summary rows:", error);
        if (!cancelled) {
          setAgentRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadAgentRows();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, userId]);

  useEffect(() => {
    let cancelled = false;

    const loadHierarchyProfiles = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, upline, remittance_percent, is_archive")
        .eq("is_archive", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch agent hierarchy profiles:", error);
        if (!cancelled) {
          setAgentHierarchyProfiles([]);
        }
        return;
      }

      if (!cancelled) {
        setAgentHierarchyProfiles((data ?? []) as AgentHierarchyProfile[]);
      }
    };

    void loadHierarchyProfiles();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-10">
      <div className="flex justify-end items-center mb-4">
        <PrimaryButton
          onClick={handleDownloadAgentSummary}
          disabled={loading || groups.length === 0}
        >
          Download Agent Summary
        </PrimaryButton>
      </div>
      <div
        className="overflow-x-auto rounded-lg border border-gray-700"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <table className="min-w-[1200px] text-sm text-left text-gray-300">
          <thead className="sticky top-0 z-20 bg-[#222222] text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-2" rowSpan={3}>
                Head Admin
              </th>
              <th className="px-4 py-2" rowSpan={3}>
                Admin
              </th>
              <th className="px-4 py-2" rowSpan={3}>
                Level 1
              </th>
              <th className="px-4 py-2" rowSpan={3}>
                Level 2
              </th>
              <th className="px-4 py-2" rowSpan={3}>
                Total Overall
              </th>
              <th className="px-4 py-2" rowSpan={3}>
                %
              </th>
              <th className="px-4 py-2 text-center" colSpan={7} rowSpan={1}>
                Remittance
              </th>
              <th className="px-4 py-2 text-center" colSpan={1} rowSpan={1}>
                LP3
              </th>
              <th className="px-4 py-2 text-center" colSpan={8}>
                3D
              </th>
              <th className="px-4 py-2 text-center" colSpan={8}>
                2D
              </th>
            </tr>
            <tr>
              <th className="px-2 py-2" rowSpan={2}>
                ALL
              </th>
              <th className="px-2 py-2" rowSpan={2}>
                LP3
              </th>
              <th className="px-2 py-2" rowSpan={2}>
                2D 2PM
              </th>
              <th className="px-2 py-2" rowSpan={2}>
                2D 5PM
              </th>
              <th className="px-2 py-2" rowSpan={2}>
                2D 9PM
              </th>
              <th className="px-2 py-2" rowSpan={2}>
                3D 2PM
              </th>
              <th className="px-2 py-2" rowSpan={2}>
                3D 5PM
              </th>
              <th
                className="px-2 py-2"
                style={{ textAlign: "center" }}
                rowSpan={1}
              >
                {lp3Loading
                  ? "LP3 Draw Today"
                  : (selectedLottoType?.name ?? "LP3 Draw Today")}
              </th>
              <th className="px-2 py-2" colSpan={2}>
                3D 2PM
              </th>
              <th className="px-2 py-2" colSpan={2}>
                3D 5PM
              </th>
              <th className="px-2 py-2" colSpan={2}>
                3D 9PM
              </th>
              <th className="px-2 py-2" colSpan={2}>
                3D Net
              </th>
              <th className="px-2 py-2" colSpan={2}>
                2D 2PM
              </th>
              <th className="px-2 py-2" colSpan={2}>
                2D 5PM
              </th>
              <th className="px-2 py-2" colSpan={2}>
                2D 9PM
              </th>
              <th className="px-2 py-2" colSpan={2}>
                2D Net
              </th>
            </tr>
            <tr>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Bets (S|R)</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Bets (S|R)</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Bets (S|R)</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Bets (S|R)</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Bets (S|R)</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Bets (S|R)</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Bets (S|R)</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Bets (S|R)</th>
              <th className="px-2 py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  className="px-4 py-3 text-center text-gray-400"
                  colSpan={30}
                >
                  <LoadingSpinner width={40} height={40} />
                </td>
              </tr>
            )}
            {!loading && agentRows.length === 0 && (
              <tr>
                <td
                  className="px-4 py-3 text-center text-gray-500"
                  colSpan={30}
                >
                  No agent rows found.
                </td>
              </tr>
            )}
            {!loading &&
              groups.map((g) => {
                const haProfile = g.headAdmin.headAdmin;
                const teamId = haProfile?.id ?? "";
                const gt = sumRows([g.headAdmin, ...g.admins]);
                const td = "px-2 py-2 whitespace-nowrap";
                const isHovered = hoveredTeamId === teamId;
                return (
                  <Fragment key={haProfile?.id ?? String(Math.random())}>
                    {renderDataRow(g.headAdmin, true, teamId)}
                    {g.admins.map((ar) => {
                      const adminTeamId = `${teamId}-${ar.admin?.id ?? ar.headAdmin?.id ?? "unknown"}`;
                      return renderDataRow(
                        ar,
                        false,
                        adminTeamId,
                        haProfile?.id,
                      );
                    })}
                    <tr
                      className={[
                        "font-bold border-t border-gray-600",
                        isHovered ? "bg-[#222910]" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onMouseEnter={() => setHoveredTeamId(teamId)}
                      onMouseLeave={() =>
                        setHoveredTeamId((current) =>
                          current === teamId ? null : current,
                        )
                      }
                    >
                      <td className="px-4 py-2" colSpan={4}>
                        TEAM TOTAL OVERALL
                      </td>
                      <td className="px-4 py-2">{fmt(gt.overallTotal)}</td>
                      <td className="px-4 py-2">
                        {pct(haProfile?.remittance_percent)}
                      </td>
                      <td className={td}>
                        {fmt(
                          getRemittanceAmountFromPercent(
                            gt.overallTotal,
                            haProfile?.remittance_percent,
                          ),
                        )}
                      </td>
                      <td className={td}>{fmt(gt.remittances.lp3.amount)}</td>
                      <td className={td}>
                        {fmt(gt.remittances.twoD["2PM"].amount)}
                      </td>
                      <td className={td}>
                        {fmt(gt.remittances.twoD["5PM"].amount)}
                      </td>
                      <td className={td}>
                        {fmt(gt.remittances.twoD["9PM"].amount)}
                      </td>
                      <td className={td}>
                        {fmt(gt.remittances.threeD["2PM"].amount)}
                      </td>
                      <td className={td}>
                        {fmt(gt.remittances.threeD["5PM"].amount)}
                      </td>
                      <td className={td}>{fmt(gt.lp3.netAmount)}</td>
                      <td className={td}>{bfmt(gt, "threeD", "2PM")}</td>
                      <td className={td}>{fmt(gt.threeD["2PM"].amount)}</td>
                      <td className={td}>{bfmt(gt, "threeD", "5PM")}</td>
                      <td className={td}>{fmt(gt.threeD["5PM"].amount)}</td>
                      <td className={td}>{bfmt(gt, "threeD", "9PM")}</td>
                      <td className={td}>{fmt(gt.threeD["9PM"].amount)}</td>
                      <td className={td}>{bfmt(gt, "threeD", "net")}</td>
                      <td className={td}>{fmt(gt.threeD.net.amount)}</td>
                      <td className={td}>{bfmt(gt, "twoD", "2PM")}</td>
                      <td className={td}>{fmt(gt.twoD["2PM"].amount)}</td>
                      <td className={td}>{bfmt(gt, "twoD", "5PM")}</td>
                      <td className={td}>{fmt(gt.twoD["5PM"].amount)}</td>
                      <td className={td}>{bfmt(gt, "twoD", "9PM")}</td>
                      <td className={td}>{fmt(gt.twoD["9PM"].amount)}</td>
                      <td className={td}>{bfmt(gt, "twoD", "net")}</td>
                      <td className={td}>{fmt(gt.twoD.net.amount)}</td>
                    </tr>
                  </Fragment>
                );
              })}
            {grandTotalStats && (
              <tr className="font-bold border-t border-gray-600 bg-[#181b10]">
                <td className="px-4 py-2" colSpan={4}>
                  GRAND TOTAL OVERALL
                </td>
                <td className="px-4 py-2">{fmt(grandTotalStats.overallTotal)}</td>
                <td className="px-4 py-2">
                  {pct(loggedInUserRemittancePercent)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(
                    getRemittanceAmountFromPercent(
                      grandTotalStats.overallTotal,
                      loggedInUserRemittancePercent,
                    ),
                  )}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.remittances.lp3.amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.remittances.twoD["2PM"].amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.remittances.twoD["5PM"].amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.remittances.twoD["9PM"].amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.remittances.threeD["2PM"].amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.remittances.threeD["5PM"].amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.lp3.netAmount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {bfmt(grandTotalStats, "threeD", "2PM")}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.threeD["2PM"].amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {bfmt(grandTotalStats, "threeD", "5PM")}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.threeD["5PM"].amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {bfmt(grandTotalStats, "threeD", "9PM")}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.threeD["9PM"].amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {bfmt(grandTotalStats, "threeD", "net")}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.threeD.net.amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {bfmt(grandTotalStats, "twoD", "2PM")}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.twoD["2PM"].amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {bfmt(grandTotalStats, "twoD", "5PM")}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.twoD["5PM"].amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {bfmt(grandTotalStats, "twoD", "9PM")}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.twoD["9PM"].amount)}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {bfmt(grandTotalStats, "twoD", "net")}
                </td>
                <td className={"px-2 py-2 whitespace-nowrap"}>
                  {fmt(grandTotalStats.twoD.net.amount)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgentSummaryTable;
