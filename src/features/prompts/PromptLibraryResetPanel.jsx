import { useState } from "react";

import {
  liveSessionLoginUrl,
  rememberPostLoginPath,
} from "../live-sessions/liveSessionHostAuth";
import { downloadPromptLibraryRecovery } from "./downloadPromptLibraryRecovery";

export default function PromptLibraryResetPanel({ authoring }) {
  const [preview, setPreview] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");

  async function reviewReset() {
    setMessage("");
    try {
      const snapshot =
        await authoring.repositories.decks.createPromptLibraryRecoverySnapshot();
      downloadPromptLibraryRecovery(snapshot);
      const nextPreview = await authoring.repositories.decks.previewPromptLibraryReset();
      setPreview(nextPreview);
      setConfirming(true);
    } catch {
      setMessage(
        "The recovery file could not be created. Your Prompt Library was not changed."
      );
    }
  }

  async function reset() {
    setResetting(true);
    setMessage("");
    try {
      await authoring.run(() => authoring.repositories.decks.resetPromptLibrary());
      setConfirming(false);
      setMessage("Your Prompt Library is empty. New decks will be account-owned.");
    } catch {
      // The shared authoring error remains the primary visible error message.
    } finally {
      setResetting(false);
    }
  }

  function signInToCompleteReset() {
    const login = liveSessionLoginUrl();
    if (!login) {
      setMessage(
        "Account sign-in is not configured. Your Prompt Library was not changed."
      );
      return;
    }
    rememberPostLoginPath("/prompts");
    window.location.assign(login);
  }

  const canReset =
    preview?.syncStatus === "saved" && !preview?.conflictCount && !preview?.unsyncedCount;

  return (
    <section
      aria-labelledby="prompt-library-reset-title"
      className="prompt-library-reset"
    >
      <div>
        <h3 id="prompt-library-reset-title">Reset Prompt Library</h3>
        <p>
          Retire the bundled starters for this account and remove every current Prompt
          deck from the active library. Categories are unchanged. This does not remove the
          bundled source from Git.
        </p>
      </div>
      {!confirming ? (
        <button
          className="button-destructive"
          onClick={() => void reviewReset()}
          type="button"
        >
          Review reset
        </button>
      ) : (
        <div className="prompt-library-reset__confirmation" role="alert">
          <p>
            This will remove {preview?.activeDeckCount ?? 0} active and{" "}
            {preview?.archivedDeckCount ?? 0} archived local Prompt decks, retire all{" "}
            {preview?.bundledStarterCount ?? 0} bundled starters for this account, and
            remove Prompt references from playlists. Categories and other Therapy Studio
            resources are unchanged.
          </p>
          <p>
            The retirement is synced to your account so another signed-in browser will not
            reseed the old starter library.
          </p>
          <p>
            Storage check: {preview?.accountOwnedDeckCount ?? 0} account-owned ·{" "}
            {preview?.localOnlyDeckCount ?? 0} local-only · {preview?.unsyncedCount ?? 0}{" "}
            waiting to sync · {preview?.conflictCount ?? 0} conflicts.
          </p>
          {!canReset ? (
            <p>
              Sign in to your Therapy Studio account before reset can be confirmed across
              browsers.
            </p>
          ) : null}
          <div className="authoring-actions">
            <button
              className="button-destructive"
              disabled={resetting || !canReset}
              onClick={() => void reset()}
              type="button"
            >
              {resetting ? "Resetting Prompt Library…" : "Reset Prompt Library"}
            </button>
            {!canReset ? (
              <button onClick={signInToCompleteReset} type="button">
                Sign in to continue
              </button>
            ) : null}
            <button
              disabled={resetting}
              onClick={() => setConfirming(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {message ? <p aria-live="polite">{message}</p> : null}
    </section>
  );
}
