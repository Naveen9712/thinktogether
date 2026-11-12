import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { claimDiscussions, login as apiLogin, logout as apiLogout, me, signup as apiSignup } from '../lib/api.js';
import { SESSION_EXPIRED_EVENT, getAuth, setAuth } from '../lib/auth.js';
import { getSessions, removeSessions } from '../lib/sessions.js';
import { useToast } from '../components/Toast.jsx';

const AuthContext = createContext(null);

/**
 * Login state for the whole app. The saved login is used straight away (no flash of "guest"),
 * then confirmed with the server in the background.
 */
export function AuthProvider({ children }) {
  const toast = useToast();
  const [auth, setAuthState] = useState(getAuth);

  const apply = useCallback((next) => {
    setAuth(next);
    setAuthState(next);
  }, []);

  // Confirm the saved login once per page load (also picks up a changed name).
  useEffect(() => {
    if (!getAuth()) return;
    me()
      .then((res) => {
        const current = getAuth();
        if (current && res.user) apply({ token: current.token, user: res.user });
      })
      .catch(() => {
        // session_expired is handled by the event below; network errors keep the saved login.
      });
  }, [apply]);

  useEffect(() => {
    const onExpired = () => {
      setAuthState(null);
      toast.info('Your login session has ended. Please log in again.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [toast]);

  /** After signing in: move guest discussions saved on this device into the account. */
  const claimGuestDiscussions = useCallback(async () => {
    const sessions = getSessions();
    if (sessions.length === 0) return;
    try {
      const res = await claimDiscussions(sessions);
      const claimed = res.claimed || [];
      if (claimed.length > 0) {
        removeSessions(claimed);
        toast.success(
          claimed.length === 1
            ? '1 discussion from this device was added to your account.'
            : `${claimed.length} discussions from this device were added to your account.`
        );
      }
    } catch {
      // Not critical: they stay on this device and can be moved next time.
    }
  }, [toast]);

  const login = useCallback(
    async (username, password) => {
      const res = await apiLogin({ username, password });
      apply({ token: res.token, user: res.user });
      await claimGuestDiscussions();
      return res.user;
    },
    [apply, claimGuestDiscussions]
  );

  const signup = useCallback(
    async (payload) => {
      const res = await apiSignup(payload);
      apply({ token: res.token, user: res.user });
      await claimGuestDiscussions();
      return res.user;
    },
    [apply, claimGuestDiscussions]
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Even if the server is unreachable, forget the login on this device.
    }
    apply(null);
  }, [apply]);

  const value = useMemo(
    () => ({ user: auth ? auth.user : null, isLoggedIn: Boolean(auth), login, signup, logout }),
    [auth, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
