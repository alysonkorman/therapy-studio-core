import { createBrowserRouter } from "react-router-dom";

import ClientsPage from "../features/clients/ClientsPage";
import LiveSessionParticipantPage from "../features/live-sessions/LiveSessionParticipantPage";
import DashboardPage from "../features/dashboard/DashboardPage";
import GamesPage from "../features/games/GamesPage";
import TriviaGamePage from "../features/games/TriviaGamePage";
import TriviaEditorPage from "../features/games/TriviaEditorPage";
import InterventionsPage from "../features/interventions/InterventionsPage";
import InterventionEditorPage from "../features/interventions/InterventionEditorPage";
import InterventionDetailPage from "../features/interventions/InterventionDetailPage";
import NotFoundPage from "../features/not-found/NotFoundPage";
import PromptDeckPage from "../features/prompts/PromptDeckPage";
import PromptsPage from "../features/prompts/PromptsPage";
import SavedPage from "../features/saved/SavedPage";
import SceneBuilderPage from "../features/scene-builder/SceneBuilderPage";
import SettingsPage from "../features/settings/SettingsPage";
import WhiteboardPage from "../features/whiteboard/WhiteboardPage";
import WorkbooksPage from "../features/workbooks/WorkbooksPage";
import WorksheetsPage from "../features/worksheets/WorksheetsPage";
import WorksheetBuilderPage from "../features/worksheets/WorksheetBuilderPage";
import WorksheetDetailPage from "../features/worksheets/WorksheetDetailPage";
import WorksheetPreviewPage from "../features/worksheets/WorksheetPreviewPage";
import WorksheetSessionPage from "../features/worksheets/WorksheetSessionPage";
import AppLayout from "../layouts/AppLayout";
import { ErrorFallback } from "../shared/components/ErrorBoundary";

function workspaceLabRoute() {
  return {
    path: "workspace-lab",
    lazy: async () => {
      const { default: Component } =
        await import("../features/collaborative-workspace/CollaborativeWorkspacePrototype");
      return { Component };
    },
  };
}

export function createAppRoutes({ enableWorkspaceLab = import.meta.env.DEV } = {}) {
  return [
    {
      path: "/join/:sessionId",
      element: <LiveSessionParticipantPage />,
      errorElement: <ErrorFallback />,
    },
    {
      path: "/",
      element: <AppLayout />,
      errorElement: <ErrorFallback />,
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
          path: "prompts/:deckId",
          element: <PromptDeckPage />,
        },
        {
          path: "interventions",
          element: <InterventionsPage />,
        },
        {
          path: "interventions/:interventionId/edit",
          element: <InterventionEditorPage />,
        },
        {
          path: "interventions/:interventionId",
          element: <InterventionDetailPage />,
        },
        {
          path: "games",
          element: <GamesPage />,
        },
        {
          path: "games/:gameId",
          element: <TriviaGamePage />,
        },
        {
          path: "games/:gameId/edit",
          element: <TriviaEditorPage />,
        },
        {
          path: "worksheets",
          element: <WorksheetsPage />,
        },
        {
          path: "worksheets/:worksheetId",
          element: <WorksheetDetailPage />,
        },
        {
          path: "worksheets/:worksheetId/build",
          element: <WorksheetBuilderPage />,
        },
        {
          path: "worksheets/:worksheetId/preview",
          element: <WorksheetPreviewPage />,
        },
        {
          path: "worksheets/:worksheetId/session",
          element: <WorksheetSessionPage />,
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
        ...(enableWorkspaceLab ? [workspaceLabRoute()] : []),
        {
          path: "clients",
          element: <ClientsPage />,
        },
        {
          path: "saved",
          element: <SavedPage />,
        },
        {
          path: "settings",
          element: <SettingsPage />,
        },
        {
          path: "*",
          element: <NotFoundPage />,
        },
      ],
    },
  ];
}

export const appRoutes = createAppRoutes();

export const router = createBrowserRouter(appRoutes);
