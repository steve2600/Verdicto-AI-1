import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

// Keep the same shape the app expects
export function useAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  // Request OTP via Convex email OTP
  const requestOTP = async (email: string) => {
    // Start the email OTP flow (step 1: send code)
    const formData = new FormData();
    formData.append("email", email);
    return signIn("email_otp", formData);
  };

  // Verify OTP (step 2: verify code)
  const verifyOTP = async (email: string, code: string) => {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("code", code);
    return signIn("email_otp", formData);
  };

  return {
    isLoading,
    isAuthenticated,
    user: null, // Convex auth doesn't expose user directly in this hook
    // For compatibility with existing Auth.tsx usage:
    signIn: verifyOTP,
    signOut,
    requestOTP,
  };
}