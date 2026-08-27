import { getTherapyStudioDatabase } from "../../lib/data/database";
export const normalizedRegion = ({ x, y, width, height, shape = "rect" }) => ({
  x: Math.max(0, Math.min(100, x)),
  y: Math.max(0, Math.min(100, y)),
  width: Math.max(1, Math.min(100, width)),
  height: Math.max(1, Math.min(100, height)),
  shape,
});
export const createISpyBoard = ({ asset, title = "Untitled I Spy" }) => ({
  id: crypto.randomUUID(),
  title,
  description: "",
  category: "I Spy",
  age: "child",
  difficulty: "easy",
  theme: "",
  sourceType: "imported",
  asset,
  targets: [],
  selectedTargetIds: [],
  shuffle: false,
  archived: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
export async function listISpyBoards() {
  return getTherapyStudioDatabase()
    .table("iSpyBoards")
    .orderBy("updatedAt")
    .reverse()
    .toArray();
}
export async function saveISpyBoard(board) {
  const next = { ...board, updatedAt: new Date().toISOString() };
  await getTherapyStudioDatabase().table("iSpyBoards").put(next);
  return next;
}
export async function deleteISpyBoard(id) {
  await getTherapyStudioDatabase().table("iSpyBoards").delete(id);
}
