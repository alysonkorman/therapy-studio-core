import { interventions } from "./interventions";
import { promptDecks } from "./promptDecks";
import { triviaSets } from "./triviaSets";
import { worksheetStarters } from "./worksheetStarters";
import { assertUniqueResourceIds } from "../../models";

export const resources = assertUniqueResourceIds([
  ...promptDecks,
  ...interventions,
  ...triviaSets,
  ...worksheetStarters,
]);
