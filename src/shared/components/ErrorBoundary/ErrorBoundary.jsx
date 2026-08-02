import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

export function ErrorFallback() {
  return (
    <main className="system-message" role="alert">
      <h1>Something went wrong</h1>
      <p>Therapy Studio could not display this page.</p>
      <button onClick={() => window.location.reload()} type="button">
        Try again
      </button>
    </main>
  );
}

export default function ErrorBoundary({ children }) {
  return (
    <ReactErrorBoundary fallbackRender={() => <ErrorFallback />}>
      {children}
    </ReactErrorBoundary>
  );
}
