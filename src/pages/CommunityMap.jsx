import React, { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  MapPin, Share2, Loader2, Users, Crosshair, Navigation, Eye, EyeOff, Smile
} from "lucide-react";

const TUPI_CENTER = [6.2356, 125.0286];
const EMOJI_CHOICES = ["🧍", "👨", "👩", "🧑", "👦", "👧", "👴", "👵", "👮", "🧑‍🚒", "👷", "🧑‍⚕️", "🚑", "🛡️", "📍", "🎯"];

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function reverseGeocode(lat, lng) {
  return fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`
  )
    .then((r) => r.json())
    .then((d) => d?.display_name || "Shared location")
    .catch(() => "Shared location");
}

function createEmojiIcon(emoji, isMe) {
  return L.divIcon({
    html: `<div style="font-size: 30px; line-height: 1; text-align: center; ${isMe ? "filter: drop-shadow(0 0 8px #2563eb);" : ""}">${emoji}</div>`,
    className: "aegis-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function FlyToMe({ trigger, location }) {
  const map = useMap();
  useEffect(() => {
    if (trigger && location) {
      map.flyTo([location.location_lat, location.location_lng], 15, { duration: 1.2 });
    }
  }, [trigger]);
  return null;
}

export default function CommunityMap() {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [emoji, setEmoji] = useState("🧍");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const mapRef = useRef(null);

  const loadLocations = useCallback(async () => {
    try {
      const list = await base44.entities.UserLocation.list("-updated_date", 500);
      setLocations(list || []);
      const mine = (list || []).find((l) => l.created_by_id === user?.id);
      setMyLocation(mine);
      if (mine?.emoji) setEmoji(mine.emoji);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLocations();
    const unsub = base44.entities.UserLocation.subscribe(() => {
      loadLocations();
    });
    return unsub;
  }, [loadLocations]);

  const shareLocation = async () => {
    setSharing(true);
    try {
      const pos = await getLocation();
      if (!pos) {
        alert("Unable to get your location. Please allow location access in your browser settings and try again.");
        return;
      }
      const label = await reverseGeocode(pos.lat, pos.lng);
      const name = user?.full_name || user?.email || "User";
      if (myLocation) {
        const updated = await base44.entities.UserLocation.update(myLocation.id, {
          location_lat: pos.lat,
          location_lng: pos.lng,
          location_label: label,
          emoji,
          full_name: name,
        });
        setMyLocation(updated);
      } else {
        const created = await base44.entities.UserLocation.create({
          location_lat: pos.lat,
          location_lng: pos.lng,
          location_label: label,
          emoji,
          full_name: name,
        });
        setMyLocation(created);
      }
      try { await base44.auth.updateMe({ location_lat: pos.lat, location_lng: pos.lng }); } catch (e) { /* non-critical */ }
      setFlyTrigger((t) => t + 1);
    } catch (e) {
      alert("Failed to share location: " + e.message);
    } finally {
      setSharing(false);
    }
  };

  const updateEmoji = async (newEmoji) => {
    setEmoji(newEmoji);
    setEmojiOpen(false);
    if (myLocation) {
      try {
        const updated = await base44.entities.UserLocation.update(myLocation.id, { emoji: newEmoji });
        setMyLocation(updated);
      } catch (e) { console.error(e); }
    }
  };

  const removeLocation = async () => {
    if (!myLocation) return;
    if (!confirm("Stop sharing your location on the community map?")) return;
    try {
      await base44.entities.UserLocation.delete(myLocation.id);
      setMyLocation(null);
    } catch (e) {
      alert("Failed to remove: " + e.message);
    }
  };

  const flyToMe = () => {
    if (myLocation) setFlyTrigger((t) => t + 1);
  };

  const mapCenter = myLocation
    ? [myLocation.location_lat, myLocation.location_lng]
    : TUPI_CENTER;
  const mapZoom = myLocation ? 14 : 13;

  return (
    <div className="relative h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom
        ref={mapRef}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {locations.map((loc) => {
          const isMe = loc.created_by_id === user?.id;
          return (
            <Marker
              key={loc.id}
              position={[loc.location_lat, loc.location_lng]}
              icon={createEmojiIcon(loc.emoji || "🧍", isMe)}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    {loc.emoji || "🧍"} {loc.full_name || "Community member"}{isMe ? " (you)" : ""}
                  </div>
                  {loc.location_label && (
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>
                      📍 {loc.location_label}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    Updated {timeAgo(loc.updated_date || loc.created_date)}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        <FlyToMe trigger={flyTrigger} location={myLocation} />
      </MapContainer>

      {/* Top bar overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 sm:text-base">Community Map</h1>
              <p className="text-xs text-slate-500">
                {locations.length} {locations.length === 1 ? "person" : "people"} sharing location
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {myLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmojiOpen(true)}
                className="hidden sm:flex"
              >
                <span className="text-lg leading-none">{emoji}</span>
                <Smile className="ml-1 h-4 w-4 text-slate-400" />
              </Button>
            )}
            {myLocation && (
              <Button variant="outline" size="sm" onClick={flyToMe} className="hidden sm:flex">
                <Crosshair className="mr-1 h-4 w-4" /> My location
              </Button>
            )}
            <Button
              onClick={shareLocation}
              disabled={sharing}
              size="sm"
              className={myLocation ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              {sharing ? (
                <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Sharing...</>
              ) : myLocation ? (
                <><Share2 className="mr-1.5 h-4 w-4" />Update</>
              ) : (
                <><Share2 className="mr-1.5 h-4 w-4" />Share location</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Not sharing banner */}
      {!myLocation && !loading && !sharing && (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-[1000] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/95 px-4 py-3 shadow-md backdrop-blur">
            <Users className="h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm text-blue-800">
              You're not on the map yet. Share your location to let your household and community see you.
            </p>
          </div>
        </div>
      )}

      {/* User list panel */}
      {locations.length > 0 && (
        <div className="absolute bottom-0 left-0 z-[1000] w-full sm:w-80">
          <div className="m-3 overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
            <button
              onClick={() => setListOpen(!listOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Users className="h-4 w-4 text-slate-400" />
                People on the map ({locations.length})
              </span>
              {listOpen ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
            </button>
            {listOpen && (
              <div className="max-h-64 overflow-y-auto border-t border-slate-100 px-2 py-2">
                <ul className="space-y-1">
                  {locations.map((loc) => {
                    const isMe = loc.created_by_id === user?.id;
                    return (
                      <li key={loc.id}>
                        <button
                          onClick={() => {
                            if (mapRef.current) {
                              mapRef.current.flyTo([loc.location_lat, loc.location_lng], 15, { duration: 1 });
                            }
                          }}
                          className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-slate-50"
                        >
                          <span className="text-2xl leading-none">{loc.emoji || "🧍"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {loc.full_name || "Community member"}{isMe && <span className="text-xs text-blue-600"> (you)</span>}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                              {loc.location_label || `${loc.location_lat?.toFixed(3)}, ${loc.location_lng?.toFixed(3)}`}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(loc.updated_date || loc.created_date)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* My location controls (mobile) */}
      {myLocation && (
        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-2 sm:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={flyToMe}
            className="h-10 w-10 rounded-full border-slate-200 bg-white shadow-md"
          >
            <Crosshair className="h-5 w-5 text-blue-600" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setEmojiOpen(true)}
            className="h-10 w-10 rounded-full border-slate-200 bg-white text-lg shadow-md"
          >
            {emoji}
          </Button>
        </div>
      )}

      {/* Emoji picker dialog */}
      <Dialog open={emojiOpen} onOpenChange={setEmojiOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Choose your map avatar</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-8 gap-2 py-2">
            {EMOJI_CHOICES.map((e) => (
              <button
                key={e}
                onClick={() => updateEmoji(e)}
                className={`flex h-11 w-11 items-center justify-center rounded-lg text-2xl transition-all hover:bg-slate-100 ${
                  emoji === e ? "bg-blue-100 ring-2 ring-blue-400" : ""
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          {myLocation && (
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button variant="outline" onClick={removeLocation} className="w-full text-rose-600 hover:bg-rose-50">
                Stop sharing my location
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}