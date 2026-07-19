import { useEffect, useState } from 'react';
import { parseJwt } from '@/lib/jwt';

declare const google: any;

export interface AuthUser {
  name: string;
  email: string;
  avatar?: string;
}

// Google Identity Services OAuth + the offline FaceID biometric bypass.
// Owns all auth/session state; `signOut` clears auth only (callers layer on
// any app-state reset they need).
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBypassed, setIsBypassed] = useState(false);
  const [authLoading, setAuthLoading] = useState<'none' | 'google' | 'biometric'>('none');
  const [showFaceIdModal, setShowFaceIdModal] = useState(false);
  const [faceIdState, setFaceIdState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');

  const handleCredentialResponse = (response: any) => {
    try {
      setAuthLoading('google');
      const payload = parseJwt(response.credential);
      if (payload) {
        setUser({
          name: payload.name || payload.given_name || "Google User",
          email: payload.email,
          avatar: payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.email}`
        });
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
  }, [user, isBypassed]);

  // Biometric bypass simulation (offline emergency access).
  const triggerBiometricBypass = () => {
    setShowFaceIdModal(true);
    setFaceIdState('scanning');

    // Simulate active scan line
    setTimeout(() => {
      setFaceIdState('success');
      setTimeout(() => {
        setIsBypassed(true);
        setShowFaceIdModal(false);
        setFaceIdState('idle');
      }, 1000);
    }, 2200);
  };

  const signOut = () => {
    setUser(null);
    setIsBypassed(false);
  };

  return { user, isBypassed, authLoading, showFaceIdModal, faceIdState, triggerBiometricBypass, signOut };
}
