// @ts-nocheck
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import {
  startOrUpdateLocationSharing,
  getSharingPreferences,
  SHARING_VISIBILITY,
} from "@/lib/locationSharing";

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Global background location tracker.
 * Ensures that whenever any authenticated user allows browser location access,
 * their profile icon automatically appears on the Community Map and continuously
 * updates along their walking path across the entire application.
 */
export default function GlobalLocationTracker() {
  const { user } = useAuth();
  const routeLocation = useLocation();

  const watchIdRef = useRef(null);
  const lastSavedCoordsRef = useRef(null);
  const lastSavedTimeRef = useRef(0);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // When viewing the CommunityMap page directly, CommunityMap.jsx handles high-frequency tracking
    if (routeLocation.pathname === "/map") {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (!user?.id || typeof window === "undefined" || !navigator.geolocation) return;

    let cancelled = false;

    async function broadcastLocation(coords) {
      const activeUser = userRef.current;
      if (!activeUser?.id) return;
      try {
        const prefs = getSharingPreferences(activeUser.id);
        const photo = activeUser.avatar_url || activeUser.imageUrl || null;
        await startOrUpdateLocationSharing(base44, {
          user: activeUser,
          position: coords,
          locationLabel: "Active in community",
          visibility: prefs?.visibility || SHARING_VISIBILITY.COMMUNITY,
          emoji: photo ? null : "🧍",
          avatarUrl: photo,
        });
      } catch (err) {
        console.warn("GlobalLocationTracker notice:", err?.message || err);
      }
    }

    function startBackgroundWatching() {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (cancelled) return;
          const newCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          const lastSaved = lastSavedCoordsRef.current;
          const now = Date.now();
          const dist = lastSaved
            ? getDistanceMeters(lastSaved.lat, lastSaved.lng, newCoords.lat, newCoords.lng)
            : 999999;
          const timeDiff = now - lastSavedTimeRef.current;

          // Broadcast when walking >= 2 meters or every 8 seconds
          if (dist >= 2 || timeDiff > 8000) {
            lastSavedCoordsRef.current = newCoords;
            lastSavedTimeRef.current = now;
            broadcastLocation(newCoords);
          }
        },
        (err) => {
          console.warn("Global background GPS error:", err?.message || err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 20000,
        }
      );
    }

    // Check permissions API if available
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((result) => {
          if (cancelled) return;
          if (result.state === "granted") {
            // Get initial position immediately
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (!cancelled) {
                  const initialCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                  lastSavedCoordsRef.current = initialCoords;
                  lastSavedTimeRef.current = Date.now();
                  broadcastLocation(initialCoords);
                }
              },
              () => {},
              { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
            );
            startBackgroundWatching();
          }

          result.addEventListener("change", () => {
            if (cancelled) return;
            if (result.state === "granted") {
              startBackgroundWatching();
            } else if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
          });
        })
        .catch(() => {
          // Fallback if query not supported
        });
    }

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [user?.id, routeLocation.pathname]);

  return null;
}
