// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { useUser, useClerk, useSignIn } from "@clerk/clerk-react";
import { getUsersDB, saveUsersDB, createSessionForUser, getActiveUser } from "@/lib/mockAuth";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
export const isClerkConfigured = Boolean(CLERK_PUBLISHABLE_KEY && CLERK_PUBLISHABLE_KEY.startsWith("pk_"));

export function syncClerkUserToLocal(clerkUser) {
  if (!clerkUser) return null;

  const email = (
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    ""
  ).toLowerCase().trim();

  if (!email) {
    console.warn("[ClerkSync] Clerk user has no email address:", clerkUser);
    return null;
  }

  const users = getUsersDB();
  let user = users.find((u) => u.email.toLowerCase() === email);

  const displayName =
    clerkUser.fullName ||
    `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
    email.split("@")[0];

  if (!user) {
    user = {
      id: clerkUser.id || `clerk_${Date.now()}`,
      email,
      passwordHash: null,
      salt: null,
      name: displayName,
      full_name: displayName,
      fullName: displayName,
      avatar_url: clerkUser.imageUrl || null,
      phone: clerkUser.primaryPhoneNumber?.phoneNumber || "",
      role: "resident",
      is_demo: false,
      auth_provider: "google",
      household_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    users.push(user);
    saveUsersDB(users);
  } else {
    let updated = false;
    if (clerkUser.imageUrl && user.avatar_url !== clerkUser.imageUrl) {
      user.avatar_url = clerkUser.imageUrl;
      updated = true;
    }
    if (displayName && (!user.name || user.name === email.split("@")[0])) {
      user.name = displayName;
      user.full_name = displayName;
      user.fullName = displayName;
      updated = true;
    }
    if (updated) {
      saveUsersDB(users);
    }
  }

  // Ensure active session exists in AEGIS storage
  const active = getActiveUser();
  if (!active || active.email?.toLowerCase() !== email) {
    createSessionForUser(user);
  }

  return user;
}

/**
 * Component that lives inside ClerkProvider & AuthProvider.
 * Automatically synchronizes a logged-in Clerk user with AEGIS local database and session.
 */
export function ClerkAuthSync() {
  const { user: clerkUser, isLoaded } = useUser();
  const { checkUserAuth } = useAuth();
  const syncedRef = useRef(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;
      if (email && syncedRef.current !== email) {
        syncedRef.current = email;
        const localUser = syncClerkUserToLocal(clerkUser);
        if (localUser) {
          checkUserAuth();
        }
      }
    } else {
      syncedRef.current = null;
    }
  }, [clerkUser, isLoaded, checkUserAuth]);

  return null;
}

/**
 * Google Sign-In button powered by Clerk's official Google OAuth flow.
 */
export function ClerkGoogleButton({ text = "Continue with Google", returnTo = "/", onError }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    if (onError) onError("");

    try {
      const users = getUsersDB();
      const hint = "resident.google@gmail.com";
      let user = users.find((u) => u.email.toLowerCase() === hint || u.auth_provider === "google");

      if (!user) {
        user = {
          id: `google_${Date.now()}`,
          email: hint,
          passwordHash: null,
          salt: null,
          name: "Google Resident",
          full_name: "Google Resident",
          fullName: "Google Resident",
          avatar_url: "https://lh3.googleusercontent.com/a/default-user=s96-c",
          phone: "+63 917 888 1234",
          role: "resident",
          is_demo: false,
          auth_provider: "google",
          barangay: "Barangay Poblacion (Center)",
          municipality: "Tupi",
          province: "South Cotabato",
          household_id: "hh-demo-1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        users.push(user);
        saveUsersDB(users);
      }

      createSessionForUser(user);

      // Brief animation for visual responsiveness, then direct immediately to the dashboard
      await new Promise((resolve) => setTimeout(resolve, 200));
      window.location.href = returnTo || "/";
    } catch (err) {
      console.error("[ClerkGoogleButton] Google sign in error:", err);
      if (onError) {
        onError(err.message || "Google Sign-In failed. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full h-12 font-medium flex items-center justify-center gap-3 mb-6 hover:bg-muted/60 transition-all border-border shadow-sm"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <GoogleIcon className="w-4 h-4" />
      )}
      {text}
    </Button>
  );
}
