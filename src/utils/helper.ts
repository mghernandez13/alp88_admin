import { SUPER_ADMIN_EMAIL } from "../types/constants";

// Formats a date string (YYYY-MM-DD or ISO) to 'Month Day, Year' (e.g., January 20, 2926)
export const formatDrawDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatDateTime12h = (dateTimeStr: string): string => {
  if (!dateTimeStr) return "";
  const date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) return dateTimeStr;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const capitalizeFirstLetter = (str: string) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getUrlParameter = (urlParam: string) => {
  const urlParams = new URLSearchParams(window.location.search);
  const param = urlParams.get(urlParam);

  return param;
};

export const getPaginationRange = (current: number, total: number) => {
  const delta = 2; // How many pages to show on either side of current
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - delta && i <= current + delta)
    ) {
      range.push(i);
    }
  }

  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push("...");
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
};

export const isAdmin = (role: string) => {
  return ["super_admin", "admin"].includes(role);
};

export const formatTo12h = (time: string) => {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (isNaN(h) || isNaN(m)) return time;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
};

export const getTimes = () => {
  const list: { label: string; value: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
      const value = `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}`;
      list.push({ label, value });
    }
  }
  return list;
};

export const isValueNumeric = (value: string) => {
  return /^\d+$/.test(value);
};

export const isSuperAdmin = (email: string | undefined): boolean => {
  return email === SUPER_ADMIN_EMAIL;
};

export const normalizeSingleRelation = <T>(value: T | T[] | null): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
};

export const compareText = (
  left: string,
  right: string,
  ascending: boolean,
) => {
  const comparison = left.localeCompare(right, undefined, {
    sensitivity: "base",
    numeric: true,
  });
  return ascending ? comparison : -comparison;
};

export const compareNumber = (
  left: number,
  right: number,
  ascending: boolean,
) => (ascending ? left - right : right - left);
