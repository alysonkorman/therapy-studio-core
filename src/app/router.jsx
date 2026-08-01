import { createBrowserRouter } from "react-router-dom";

import ClientsPage from "../features/clients/ClientsPage";
import DashboardPage from "../features/dashboard/DashboardPage";
import GamesPage from "../features/games/GamesPage";
import InterventionsPage from "../features/interventions/InterventionsPage";
import PromptsPage from "../features/prompts/PromptsPage";
import SceneBuilderPage from "../features/scene-builder/SceneBuilderPage";
import SettingsPage from "../features/settings/SettingsPage";
import WhiteboardPage from "../features/whiteboard/WhiteboardPage";
import WorkbooksPage from "../features/workbooks/WorkbooksPage";
import WorksheetsPage from "../features/worksheets/WorksheetsPage";
import AppLayout from "../layouts/AppLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "prompts",
        element: <PromptsPage />,
      },
      {
        path: "interventions",
        element: <InterventionsPage />,
      },
      {
        path: "games",
        element: <GamesPage />,
      },
      {
        path: "worksheets",
        element: <WorksheetsPage />,
      },
      {
        path: "workbooks",
        element: <WorkbooksPage />,
      },
      {
        path: "whiteboard",
        element: <WhiteboardPage />,
      },
      {
        path: "scene-builder",
        element: <SceneBuilderPage />,
      },
      {
        path: "clients",
        element: <ClientsPage />,
      },
      {
        path: "saved",
        element: (
          <div>
            <h1>Saved</h1>
            <p>Coming soon.</p>
          </div>
        ),
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
]);
