import { interventions } from "./interventions";
import { bingoSets } from "./bingoSets";
import { triviaSets } from "./triviaSets";
import { worksheetStarters } from "./worksheetStarters";
import { assertUniqueResourceIds } from "../../models";

export const resources = assertUniqueResourceIds([
  ...interventions,
  ...bingoSets,
  ...triviaSets,
  ...worksheetStarters,
]);
