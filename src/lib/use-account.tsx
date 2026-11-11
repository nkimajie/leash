"use client";

// Who is signed in. Signing in to Leash is continuing with PayPal, which tells us your name and email.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { PayPalConnection } from "@/schemas";
import { fetchPayPalConnection } from "./api-client";

type Account = {
  /** null until the first check comes back. */
  connection: PayPalConnection | null;
  /** "Favor", from your PayPal name. */
  firstName: string | null;
  refresh: () => Promise<void>;
};

const AccountContext = createContext<Account | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<PayPalConnection | null>(null);

  const refresh = useCallback(async () => {
    setConnection(await fetchPayPalConnection());
  }, []);

  useEffect(() => {
    const firstLoad = setTimeout(() => refresh().catch(() => {}), 0);
    return () => clearTimeout(firstLoad);
  }, [refresh]);

  const firstName = connection?.payerName?.split(" ")[0] ?? null;
  return <AccountContext value={{ connection, firstName, refresh }}>{children}</AccountContext>;
}

export function useAccount(): Account {
  const account = useContext(AccountContext);
  if (!account) throw new Error("useAccount needs an <AccountProvider> around it.");
  return account;
}
