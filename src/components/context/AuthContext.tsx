import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { supabase } from "../../db/supabase";
import Swal from "sweetalert2";
import type { Session } from "@supabase/supabase-js";
import type { AuthContextType } from "../../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingPage, setLoadingPage] = useState<boolean>(true);

  useEffect(() => {
    const checkSessionExpiry = async (session: Session | null) => {
      if (!session) return false;
      if (!session.expires_at) return false;

      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at <= now) {
        await supabase.auth.signOut();
        Swal.fire({
          icon: "error",
          title: "Session expired",
          text: "Your session has expired, please log in again.",
        });
        setSession(null);
        return true;
      }

      return false;
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const expired = await checkSessionExpiry(session);
      if (!expired) {
        setSession(session);
      }

      setLoadingPage(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED" && !session) {
        await checkSessionExpiry(session);
      }

      const userStatus = Boolean(session?.user?.user_metadata.status);
      const userIsArchive = Boolean(session?.user?.user_metadata.is_archive);
      const userPermissions = session?.user?.user_metadata.permissions;
      if (
        !userPermissions?.includes("Can Login to Admin") ||
        !userStatus ||
        userIsArchive
      ) {
        setSession(null);
      } else if (session) {
        const expired = await checkSessionExpiry(session);
        if (!expired) setSession(session);
      }

      setLoadingPage(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Log out",
        text: `Error occurred while trying to log out: ${error}`,
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error.message;
      }
      const userStatus =
        Boolean(data.user?.user_metadata.status) &&
        !data.user?.user_metadata.is_archive;
      const userPermissions = data?.user?.user_metadata.permissions;

      if (!userPermissions?.includes("Can Login to Admin") || !userStatus) {
        setSession(null);
        signOut();

        return { success: false, error: "You have no access to this portal" };
      }

      return { success: true, data };
    } catch (error) {
      setSession(null);
      return { success: false, error };
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, signIn, signOut, loadingPage, setLoadingPage }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const UserAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("UserAuth must be used within an AuthContextProvider");
  }
  return useContext(AuthContext) as AuthContextType;
};
