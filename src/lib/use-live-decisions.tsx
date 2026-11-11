"use client";

// Keeps a list of decisions up to date.
//   With Supabase: Realtime tells us the moment a decision is added or changes, and we reload.
//   Without it (memory mode): we check every 2 seconds instead.
// The browser only has the read-only "anon" key; every change still goes through our API.

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import type { Decision } from "@/schemas";
import { fetchDecisions } from "./api-client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasRealtime = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const POLL_EVERY_MS = 2000;
/** With Realtime, a slow check still runs in case a message is missed. */
const SAFETY_CHECK_EVERY_MS = 30_000;

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
    const timer = setInterval(refresh, hasRealtime ? SAFETY_CHECK_EVERY_MS : POLL_EVERY_MS);
    const stopListening = hasRealtime ? listenForDecisionChanges(refresh) : () => {};
    return () => {
      clearTimeout(firstLoad);
      clearInterval(timer);
      stopListening();
    };
  }, [refresh]);

  return { decisions, isLoading, connectionProblem, refresh, isRealtime: hasRealtime };
}

/** Calls `onChange` whenever a row in the decisions table is added or updated. */
function listenForDecisionChanges(onChange: () => void): () => void {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  const channel = supabase
    .channel("decisions")
    .on("postgres_changes", { event: "*", schema: "public", table: "decisions" }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
