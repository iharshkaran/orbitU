import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../utils/api";

import { AuthContext } from "./useAuth";

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((nextUser) => {
    setUserState(nextUser);
  }, []);

  useEffect(() => {
    let active = true;
    // Older builds cached profile details in localStorage. The HTTP-only session
    // cookie is now the only persisted authentication state.
    try {
      localStorage.removeItem("connectly-profile");
      localStorage.removeItem("connectly-demo-session");
    } catch {
      // Authentication still works from the HTTP-only cookie if storage is blocked.
    }
    api.me()
      .then(({ user: currentUser }) => { if (active) setUser(currentUser); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [setUser]);

  const value = useMemo(() => ({ user, setUser, loading }), [user, setUser, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}



