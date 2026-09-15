import { useLocation } from "react-router-dom";
import type { Props } from "../types/generic";
import { useEffect, useState } from "react";
import { useSidebar } from "./context/SidebarContext";
import {
  Banknote,
  ChartArea,
  ChartNoAxesColumn,
  Coins,
  NotepadText,
  Settings,
  Users2,
  Gift,
  ListOrdered,
  Ticket,
  UserCog,
  SlidersHorizontal,
} from "lucide-react";

const Sidebar = (props: Props) => {
  const { className } = props;
  const location = useLocation();
  const { pathname } = location;
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const settingsPath = [
      "/settings/lotto-types",
      "/settings/bet-types",
      "/settings/roles",
      "/settings/bet-prizes",
      "/settings/configuration",
    ];
    if (settingsPath.some((path) => pathname.includes(path))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSettings(true);
    }
  }, [pathname]);

  const { collapsed } = useSidebar();
  return (
    <div
      className={
        className +
        (collapsed
          ? " sidebar-collapsed max-w-20 w-20 transition-all duration-200 overflow-x-hidden"
          : " max-w-64 w-1/5 transition-all duration-200")
      }
    >
      <button
        data-drawer-target="default-sidebar"
        data-drawer-toggle="default-sidebar"
        aria-controls="default-sidebar"
        type="button"
        className="inline-flex items-center p-2 mt-2 ml-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
      >
        <span className="sr-only">Open sidebar</span>
        <svg
          className="w-6 h-6"
          aria-hidden="true"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            clip-rule="evenodd"
            fill-rule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
          ></path>
        </svg>
      </button>

      <aside
        id="default-sidebar"
        className="top-0 left-0 z-40 w-full h-full min-w-16 transition-transform -translate-x-full sm:translate-x-0"
        aria-label="Sidenav"
      >
        <div className="flex-col overflow-y-auto py-5 px-3 h-full border-r bg-black border-gray-700">
          <ul className="space-y-2">
            <li>
              <a
                href="/dashboard"
                className={`flex ${pathname === "/dashboard" ? `bg-[#1a1a1a]` : ``} items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group`}
              >
                <ChartArea />
                {!collapsed && <span className="ml-3">Dashboard</span>}
              </a>
            </li>
            <li>
              <a
                href="/summary"
                className={`flex ${pathname.includes("/summary") ? `bg-[#1a1a1a]` : ``} items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group`}
              >
                <ChartNoAxesColumn />
                {!collapsed && <span className="ml-3">Summary</span>}
              </a>
            </li>
            <li>
              <a
                href="/bets"
                className={`flex ${pathname.includes("/bets") ? `bg-[#1a1a1a]` : ``} items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group`}
              >
                <Banknote />
                {!collapsed && <span className="ml-3">Bets</span>}
              </a>
            </li>
            <li>
              <a
                href="/dummy-bets"
                className={`flex ${pathname.includes("/dummy-bets") ? `bg-[#1a1a1a]` : ``} items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group`}
              >
                <Coins />
                {!collapsed && <span className="ml-3">Dummy Bets</span>}
              </a>
            </li>
            <li>
              <a
                href="/results"
                className={`flex ${pathname.includes("/results") ? `bg-[#1a1a1a]` : ``} items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group`}
              >
                <NotepadText />
                {!collapsed && <span className="ml-3">Results</span>}
              </a>
            </li>
            <li>
              <a
                href="/agents"
                className={`flex ${pathname.includes("/agents") ? `bg-[#1a1a1a]` : ``} items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group`}
              >
                <Users2 />
                {!collapsed && <span className="ml-3">Agents</span>}
              </a>
            </li>
            <li>
              <button
                type="button"
                className="flex items-center p-2 w-full text-base font-normal bg-black text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                onClick={() => setShowSettings(!showSettings)}
                aria-controls="dropdown-authentication"
                data-collapse-toggle="dropdown-authentication"
              >
                <Settings />
                {!collapsed && (
                  <>
                    <span className="flex-1 ml-3 text-left whitespace-nowrap">
                      Settings
                    </span>
                    <svg
                      aria-hidden="true"
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </>
                )}
              </button>
              <ul
                id="dropdown-authentication"
                className={`${!showSettings ? `hidden` : ``} py-2 space-y-2`}
              >
                <li>
                  <a
                    href="/settings/bet-prizes"
                    className={`flex ${pathname.includes("/settings/bet-prizes") ? `bg-[#1a1a1a]` : ``} items-center p-2 ${collapsed ? "pl-2" : "pl-11"} w-full text-base font-normal text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700`}
                  >
                    <Gift className="w-5 h-5 mr-2" />
                    {!collapsed && "Bet Prizes"}
                  </a>
                </li>
                <li>
                  <a
                    href="/settings/bet-types"
                    className={`flex ${pathname.includes("/settings/bet-types") ? `bg-[#1a1a1a]` : ``} items-center p-2 ${collapsed ? "pl-2" : "pl-11"} w-full text-base font-normal text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700`}
                  >
                    <ListOrdered className="w-5 h-5 mr-2" />
                    {!collapsed && "Bet Types"}
                  </a>
                </li>
                <li>
                  <a
                    href="/settings/lotto-types"
                    className={`flex ${pathname.includes("/settings/lotto-types") ? `bg-[#1a1a1a]` : ``} items-center p-2 ${collapsed ? "pl-2" : "pl-11"} w-full text-base font-normal text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700`}
                  >
                    <Ticket className="w-5 h-5 mr-2" />
                    {!collapsed && "Lotto Types"}
                  </a>
                </li>
                <li>
                  <a
                    href="/settings/roles"
                    className={`flex ${pathname.includes("/settings/roles") ? `bg-[#1a1a1a]` : ``} items-center p-2 ${collapsed ? "pl-2" : "pl-11"} w-full text-base font-normal text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700`}
                  >
                    <UserCog className="w-5 h-5 mr-2" />
                    {!collapsed && "Roles"}
                  </a>
                </li>
                <li>
                  <a
                    href="/settings/configuration"
                    className={`flex ${pathname.includes("/settings/configuration") ? `bg-[#1a1a1a]` : ``} items-center p-2 ${collapsed ? "pl-2" : "pl-11"} w-full text-base font-normal text-gray-900 rounded-lg transition duration-75 group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700`}
                  >
                    <SlidersHorizontal className="w-5 h-5 mr-2" />
                    {!collapsed && "Configuration"}
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
};
export default Sidebar;
