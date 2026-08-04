import { useMemo, useState } from "react";

import { getIconGroups, resolveIcon, searchIcons } from "../../services/icons";

export const ICON_PAGE_SIZE = 60;

export function useIconBrowser(initialId) {
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialId || "prompt-default");
  const [visibleCount, setVisibleCount] = useState(ICON_PAGE_SIZE);
  const matches = useMemo(() => searchIcons(query, { group }), [group, query]);
  const visibleIcons = matches.slice(0, visibleCount);

  function resetResults(next) {
    next();
    setVisibleCount(ICON_PAGE_SIZE);
  }

  return {
    group,
    groups: getIconGroups(),
    hasMore: visibleIcons.length < matches.length,
    loadMore: () => setVisibleCount((count) => count + ICON_PAGE_SIZE),
    matches,
    query,
    selectedIcon: resolveIcon(selectedId),
    selectedId,
    setGroup: (value) => resetResults(() => setGroup(value)),
    setQuery: (value) => resetResults(() => setQuery(value)),
    setSelectedId,
    visibleIcons,
  };
}
