import { createBrowserRouter, Navigate } from "react-router-dom";
import Login from "./pages/login";
import AgentsPage from "./pages/agents";
import CreateAgentPage from "./pages/agents/create";
import UpdateAgentPage from "./pages/agents/update";
import LottoTypesPage from "./pages/settings/lottoTypes";
import CreateLottoTypePage from "./pages/settings/lottoTypes/create";
import UpdateLottoTypePage from "./pages/settings/lottoTypes/update";

import BetTypesPage from "./pages/settings/betTypes";
import CreateBetTypePage from "./pages/settings/betTypes/create";
import UpdateBetTypePage from "./pages/settings/betTypes/update";
import RolesPage from "./pages/settings/roles";
import BetPrizesPage from "./pages/settings/betPrizes";
import CreateBetPrizePage from "./pages/settings/betPrizes/create";
import CreateRolePage from "./pages/settings/roles/create";
import UpdateRolePage from "./pages/settings/roles/update";
import ResultsPage from "./pages/results";
import CreateResultPage from "./pages/results/create";
import ConfigurationSettingsPage from "./pages/settings/configuration";
import MyProfilePage from "./pages/profile";
import BetsPage from "./pages/bets";
import DummyBetsPage from "./pages/dummybets";
import ResultsDetailsPage from "./pages/results/details";
import SummaryPage from "./pages/summary";
import NotificationsPage from "./pages/notifications";
import DummyResultsPage from "./pages/dummyresults";
import DummyResultDetailsPage from "./pages/dummyresults/details";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/summary" replace /> },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/summary",
    element: <SummaryPage />,
  },
  {
    path: "/notifications",
    element: <NotificationsPage />,
  },
  {
    path: "/agents",
    element: <AgentsPage />,
  },
  {
    path: "/agents/create",
    element: <CreateAgentPage />,
  },
  {
    path: "/agents/update/:userId",
    element: <UpdateAgentPage />,
  },
  {
    path: "/settings/lotto-types",
    element: <LottoTypesPage />,
  },
  {
    path: "/settings/lotto-types/create",
    element: <CreateLottoTypePage />,
  },
  {
    path: "/settings/lotto-types/update/:lottoTypeId",
    element: <UpdateLottoTypePage />,
  },
  {
    path: "/settings/bet-types",
    element: <BetTypesPage />,
  },
  {
    path: "/settings/bet-types/create",
    element: <CreateBetTypePage />,
  },
  {
    path: "/settings/bet-types/update/:betTypeId",
    element: <UpdateBetTypePage />,
  },
  {
    path: "/settings/bet-prizes",
    element: <BetPrizesPage />,
  },
  {
    path: "/settings/bet-prizes/create",
    element: <CreateBetPrizePage />,
  },
  {
    path: "/settings/roles",
    element: <RolesPage />,
  },
  {
    path: "/settings/roles/create",
    element: <CreateRolePage />,
  },
  {
    path: "/settings/roles/update/:roleId",
    element: <UpdateRolePage />,
  },
  {
    path: "/settings/configuration",
    element: <ConfigurationSettingsPage />,
  },
  {
    path: "/results",
    element: <ResultsPage />,
  },
  {
    path: "/results/create",
    element: <CreateResultPage />,
  },
  {
    path: "/profile",
    element: <MyProfilePage />,
  },
  {
    path: "/bets",
    element: <BetsPage />,
  },
  {
    path: "/dummy-bets",
    element: <DummyBetsPage />,
  },
  {
    path: "/dummy-results",
    element: <DummyResultsPage />,
  },
  {
    path: "/dummy-results/details/:resultId",
    element: <DummyResultDetailsPage />,
  },
  {
    path: "/results/details/:resultId",
    element: <ResultsDetailsPage />,
  },
]);
