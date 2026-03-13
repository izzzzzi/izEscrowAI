import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { setTelegramAuthData } from "../lib/api";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface AuthState {
  user: TelegramUser | null;
  wallet: string | null;
  isAuthenticated: boolean;
  hasWallet: boolean;
  isAdmin: boolean;
  /** Raw auth data for API headers */
  authData: string | null;
  /** "initData" or "loginWidget" */
  authMethod: "initData" | "loginWidget" | null;
  setLoginUser: (user: TelegramUser) => void;
  setWallet: (address: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  wallet: null,
  isAuthenticated: false,
  hasWallet: false,
  isAdmin: false,
  authData: null,
  authMethod: null,
  setLoginUser: () => {},
  setWallet: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [wallet, setWalletState] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<"initData" | "loginWidget" | null>(null);
  const [authData, setAuthData] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Auto-detect Mini App initData on mount
  useEffect(() => {
    try {
      // @ts-expect-error - Telegram WebApp global
      const tg = window.Telegram?.WebApp;
      if (tg?.initData && tg.initData.length > 0) {
        const initUser = tg.initDataUnsafe?.user;
        if (initUser) {
          setUser({
            id: initUser.id,
            first_name: initUser.first_name,
            last_name: initUser.last_name,
            username: initUser.username,
            photo_url: initUser.photo_url,
            auth_date: 0,
            hash: "",
          });
          setAuthMethod("initData");
          setAuthData(tg.initData);
        }
      }
    } catch {
      // Not in Telegram
    }
  }, []);

  // Check admin status when auth data changes
  useEffect(() => {
    if (!authData) {
      setIsAdmin(false);
      return;
    }
    setTelegramAuthData(authData);
    // Dynamic import to avoid circular deps
    import("../lib/api").then(({ checkAdminStatus }) => {
      checkAdminStatus().then(r => setIsAdmin(r.is_admin)).catch(() => setIsAdmin(false));
    });
  }, [authData]);

  const setLoginUser = useCallback((u: TelegramUser) => {
    setUser(u);
    setAuthMethod("loginWidget");
    setAuthData(JSON.stringify(u));
  }, []);

  const setWallet = useCallback((address: string | null) => {
    setWalletState(address);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAuthMethod(null);
    setAuthData(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        isAuthenticated: user !== null,
        hasWallet: wallet !== null,
        isAdmin,
        authData,
        authMethod,
        setLoginUser,
        setWallet,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
