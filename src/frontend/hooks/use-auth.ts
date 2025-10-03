import { useState, useEffect } from "react";
import { authApi, usersApi } from "@/lib/api";

interface User {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
  view_mode?: string;
  preferred_language?: string;
  is_anonymous: boolean;
  creation_time: number;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authApi.getMe();
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, code: string) => {
    try {
      const response = await authApi.verifyOTP(email, code);
      setUser(response.data.user);
      setIsAuthenticated(true);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authApi.signOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const requestOTP = async (email: string) => {
    return authApi.requestOTP(email);
  };

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
    requestOTP,
  };
}