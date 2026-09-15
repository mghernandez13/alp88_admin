export const AlertColors: Record<string, string> = {
  success: "green",
  error: "red",
  info: "blue",
  warning: "yellow",
};

export type SortDirection = "AscNullsFirst" | "DescNullsLast";

export const DAYS_OF_WEEK: string[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const ADMIN_PERMISSIONS = [
  "View Bets",
  "Add Bets",
  "Edit Bets",
  "Delete Bets",
  "View Dummy Bets",
  "Add Dummy Bets",
  "Edit Dummy Bets",
  "Delete Dummy Bets",
  "View Results",
  "Add Results",
  "Edit Results",
  "Delete Results",
  "View Agents",
  "Add Agents",
  "Edit Agents",
  "Delete Agents",
  "View Bet Prizes",
  "Add Bet Prizes",
  "Edit Bet Prizes",
  "Delete Bet Prizes",
  "View Bet Types",
  "Add Bet Types",
  "Edit Bet Types",
  "Delete Bet Types",
  "View Lotto Types",
  "Add Lotto Types",
  "Edit Lotto Types",
  "Delete Lotto Types",
  "View Roles",
  "Add Roles",
  "Edit Roles",
  "Delete Roles",
  "View Configuration",
  "Edit Configuration",
  "View Admin Dashboard",
  "View Summary",
  "Can Login to Admin",
];

export const USER_PERMISSIONS = [
  "Bet Entry",
  "Dummy Bet Entry",
  "Daily Agent Report",
  "Agent Sales Report",
  "Queues",
  "Ranking",
  "Agent Logs",
];

export const GAME_TYPES = ["2D", "3D", "LP3"];

export const SUPER_ADMIN_EMAIL =
  import.meta.env.VITE_SUPERADMIN_EMAIL ?? "superadmin@alp88.online";
