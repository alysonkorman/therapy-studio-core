import promptExport from "../../../imports/therapy-toolkit-prompts.json";
import { importPromptDecks } from "../../engines/prompts/importPromptDecks";

export const promptDecks = importPromptDecks(promptExport);
