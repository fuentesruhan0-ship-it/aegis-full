// @ts-nocheck
import React, { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  MapPin, Share2, Loader2, Users, Crosshair, Eye, EyeOff, Smile, Camera, Trash2, Layers,
  LocateFixed, Activity, Siren, Tent, Shield, AlertTriangle, Radio, Navigation, Pause,
  Play, CheckCircle2, SlidersHorizontal, Lock, Phone, ExternalLink
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import EarthquakeLayer from "@/components/EarthquakeLayer";
import FaultLineLayer from "@/components/FaultLineLayer";
import {
  SHARING_VISIBILITY,
  SHARING_STATUS,
  filterVisibleLocations,
  isLocationStale,
  getVisibilityLabel,
  getStatusLabel,
  getSharingPreferences,
  saveSharingPreferences,
  startOrUpdateLocationSharing,
  pauseLocationSharing,
  stopLocationSharing,
} from "@/lib/locationSharing";
import { EVACUATION_CENTERS } from "./EvacuationLocator";

const TUPI_CENTER = [6.2356, 125.0286];

const STADIA_API_KEY = import.meta.env.VITE_STADIA_MAPS_API_KEY || '';

const MAP_STYLES = {
  alidade_smooth_dark: {
    label: "Smooth Dark",
    url: STADIA_API_KEY
      ? `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${STADIA_API_KEY}`
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 20,
    subdomains: "abcd",
  },
  dark_topo: {
    label: "Dark Topo",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    subdomains: "abc",
    maxZoom: 19,
    filter: "invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)",
  },
  outdoors: {
    label: "Outdoors",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 20,
    subdomains: "abc",
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, Earthstar Geographics",
    maxZoom: 19,
  },
  streets: {
    label: "Streets",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    subdomains: "abc",
    maxZoom: 19,
  },
  terrain: {
    label: "Terrain",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, Intermap",
    maxZoom: 19,
  },
};

const EMOJI_CHOICES = ["🧍", "👨", "👩", "🧑", "👦", "👧", "👴", "👵", "👮", "🧑‍🚒", "👷", "🧑‍⚕️", "🚑", "🛡️", "📍", "🎯"];

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000 }
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

function createEmojiIcon(emoji, isMe, isPaused) {
  return L.divIcon({
    html: `
      <div style="position:relative; font-size: 30px; line-height: 1; text-align: center; ${isMe ? "filter: drop-shadow(0 0 8px #2563eb);" : ""}">
        ${emoji}
        ${isPaused ? '<span style="position:absolute; bottom:-4px; right:-4px; width:10px; height:10px; border-radius:50%; background:#eab308; border:1.5px solid white;"></span>' : '<span style="position:absolute; bottom:-4px; right:-4px; width:10px; height:10px; border-radius:50%; background:#10b981; border:1.5px solid white;"></span>'}
      </div>
    `,
    className: "aegis-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createPhotoIcon(url, isMe, isPaused) {
  return L.divIcon({
    html: `
      <div style="position:relative; width:38px; height:38px; border-radius:50%; overflow:visible;">
        <img src="${url}" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:3px solid ${isMe ? "#2563eb" : "white"}; box-shadow:0 2px 8px rgba(0,0,0,0.35); display:block;"/>
        ${isPaused ? '<span style="position:absolute; bottom:0; right:0; width:11px; height:11px; border-radius:50%; background:#eab308; border:2px solid white;"></span>' : '<span style="position:absolute; bottom:0; right:0; width:11px; height:11px; border-radius:50%; background:#10b981; border:2px solid white;"></span>'}
      </div>
    `,
    className: "aegis-photo-marker",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function getMarkerIcon(loc, isMe) {
  const isPaused = loc.sharing_status === SHARING_STATUS.PAUSED;
  if (loc.avatar_url) return createPhotoIcon(loc.avatar_url, isMe, isPaused);
  return createEmojiIcon(loc.emoji || "🧍", isMe, isPaused);
}

function createSosBeaconIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative; width:44px; height:44px; display:flex; align-items:center; justify-content:center;">
        <span style="position:absolute; inset:0; border-radius:50%; background:rgba(225,29,72,0.45); animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></span>
        <span style="position:absolute; inset:4px; border-radius:50%; background:#e11d48; box-shadow:0 0 16px rgba(225,29,72,0.9); display:flex; align-items:center; justify-content:center; color:white; font-size:18px; border:2px solid white;">
          🚨
        </span>
      </div>
    `,
    className: "aegis-sos-marker",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function createEvacuationIcon() {
  return L.divIcon({
    html: `
      <div style="width:34px; height:34px; border-radius:50%; background:#059669; border:2px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; font-size:18px; color:white;">
        ⛺
      </div>
    `,
    className: "aegis-evac-marker",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function getHazardIcon(type) {
  const icons = {
    cracked_road: "🛣️",
    landslide: "⛰️",
    fire: "🔥",
    gas_leak: "☢️",
    structural_damage: "🏚️",
    flood: "🌊",
    other: "⚠️",
  };
  return icons[type] || "⚠️";
}

function getHazardColor(severity) {
  const colors = {
    low: "#eab308",
    medium: "#f97316",
    high: "#dc2626",
    critical: "#7c1d1d",
  };
  return colors[severity] || colors.medium;
}

function createHazardIcon(type, severity) {
  const emoji = getHazardIcon(type);
  const color = getHazardColor(severity);
  return L.divIcon({
    html: `<div style="font-size: 28px; line-height: 1; text-align: center; filter: drop-shadow(0 2px 6px ${color});">${emoji}</div>`,
    className: "aegis-hazard-marker",
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

function FlyToMe({ trigger, location, realtimePos }) {
  const map = useMap();
  const lastTrigger = useRef(0);

  useEffect(() => {
    if (trigger > 0 && trigger !== lastTrigger.current) {
      lastTrigger.current = trigger;
      const lat = realtimePos?.lat || location?.location_lat;
      const lng = realtimePos?.lng || location?.location_lng;
      if (lat && lng) {
        map.flyTo([lat, lng], 15, { duration: 1.2 });
      }
    }
  }, [trigger, realtimePos, location, map]);

  return null;
}

export default function CommunityMap() {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [hazardReports, setHazardReports] = useState([]);
  const [activeSosAlerts, setActiveSosAlerts] = useState([]);
  const [householdMemberIds, setHouseholdMemberIds] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [myRealTimePosition, setMyRealTimePosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [emoji, setEmoji] = useState("🧍");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);
  const [sharingVisibility, setSharingVisibility] = useState(SHARING_VISIBILITY.COMMUNITY);
  const [sharingStatus, setSharingStatus] = useState(SHARING_STATUS.ACTIVE);
  const [sharingSettingsOpen, setSharingSettingsOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [mapStyle, setMapStyle] = useState("dark_topo");
  const [showQuakes, setShowQuakes] = useState(true);
  const [showFaults, setShowFaults] = useState(false);
  const [showPeople, setShowPeople] = useState(true);
  const [showHazards, setShowHazards] = useState(true);
  const [showSos, setShowSos] = useState(true);
  const [showEvac, setShowEvac] = useState(false);
  const [, setNowTick] = useState(0);

  const fileInputRef = useRef(null);
  const mapRef = useRef(null);

  // Keep "time ago" updated
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Load user saved preferences
  useEffect(() => {
    if (user?.id) {
      const prefs = getSharingPreferences(user.id);
      if (prefs?.visibility) setSharingVisibility(prefs.visibility);
    }
  }, [user?.id]);

  // Load Household members for privacy filtering
  const loadHousehold = useCallback(async () => {
    if (!user?.household_id) return;
    try {
      const hh = await base44.entities.Household.get(user.household_id);
      if (hh?.member_user_ids) {
        setHouseholdMemberIds(hh.member_user_ids.map(String));
      }
    } catch { /* non-critical */ }
  }, [user?.household_id]);

  // Load Active SOS alerts
  const loadSosAlerts = useCallback(async () => {
    try {
      const list = await base44.entities.SOSAlert.filter({ status: "active" }, "-created_date", 50);
      setActiveSosAlerts(list || []);
    } catch (e) {
      console.error("Failed to load SOS alerts:", e);
    }
  }, []);

  // Load User Locations with opt-in and privacy filtering
  const loadLocations = useCallback(async () => {
    try {
      const list = await base44.entities.UserLocation.list("-updated_date", 500);
      const mine = (list || []).find((l) => String(l.created_by_id) === String(user?.id));
      setMyLocation(mine);
      if (mine) {
        if (mine.emoji) setEmoji(mine.emoji);
        if (mine.avatar_url) setAvatarUrl(mine.avatar_url);
        if (mine.sharing_visibility) setSharingVisibility(mine.sharing_visibility);
        if (mine.sharing_status) setSharingStatus(mine.sharing_status);
      }

      // Filter visible community locations
      const activeSosUserIds = (activeSosAlerts || []).map(s => String(s.created_by_id || s.sender_id));
      const visible = filterVisibleLocations(list || [], user, householdMemberIds, activeSosUserIds);
      setLocations(visible);
    } catch (e) {
      console.error("Failed to load locations:", e);
    } finally {
      setLoading(false);
    }
  }, [user, householdMemberIds, activeSosAlerts]);

  // Load Hazard Reports
  const loadHazardReports = useCallback(async () => {
    try {
      const reports = await base44.entities.HazardReport.list("-created_date", 500);
      const withLoc = (reports || []).filter((r) => r.location_lat != null && r.location_lng != null);
      setHazardReports(withLoc);
    } catch (e) {
      console.error("Failed to load hazard reports:", e);
    }
  }, []);

  // Initialize and set up real-time polling / subscriptions
  useEffect(() => {
    loadHousehold();
    loadSosAlerts();
    loadHazardReports();
    loadLocations();

    // Base44 real-time subscriptions
    const unsubLoc = base44.entities.UserLocation.subscribe(() => {
      loadLocations();
    });
    const unsubHazard = base44.entities.HazardReport.subscribe(() => {
      loadHazardReports();
    });
    const unsubSos = base44.entities.SOSAlert.subscribe(() => {
      loadSosAlerts();
      loadLocations();
    });

    // 15-second polling fallback for guaranteed synchronization across multi-user sessions
    const interval = setInterval(() => {
      loadLocations();
      loadSosAlerts();
      loadHazardReports();
    }, 15000);

    return () => {
      unsubLoc();
      unsubHazard();
      unsubSos();
      clearInterval(interval);
    };
  }, [loadHousehold, loadSosAlerts, loadHazardReports, loadLocations]);

  // Start or Update Location Sharing (Opt-in)
  const handleShareLocation = async (customVisibility) => {
    setSharing(true);
    try {
      const pos = await getLocation();
      if (!pos) {
        alert("Unable to access GPS location. Please allow location permissions in your browser.");
        return;
      }
      setMyRealTimePosition(pos);
      const label = await reverseGeocode(pos.lat, pos.lng);
      const targetVisibility = customVisibility || sharingVisibility;

      const updated = await startOrUpdateLocationSharing(base44, {
        user,
        existingLocationId: myLocation?.id,
        position: pos,
        locationLabel: label,
        visibility: targetVisibility,
        emoji,
        avatarUrl,
      });

      setMyLocation(updated);
      setSharingStatus(SHARING_STATUS.ACTIVE);
      setSharingSettingsOpen(false);
      await loadLocations();
    } catch (e) {
      alert("Failed to share location: " + e.message);
    } finally {
      setSharing(false);
    }
  };

  // Pause location sharing
  const handlePauseSharing = async () => {
    if (!myLocation) return;
    try {
      const updated = await pauseLocationSharing(base44, myLocation.id);
      setMyLocation(updated);
      setSharingStatus(SHARING_STATUS.PAUSED);
      await loadLocations();
    } catch (e) {
      alert("Failed to pause sharing: " + e.message);
    }
  };

  // Stop location sharing completely
  const handleStopSharing = async () => {
    if (!myLocation) return;
    if (!confirm("Are you sure you want to stop location sharing? Your marker will be removed from the community map.")) return;
    try {
      await stopLocationSharing(base44, myLocation.id);
      setMyLocation(null);
      setSharingStatus(SHARING_STATUS.STOPPED);
      setSharingSettingsOpen(false);
      await loadLocations();
    } catch (e) {
      alert("Failed to stop sharing: " + e.message);
    }
  };

  const updateEmoji = async (newEmoji) => {
    setEmoji(newEmoji);
    setAvatarUrl(null);
    setAvatarOpen(false);
    if (myLocation) {
      try {
        const updated = await base44.entities.UserLocation.update(myLocation.id, {
          emoji: newEmoji,
          avatar_url: null
        });
        setMyLocation(updated);
        await loadLocations();
      } catch (e) { console.error(e); }
    }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // @ts-ignore - mock and SDK have compatible but differently-typed UploadPublicFile
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setAvatarUrl(file_url);
      await base44.auth.updateMe({ avatar_url: file_url });
      if (myLocation) {
        const updated = await base44.entities.UserLocation.update(myLocation.id, {
          avatar_url: file_url
        });
        setMyLocation(updated);
        await loadLocations();
      }
      setAvatarOpen(false);
    } catch (err) {
      alert("Failed to upload photo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const flyToMe = () => {
    if (myLocation || myRealTimePosition) {
      setFlyTrigger((t) => t + 1);
    }
  };

  /** @type {[number, number]} */
  const mapCenter = myLocation
    ? [myLocation.location_lat, myLocation.location_lng]
    : TUPI_CENTER;
  const mapZoom = myLocation ? 14 : 13;

  return (
    <div className="relative h-[calc(100vh-3.5rem)] lg:h-screen">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom
        ref={mapRef}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        className="z-0"
      >
        <TileLayer
          key={mapStyle}
          url={MAP_STYLES[mapStyle].url}
          attribution={MAP_STYLES[mapStyle].attribution}
          subdomains={MAP_STYLES[mapStyle].subdomains || "abc"}
          maxZoom={MAP_STYLES[mapStyle].maxZoom || 19}
          className={MAP_STYLES[mapStyle].filter ? "map-filter" : ""}
        />
        {MAP_STYLES[mapStyle].filter && (
          <style>{`
            .map-filter {
              filter: ${MAP_STYLES[mapStyle].filter} !important;
            }
          `}</style>
        )}

        {/* 1. Opted-In Community People Markers */}
        {showPeople && locations.map((loc) => {
          const isMe = String(loc.created_by_id) === String(user?.id);
          const markerLat = isMe && myRealTimePosition ? myRealTimePosition.lat : loc.location_lat;
          const markerLng = isMe && myRealTimePosition ? myRealTimePosition.lng : loc.location_lng;
          const isPaused = loc.sharing_status === SHARING_STATUS.PAUSED;

          return (
            <Marker
              key={loc.id}
              position={[markerLat, markerLng]}
              icon={getMarkerIcon(loc, isMe)}
            >
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {loc.avatar_url ? (
                      <img src={loc.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }} />
                    ) : (
                      <span style={{ fontSize: 28, lineHeight: 1 }}>{loc.emoji || "🧍"}</span>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>
                        {loc.full_name || "Community member"}{isMe ? " (You)" : ""}
                      </div>
                      <span style={{
                        display: "inline-block",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: isPaused ? "#fef3c7" : "#d1fae5",
                        color: isPaused ? "#b45309" : "#065f46"
                      }}>
                        {isPaused ? "⏸ Paused" : "🟢 Sharing Location"}
                      </span>
                    </div>
                  </div>

                  {loc.location_label && (
                    <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 4 }}>
                      <span style={{ flexShrink: 0 }}>📍</span>
                      <span>{loc.location_label}</span>
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: isMe ? 8 : 4 }}>
                    Active {timeAgo(loc.last_active_at || loc.updated_date || loc.created_date)}
                    {loc.sharing_visibility && ` · Scope: ${getVisibilityLabel(loc.sharing_visibility)}`}
                  </div>

                  {isMe ? (
                    <button
                      onClick={() => setSharingSettingsOpen(true)}
                      style={{
                        width: "100%",
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid rgba(59,130,246,0.3)",
                        background: "rgba(59,130,246,0.1)",
                        color: "#2563eb",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      ⚙️ Manage My Sharing
                    </button>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 2. Active SOS Emergency Beacons */}
        {showSos && activeSosAlerts.map((sos) => {
          if (!sos.location_lat || !sos.location_lng) return null;
          return (
            <Marker
              key={sos.id}
              position={[sos.location_lat, sos.location_lng]}
              icon={createSosBeaconIcon()}
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>🚨</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: "#be123c" }}>
                      ACTIVE SOS BEACON
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>
                    Sender: {sos.sender_name || "AEGIS Resident"}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, fontStyle: "italic", background: "#fff1f2", padding: "6px 8px", borderRadius: 6 }}>
                    "{sos.message || "I need emergency assistance!"}"
                  </div>
                  {sos.location_label && (
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>
                      📍 {sos.location_label}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>
                    Activated {timeAgo(sos.created_date)}
                  </div>
                  {sos.sender_phone && (
                    <div style={{ fontSize: 11, color: "#1e40af", marginBottom: 4, fontWeight: 600 }}>
                      📞 Resident Phone: {sos.sender_phone}
                    </div>
                  )}
                  {sos.primary_contact_phone && (
                    <div style={{ fontSize: 11, color: "#065f46", marginBottom: 6, fontWeight: 600 }}>
                      👥 Emergency Contact: {sos.primary_contact_name || "Recipient"} ({sos.primary_contact_phone})
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${sos.location_lat},${sos.location_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          background: "#be123c",
                          color: "white",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textAlign: "center",
                          textDecoration: "none",
                        }}
                      >
                        Get Directions
                      </a>
                      <a
                        href="tel:911"
                        style={{
                          padding: "6px 10px",
                          background: "#0f172a",
                          color: "white",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textDecoration: "none",
                          textAlign: "center",
                        }}
                      >
                        Dial 911
                      </a>
                    </div>
                    {sos.sender_phone && (
                      <a
                        href={`tel:${sos.sender_phone.replace(/[^\d+]/g, '')}`}
                        style={{
                          padding: "6px 10px",
                          background: "#2563eb",
                          color: "white",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textAlign: "center",
                          textDecoration: "none",
                        }}
                      >
                        📞 Call Resident ({sos.sender_phone})
                      </a>
                    )}
                    {sos.primary_contact_phone && (
                      <a
                        href={`tel:${sos.primary_contact_phone.replace(/[^\d+]/g, '')}`}
                        style={{
                          padding: "6px 10px",
                          background: "#059669",
                          color: "white",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          textAlign: "center",
                          textDecoration: "none",
                        }}
                      >
                        👥 Call Recipient: {sos.primary_contact_name || "Contact"} ({sos.primary_contact_phone})
                      </a>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 3. Community Hazard Reports */}
        {showHazards && hazardReports.map((report) => (
          <Marker
            key={report.id}
            position={[report.location_lat, report.location_lng]}
            icon={createHazardIcon(report.type, report.severity)}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 26, lineHeight: 1 }}>{getHazardIcon(report.type)}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: getHazardColor(report.severity) }}>
                    {report.type?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: getHazardColor(report.severity),
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}>
                  {report.severity} severity • {report.status}
                </div>
                {report.description && (
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 6, lineHeight: 1.4 }}>
                    {report.description}
                  </div>
                )}
                {report.location_label && (
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "flex", alignItems: "flex-start", gap: 4 }}>
                    <span style={{ flexShrink: 0 }}>📍</span>
                    <span>{report.location_label}</span>
                  </div>
                )}
                {report.image_url && (
                  <img
                    src={report.image_url}
                    alt="Hazard"
                    style={{
                      width: "100%",
                      maxHeight: 140,
                      objectFit: "cover",
                      borderRadius: 8,
                      marginTop: 6,
                      marginBottom: 6,
                    }}
                  />
                )}
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  Reported {timeAgo(report.created_date)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. Evacuation Centers Layer */}
        {showEvac && EVACUATION_CENTERS.map((ec) => (
          <Marker
            key={ec.id}
            position={[ec.lat, ec.lng]}
            icon={createEvacuationIcon()}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>⛺</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#065f46" }}>
                    {ec.name}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>
                  📍 {ec.address}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#047857", marginBottom: 4 }}>
                  Capacity: {ec.capacity} evacuees
                </div>
                {ec.contact && (
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                    📞 {ec.contact}
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {ec.facilities?.map((f) => (
                    <span key={f} style={{ fontSize: 10, background: "#ecfdf5", color: "#065f46", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        <EarthquakeLayer visible={showQuakes} />
        <FaultLineLayer visible={showFaults} />
        <FlyToMe trigger={flyTrigger} location={myLocation} realtimePos={myRealTimePosition} />
      </MapContainer>

      {/* Top Bar Controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-3xl glass-cinematic p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl neomorph-raised text-blue-600">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 sm:text-base">Community Safety Map</h1>
              <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 flex-wrap">
                <span className="text-emerald-700 font-semibold">{locations.length} people sharing</span>
                {activeSosAlerts.length > 0 && (
                  <span className="text-rose-600 font-bold animate-pulse"> • 🚨 {activeSosAlerts.length} SOS</span>
                )}
                {hazardReports.length > 0 && (
                  <span className="text-amber-700 font-medium"> • {hazardReports.length} hazards</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Layer Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex clay-card border-0 hover:scale-105 transition-transform text-xs font-semibold">
                  <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-frosted border-white/50 z-[2000] w-48 p-2 space-y-1">
                <DropdownMenuItem onClick={() => setShowPeople(!showPeople)} className="flex items-center justify-between text-xs cursor-pointer">
                  <span>People Sharing</span>
                  <span className="font-bold text-blue-600">{showPeople ? "✓" : ""}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowSos(!showSos)} className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Active SOS Beacons</span>
                  <span className="font-bold text-rose-600">{showSos ? "✓" : ""}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowHazards(!showHazards)} className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Hazard Reports</span>
                  <span className="font-bold text-amber-600">{showHazards ? "✓" : ""}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowEvac(!showEvac)} className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Evacuation Centers</span>
                  <span className="font-bold text-emerald-600">{showEvac ? "✓" : ""}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowQuakes(!showQuakes)} className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Earthquakes</span>
                  <span className="font-bold text-slate-800">{showQuakes ? "✓" : ""}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowFaults(!showFaults)} className="flex items-center justify-between text-xs cursor-pointer">
                  <span>Active Fault Lines</span>
                  <span className="font-bold text-orange-600">{showFaults ? "✓" : ""}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Map Style Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex clay-card border-0 hover:scale-105 transition-transform text-xs">
                  <Layers className="mr-1 h-3.5 w-3.5" /> {MAP_STYLES[mapStyle].label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-frosted border-white/50 z-[2000]">
                {Object.entries(MAP_STYLES).map(([key, s]) => (
                  <DropdownMenuItem key={key} onClick={() => setMapStyle(key)} className={mapStyle === key ? "font-bold bg-blue-50/50" : ""}>
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Find Me Button */}
            {(myLocation || myRealTimePosition) && (
              <Button
                variant="outline"
                size="sm"
                onClick={flyToMe}
                className="hidden sm:flex clay-card border-0 hover:scale-105 transition-transform text-xs"
              >
                <LocateFixed className="mr-1 h-3.5 w-3.5" /> Find Me
              </Button>
            )}

            {/* Share / Settings Button */}
            <Button
              onClick={() => setSharingSettingsOpen(true)}
              disabled={sharing}
              size="sm"
              className={myLocation && sharingStatus === SHARING_STATUS.ACTIVE
                ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md hover:scale-105 transition-transform text-xs"
                : "bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md hover:scale-105 transition-transform text-xs"
              }
            >
              {sharing ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Updating...</>
              ) : myLocation ? (
                <><Share2 className="mr-1.5 h-3.5 w-3.5" />Sharing Controls</>
              ) : (
                <><Share2 className="mr-1.5 h-3.5 w-3.5" />Share My Location</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* People On The Map Panel */}
      {locations.length > 0 && (
        <div className="absolute bottom-3 left-3 z-[1000] w-full max-w-xs">
          <div className="overflow-hidden rounded-3xl glass-cinematic shadow-2xl">
            <button
              onClick={() => setListOpen(!listOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/20 transition-colors"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Users className="h-4 w-4 text-blue-600" />
                People on map ({locations.length})
              </span>
              {listOpen ? <EyeOff className="h-3.5 w-3.5 text-slate-500" /> : <Eye className="h-3.5 w-3.5 text-slate-500" />}
            </button>
            {listOpen && (
              <div className="max-h-56 overflow-y-auto border-t border-white/60 p-2 space-y-1.5">
                {locations.map((loc) => {
                  const isMe = String(loc.created_by_id) === String(user?.id);
                  const isPaused = loc.sharing_status === SHARING_STATUS.PAUSED;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => {
                        if (mapRef.current) {
                          mapRef.current.flyTo([loc.location_lat, loc.location_lng], 15, { duration: 1 });
                        }
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-all hover:bg-white/60 bg-white/40"
                    >
                      {loc.avatar_url ? (
                        <img src={loc.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white shadow" />
                      ) : (
                        <span className="text-xl leading-none">{loc.emoji || "🧍"}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {loc.full_name || "Community member"}{isMe && <span className="text-[10px] text-blue-600"> (you)</span>}
                        </p>
                        <p className="truncate text-[10px] text-slate-500">
                          {loc.location_label || `${loc.location_lat?.toFixed(2)}, ${loc.location_lng?.toFixed(2)}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-[9px] font-semibold text-slate-400">
                        {isPaused ? "Paused" : timeAgo(loc.last_active_at || loc.updated_date)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Privacy & Location Sharing Settings Dialog */}
      <Dialog open={sharingSettingsOpen} onOpenChange={setSharingSettingsOpen}>
        <DialogContent className="sm:max-w-md glass-frosted border-white/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-600" />
              Community Location Sharing & Privacy
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Manage how your location is shared on the live Community Map. You control your privacy at all times.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Privacy Scope Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-blue-600" />
                Visibility Scope (Who can see your marker):
              </label>
              <Select value={sharingVisibility} onValueChange={setSharingVisibility}>
                <SelectTrigger className="bg-white/80 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-frosted border-white/50 z-[2000]">
                  <SelectItem value={SHARING_VISIBILITY.COMMUNITY}>
                    Everyone in AEGIS Community (Open Safety)
                  </SelectItem>
                  <SelectItem value={SHARING_VISIBILITY.TRUSTED_CONTACTS}>
                    Household Members Only (Private Group)
                  </SelectItem>
                  <SelectItem value={SHARING_VISIBILITY.EMERGENCY_ONLY}>
                    Emergency Only (Hidden, broadcast only during active SOS)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Avatar customization shortcut */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white/60 p-3">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-500" />
                ) : (
                  <span className="text-3xl">{emoji}</span>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-900">Map Marker Avatar</p>
                  <p className="text-[11px] text-slate-500">{avatarUrl ? "Custom Profile Photo" : `Emoji Icon: ${emoji}`}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAvatarOpen(true)}
                className="text-xs font-semibold"
              >
                Change Avatar
              </Button>
            </div>

            {/* Sharing status info */}
            {myLocation && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-900">Current Status: <span className={sharingStatus === SHARING_STATUS.ACTIVE ? "text-emerald-700 font-extrabold" : "text-amber-700 font-extrabold"}>{getStatusLabel(sharingStatus)}</span></p>
                <p>📍 Location: {myLocation.location_label || "GPS Locked"}</p>
                <p>⏱ Last broadcast: {timeAgo(myLocation.last_active_at || myLocation.updated_date)}</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col pt-2">
            <div className="flex gap-2 w-full">
              {myLocation && sharingStatus === SHARING_STATUS.ACTIVE ? (
                <Button
                  variant="outline"
                  onClick={handlePauseSharing}
                  className="flex-1 text-amber-700 border-amber-300 hover:bg-amber-50 text-xs font-bold"
                >
                  <Pause className="mr-1.5 h-3.5 w-3.5" /> Pause Sharing
                </Button>
              ) : null}

              <Button
                onClick={() => handleShareLocation(sharingVisibility)}
                disabled={sharing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
              >
                {sharing ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</>
                ) : myLocation ? (
                  <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Update & Broadcast</>
                ) : (
                  <><Share2 className="mr-1.5 h-3.5 w-3.5" />Start Sharing Location</>
                )}
              </Button>
            </div>

            {myLocation && (
              <Button
                variant="ghost"
                onClick={handleStopSharing}
                className="w-full text-rose-600 hover:bg-rose-50 text-xs font-semibold"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Stop Sharing & Remove My Marker
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avatar Picker Dialog */}
      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="sm:max-w-md glass-frosted border-white/50">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Choose Map Marker Avatar</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Current Marker</p>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="mx-auto h-16 w-16 rounded-full object-cover ring-4 ring-blue-500 shadow-md" />
              ) : (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl shadow-md">{emoji}</div>
              )}
            </div>

            {/* Photo option */}
            <div className="rounded-xl border border-slate-200 bg-white/70 p-3.5">
              <p className="text-xs font-bold text-slate-800 mb-2">Option 1: Upload Photo</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={uploadPhoto}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1 text-xs"
                >
                  {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Camera className="mr-1 h-3 w-3" />}
                  {avatarUrl ? "Change Photo" : "Upload Photo"}
                </Button>
                {avatarUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setAvatarUrl(null); }}
                    className="text-rose-600 hover:bg-rose-50 text-xs"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Emoji Grid */}
            <div className="rounded-xl border border-slate-200 bg-white/70 p-3.5">
              <p className="text-xs font-bold text-slate-800 mb-2">Option 2: Choose Emoji Icon</p>
              <div className="grid grid-cols-8 gap-1.5">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    onClick={() => updateEmoji(e)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl hover:bg-blue-100 transition-colors ${
                      emoji === e && !avatarUrl ? "bg-blue-100 ring-2 ring-blue-500" : ""
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvatarOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}