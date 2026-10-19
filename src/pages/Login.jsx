// @ts-nocheck
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { ClerkGoogleButton, isClerkConfigured } from "@/lib/clerkSync";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Clear error state on mount
  React.useEffect(() => {
    setError("");
  }, []);
  
  // Post-login destination (e.g. the MCP OAuth consent page sends users here
  // with returnTo so the grant flow can resume). Same-origin paths only.
  const returnTo = safeReturnTo();

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setError("");
    try {
      base44.auth.loginWithProvider('google', returnTo, email);
    } catch (err) {
      setError(err.message || "Google Sign-In failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    console.log('🔐 Attempting login for:', email);
    
    try {
      const result = await base44.auth.loginViaEmailPassword(email.trim(), password);
      console.log('✅ Login successful:', result);
      
      // Wait a moment to ensure session is stored
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log('🔄 Redirecting to:', returnTo);
      window.location.href = returnTo;
    } catch (err) {
      console.error('❌ Login error:', err);
      setError(err.message || "Invalid email or password. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your AEGIS account"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      {isClerkConfigured ? (
        <ClerkGoogleButton
          text="Continue with Google"
          returnTo={returnTo}
          onError={setError}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 font-medium flex items-center justify-center gap-3 mb-6 hover:bg-muted/60 transition-all border-border shadow-sm"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <GoogleIcon className="w-4 h-4" />
          )}
          Continue with Google
        </Button>
      )}

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <div className="p-3 text-sm font-medium">
            {error}
          </div>
          {error.includes('just signed out') && (
            <div className="px-3 pb-3 pt-1 text-xs text-destructive/80 border-t border-destructive/10 mt-2">
              <strong>Tip:</strong> If you just logged out, Base44 might need a moment to clear your session. 
              Wait 10-15 seconds before trying again, or{" "}
              <Link to="/register" className="underline font-medium">
                create a new account
              </Link>
              {" "}if this persists.
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
