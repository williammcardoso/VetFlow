import React from "react";
import { getCachedUserProfile, getMyUserProfile, type UserProfile } from "@/lib/authApi";

type UseCurrentUserProfileResult = {
  profile: UserProfile | null;
  loading: boolean;
};

export function useCurrentUserProfile(): UseCurrentUserProfileResult {
  const [profile, setProfile] = React.useState<UserProfile | null>(() => getCachedUserProfile());
  const [loading, setLoading] = React.useState<boolean>(!getCachedUserProfile());

  React.useEffect(() => {
    let mounted = true;
    void getMyUserProfile()
      .then((next) => {
        if (!mounted) return;
        setProfile(next);
      })
      .catch(() => {
        // keep cached fallback
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { profile, loading };
}
