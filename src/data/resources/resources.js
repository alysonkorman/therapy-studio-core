import { interventions } from "./interventions";
import { promptDecks } from "./promptDecks";
import { worksheetStarters } from "./worksheetStarters";
import { assertUniqueResourceIds } from "../../models";

export const resources = assertUniqueResourceIds([
  ...promptDecks,
  ...interventions,
  ...worksheetStarters,
]);
