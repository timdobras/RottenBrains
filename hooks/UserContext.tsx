"use client";

import { createClient } from "@/lib/supabase/client";
import { IUser } from "@/types";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from "react";

interface UserContextType {
  user: any | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const UserProvider = ({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser?: any;
}) => {
  const [user, setUser] = useState<any | null>(initialUser || null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const router = useRouter();

  useEffect(() => {
    // Set initial loading state based on whether we have initial user
    if (initialUser) {
      setLoading(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("-----CONTEXT RELOAD-----");
      if (session?.user) {
        // Only fetch user data if user ID changed
        if (!user || user.id !== session.user.id) {
          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          setUser(userData || null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // Remove 'user' from dependencies to prevent unnecessary refetches

  // Inside UserProvider
  const refreshUser = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      setUser(null);
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .single();

    setUser(userData);
  };

  const resetUser = () => setUser(null);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ user, loading, refreshUser }),
    [user, loading]
  );

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export default UserProvider;
