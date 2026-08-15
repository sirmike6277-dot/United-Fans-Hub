import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  fanLevel: number;
  fanPoints: number;
}

/** The signed-in user's own `profiles` row — same table/RLS the web app reads (a user reads their own row, always allowed). */
export function useProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, fan_level, fan_points")
      .eq("id", session.user.id)
      .single();

    if (fetchError || !data) {
      setError("Couldn't load your profile. Pull to retry.");
      setLoading(false);
      return;
    }

    setProfile({
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      fanLevel: data.fan_level,
      fanPoints: data.fan_points,
    });
    setLoading(false);
  }, [session?.user]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, loading, error, refresh: load };
}
