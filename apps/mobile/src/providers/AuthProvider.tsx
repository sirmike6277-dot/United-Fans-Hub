import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase/client";

interface AuthContextValue {
  session: Session | null;
  /** Undefined while the very first session check is still in flight. */
  initializing: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Mirrors the web app's session model: one Supabase Auth session, shared
 * across the whole app. Unlike Next.js (server components + middleware
 * refresh the session per request), mobile has a single long-lived client —
 * `onAuthStateChange` is the only source of truth, and `autoRefreshToken`
 * (set on the client) keeps it alive in the background.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ session, initializing }), [session, initializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
