import {
  createTriviaExportJson,
  triviaExportFilename,
} from "../../engines/games/importExportTrivia";

export function downloadTriviaSet(game) {
  const blob = new Blob([createTriviaExportJson(game)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = triviaExportFilename(game.title);
  anchor.click();
  URL.revokeObjectURL(url);
}
