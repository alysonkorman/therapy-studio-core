import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import {
  captureCognitoHostToken,
  consumePostLoginPath,
} from "./features/live-sessions/liveSessionHostAuth";
import "./index.css";
import "./styles/design-system.css";
import { router } from "./app/router";
import ErrorBoundary from "./shared/components/ErrorBoundary";

const capturedHostToken = captureCognitoHostToken();
const postLoginPath = capturedHostToken ? consumePostLoginPath() : null;
if (postLoginPath && window.location.pathname !== postLoginPath) {
  window.location.replace(postLoginPath);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </React.StrictMode>
);
