"use client";

// Keeps a list of decisions up to date. Polls every 2 seconds for now;
// TODO(step 6): switch to Supabase Realtime so changes arrive instantly.

import { useCallback, useEffect, useState } from "react";
import type { Decision } from "@/schemas";
import { fetchDecisions } from "./api-client";

const REFRESH_EVERY_MS = 2000;

export function useLiveDecisions() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionProblem, setConnectionProblem] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setDecisions(await fetchDecisions());
      setConnectionProblem(false);
    } catch {
      setConnectionProblem(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const firstLoad = setTimeout(refresh, 0);
    const timer = setInterval(refresh, REFRESH_EVERY_MS);
    return () => {
      clearTimeout(firstLoad);
      clearInterval(timer);
    };
  }, [refresh]);

  return { decisions, isLoading, connectionProblem, refresh };
}
