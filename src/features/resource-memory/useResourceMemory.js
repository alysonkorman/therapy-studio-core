import { useCallback, useEffect, useState } from "react";

import { resourceMemoryRepository } from "../../lib/data";

export default function useResourceMemory(
  resourceId,
  repository = resourceMemoryRepository
) {
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMemory(await repository.getResourceMemory(resourceId));
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }, [repository, resourceId]);

  useEffect(() => {
    let active = true;
    repository
      .getResourceMemory(resourceId)
      .then((nextMemory) => {
        if (active) setMemory(nextMemory);
      })
      .catch((caughtError) => {
        if (active) setError(caughtError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository, resourceId]);

  const run = useCallback(async (operation) => {
    setError("");
    try {
      const nextMemory = await operation();
      setMemory(nextMemory);
      return nextMemory;
    } catch (caughtError) {
      setError(caughtError.message);
      return null;
    }
  }, []);

  return { error, loading, memory, refresh, run };
}
