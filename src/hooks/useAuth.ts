import { useEffect, useState } from 'react';
import { parseJwt } from '@/lib/jwt';
import { loadSession, saveSession, clearSession } from '@/lib/session';
import type { AuthUser } from '@/types/domain';

declare const google: any;

export type { AuthUser };

// Google Identity Services OAuth. The session is persisted to localStorage
// (client-only, no backend), so a page refresh keeps the user signed in until
// the Google token expires or they sign out.
export function useAuth() {
  // Rehydrate from a previously stored (and still-valid) session on first load.
  const [user, setUser] = useState<AuthUser | null>(() => loadSession()?.user ?? null);
  const [authLoading, setAuthLoading] = useState<'none' | 'google'>('none');

  const handleCredentialResponse = (response: any) => {
    try {
      setAuthLoading('google');
      const payload = parseJwt(response.credential);
      if (payload) {
        const authedUser: AuthUser = {
          name: payload.name || payload.given_name || "Google User",
          email: payload.email,
          avatar: payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.email}`
        };
        setUser(authedUser);
        // Persist with the token's own expiry so the session self-terminates.
        const exp = typeof payload.exp === 'number' ? payload.exp : null;
        saveSession({ user: authedUser, exp });
      } else {
        alert("Authentication failed: Unable to read credentials.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred during Google sign in.");
    } finally {
      setAuthLoading('none');
    }
  };

  // Set up Google Identity Services SDK Button on mount/state change.
  useEffect(() => {
    const initializeGoogleGSI = () => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId || clientId.includes("your-google-client-id")) {
          console.warn("VITE_GOOGLE_CLIENT_ID is not configured yet. Please configure it in .env file.");
        }
        google.accounts.id.initialize({
          client_id: clientId || 'dummy-client-id.apps.googleusercontent.com',
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        const btnParent = document.getElementById("google-signin-button");
        if (btnParent) {
          google.accounts.id.renderButton(
            btnParent,
            {
              theme: "filled_blue",
              size: "large",
              text: "signin_with",
              shape: "pill",
              width: btnParent.clientWidth || 320
            }
          );
        }
      }
    };

    // Try immediately
    initializeGoogleGSI();

    // Poll to check if the async defer script is loaded
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        initializeGoogleGSI();
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [user]);

  // Auto sign-out when the persisted Google token reaches its expiry while the
  // app is open.
  useEffect(() => {
    if (!user) return;
    const s = loadSession();
    if (!s?.exp) return;
    const ms = s.exp * 1000 - Date.now();
    const timer = setTimeout(() => {
      setUser(null);
      clearSession();
    }, Math.max(0, ms));
    return () => clearTimeout(timer);
  }, [user]);

  const signOut = () => {
    setUser(null);
    clearSession();
    try {
      google?.accounts?.id?.disableAutoSelect?.();
    } catch {
      // GSI not loaded — nothing to disable.
    }
  };

  return { user, authLoading, signOut };
}
