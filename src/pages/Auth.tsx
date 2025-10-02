import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirectAfterAuth]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);

      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      const redirect = redirectAfterAuth || "/";
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(`Failed to sign in as guest: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-2xl backdrop-blur-xl bg-card/95">
          {step === "signIn" ? (
            <>
              <CardHeader className="text-center space-y-4 pb-8 pt-10">
                <div className="flex justify-center mb-2">
                  <img
                    src="./logo.svg"
                    alt="LexAI Logo"
                    width={56}
                    height={56}
                    className="rounded-xl cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                    onClick={() => navigate("/")}
                  />
                </div>
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Welcome to LexAI
                </CardTitle>
                <CardDescription className="text-base">
                  Sign in to continue to your account
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleEmailSubmit}>
                <CardContent className="space-y-4 px-8">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        name="email"
                        placeholder="name@example.com"
                        type="email"
                        className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  
                  <Button
                    type="submit"
                    className="w-full h-11 font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending code...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                  
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">
                        Or
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 font-medium border-border/50 hover:bg-muted/50"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Continue as Guest
                  </Button>
                </CardContent>
                <CardFooter className="px-8 pb-10 pt-4">
                  <p className="text-xs text-center text-muted-foreground w-full">
                    By continuing, you agree to our Terms of Service and Privacy Policy
                  </p>
                </CardFooter>
              </form>
            </>
          ) : (
            <>
              <CardHeader className="text-center space-y-4 pb-8 pt-10">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Check your email
                </CardTitle>
                <CardDescription className="text-base">
                  We sent a verification code to<br />
                  <span className="font-medium text-foreground">{step.email}</span>
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleOtpSubmit}>
                <CardContent className="space-y-6 px-8">
                  <input type="hidden" name="email" value={step.email} />
                  <input type="hidden" name="code" value={otp} />

                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                          const form = (e.target as HTMLElement).closest("form");
                          if (form) {
                            form.requestSubmit();
                          }
                        }
                      }}
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  
                  {error && (
                    <p className="text-sm text-destructive text-center">
                      {error}
                    </p>
                  )}
                  
                  <Button
                    type="submit"
                    className="w-full h-11 font-medium"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify Code
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Didn't receive the code?{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto font-medium text-primary hover:text-primary/80"
                        onClick={() => setStep("signIn")}
                      >
                        Resend
                      </Button>
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep("signIn")}
                      disabled={isLoading}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Use a different email
                    </Button>
                  </div>
                </CardContent>
              </form>
            </>
          )}
        </Card>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Secured by{" "}
            <a
              href="https://vly.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-foreground transition-colors"
            >
              vly.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}