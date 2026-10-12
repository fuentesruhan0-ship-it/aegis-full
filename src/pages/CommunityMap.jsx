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
  MapPin, Share2, Loader2, Users, Crosshair, Eye, EyeOff, Smile, Camera, Trash2, Layers, LocateFixed, Activity
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import EarthquakeLayer from "@/components/EarthquakeLayer";
import FaultLineLayer from "@/components/FaultLineLayer";

const TUPI_CENTER = [6.2356, 125.0286];

// Get API keys from environment variables
const STADIA_API_KEY = import.meta.env.VITE_STADIA_MAPS_API_KEY || '';
const THUNDERFOREST_API_KEY = import.meta.env.VITE_THUNDERFOREST_API_KEY || '';

const MAP_STYLES = {
  alidade_smooth_dark: {
    label: "Smooth Dark",
    // Stadia Alidade Smooth Dark - beautiful dark topo map
    url: STADIA_API_KEY
      ? `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${STADIA_API_KEY}`
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: STADIA_API_KEY
      ? "&copy; <a href='https://stadiamaps.com/'>Stadia Maps</a>, &copy; <a href='https://openmaptiles.org/'>OpenMapTiles</a> &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors"
      : "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>",
    maxZoom: 20,
    subdomains: "abcd",
  },
  dark_topo: {
    label: "Dark Topo",
    // Use standard OpenStreetMap with CSS dark mode filter - completely free, no API key
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    subdomains: "abc",
    maxZoom: 19,
    // Apply dark mode filter to convert light tiles to dark
    filter: "invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)",
  },
  outdoors: {
    label: "Outdoors",
    // Use Stadia Outdoors if API key available, otherwise use free alternative
    url: STADIA_API_KEY
      ? `https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png?api_key=${STADIA_API_KEY}`
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: STADIA_API_KEY
      ? "&copy; <a href='https://stadiamaps.com/'>Stadia Maps</a>, &copy; <a href='https://openmaptiles.org/'>OpenMapTiles</a> &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors"
      : "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
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
    attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
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

function createPhotoIcon(url, isMe) {
  return L.divIcon({
    html: `<div style="width:38px;height:38px;border-radius:50%;overflow:hidden;border:3px solid ${isMe ? "#2563eb" : "white"};box-shadow:0 2px 8px rgba(0,0,0,0.35);"><img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block;"/></div>`,
    className: "aegis-photo-marker",
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function getMarkerIcon(loc, isMe) {
  if (loc.avatar_url) return createPhotoIcon(loc.avatar_url, isMe);
  return createEmojiIcon(loc.emoji || "🧍", isMe);
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
    low: "#eab308",      // yellow
    medium: "#f97316",   // orange
    high: "#dc2626",     // red
    critical: "#7c1d1d", // dark red
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
    // Only fly if trigger actually changed (not just a re-render)
    if (trigger > 0 && trigger !== lastTrigger.current) {
      lastTrigger.current = trigger;
      
      // Use real-time position if available, otherwise use saved location
      const lat = realtimePos?.lat || location?.location_lat;
      const lng = realtimePos?.lng || location?.location_lng;
      
      if (lat && lng) {
        console.log("🎯 Flying to location:", lat, lng);
        map.flyTo([lat, lng], 15, { duration: 1.2 });
      }
    }
  }, [trigger, realtimePos, location, map]);
  
  return null;
}

// Component to handle map clicks and show location info
function MapClickHandler({ onLocationClick }) {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = async (e) => {
      const { lat, lng } = e.latlng;
      
      // Get location information from OpenStreetMap
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        
        // Create a popup with location info
        const popup = L.popup()
          .setLatLng([lat, lng])
          .setContent(`
            <div style="min-width: 240px;">
              <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                📍 Location Info
              </div>
              ${data.display_name ? `
                <div style="font-size: 12px; color: #475569; margin-bottom: 8px; line-height: 1.5;">
                  ${data.display_name}
                </div>
              ` : ''}
              ${data.address ? `
                <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; padding: 8px; background: rgba(241, 245, 249, 0.8); border-radius: 8px;">
                  ${data.address.road ? `<div><strong>Street:</strong> ${data.address.road}</div>` : ''}
                  ${data.address.suburb || data.address.neighbourhood ? `<div><strong>Area:</strong> ${data.address.suburb || data.address.neighbourhood}</div>` : ''}
                  ${data.address.city || data.address.town || data.address.village ? `<div><strong>City:</strong> ${data.address.city || data.address.town || data.address.village}</div>` : ''}
                  ${data.address.state ? `<div><strong>State:</strong> ${data.address.state}</div>` : ''}
                  ${data.address.postcode ? `<div><strong>Postcode:</strong> ${data.address.postcode}</div>` : ''}
                  ${data.address.country ? `<div><strong>Country:</strong> ${data.address.country}</div>` : ''}
                </div>
              ` : ''}
              <div style="font-size: 11px; color: #94a3b8; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(203, 213, 225, 0.5);">
                <div><strong>Latitude:</strong> ${lat.toFixed(6)}</div>
                <div><strong>Longitude:</strong> ${lng.toFixed(6)}</div>
              </div>
            </div>
          `)
          .openOn(map);
      } catch (error) {
        console.error('Failed to fetch location info:', error);
        
        // Fallback popup with just coordinates
        L.popup()
          .setLatLng([lat, lng])
          .setContent(`
            <div style="min-width: 200px;">
              <div style="font-weight: 700; font-size: 14px; color: #1e293b; margin-bottom: 8px;">
                📍 Location
              </div>
              <div style="font-size: 11px; color: #94a3b8;">
                <div><strong>Latitude:</strong> ${lat.toFixed(6)}</div>
                <div><strong>Longitude:</strong> ${lng.toFixed(6)}</div>
              </div>
            </div>
          `)
          .openOn(map);
      }
    };
    
    map.on('click', handleClick);
    
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onLocationClick]);
  
  return null;
}

export default function CommunityMap() {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [hazardReports, setHazardReports] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [myRealTimePosition, setMyRealTimePosition] = useState(null); // Real-time GPS position
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [emoji, setEmoji] = useState("🧍");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);
  const autoShared = useRef(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [flyTrigger, setFlyTrigger] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [mapStyle, setMapStyle] = useState("dark_topo");
  const [follow, setFollow] = useState(false);
  const [showQuakes, setShowQuakes] = useState(true);
  const [showFaults, setShowFaults] = useState(false);
  const [, setNowTick] = useState(0);
  const [tracking, setTracking] = useState(false); // GPS tracking state
  const watchIdRef = useRef(null);

  // Keep "time ago" labels live so they never go stale
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const fileInputRef = useRef(null);
  const mapRef = useRef(null);

  const loadLocations = useCallback(async () => {
    try {
      const list = await base44.entities.UserLocation.list("-updated_date", 500);
      setLocations(list || []);
      const mine = (list || []).find((l) => l.created_by_id === user?.id);
      setMyLocation(mine);
      if (mine?.emoji) setEmoji(mine.emoji);
      if (mine?.avatar_url) setAvatarUrl(mine.avatar_url);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadHazardReports = useCallback(async () => {
    try {
      // Load all hazard reports (open visibility per spec)
      const reports = await base44.entities.HazardReport.list("-created_date", 500);
      // Filter only reports with location data
      const reportsWithLocation = (reports || []).filter(
        (r) => r.location_lat != null && r.location_lng != null
      );
      setHazardReports(reportsWithLocation);
    } catch (e) {
      console.error("Failed to load hazard reports:", e);
    }
  }, []);

  useEffect(() => {
    loadLocations();
    loadHazardReports();
    const unsubLoc = base44.entities.UserLocation.subscribe(() => {
      loadLocations();
    });
    const unsubHazard = base44.entities.HazardReport.subscribe(() => {
      loadHazardReports();
    });
    return () => {
      unsubLoc();
      unsubHazard();
    };
  }, [loadLocations, loadHazardReports]);

  // Center the map on the user ONLY ONCE on very first load
  const hasInitialCentered = useRef(false);
  const hasEverHadLocation = useRef(false);
  
  useEffect(() => {
    if (myLocation?.id) {
      hasEverHadLocation.current = true;
      
      // Only center if this is the VERY FIRST time we got a location
      if (!hasInitialCentered.current) {
        setFlyTrigger((t) => t + 1);
        hasInitialCentered.current = true;
      }
    }
  }, [myLocation?.id]);

  // Start real-time GPS tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("GPS tracking is not supported by your browser");
      return;
    }

    setTracking(true);
    
    // Watch position with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        
        // Update real-time position for immediate display
        setMyRealTimePosition(newPos);
        
        // Update server every 10 seconds (debounced)
        updateServerLocation(newPos);
      },
      (error) => {
        console.error("GPS error:", error);
        alert("Unable to get your location. Please enable GPS and location permissions.");
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Stop GPS tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  // Debounced server update (only update server every 10 seconds)
  const updateServerLocation = useCallback(
    (() => {
      let timeout;
      return (pos) => {
        clearTimeout(timeout);
        timeout = setTimeout(async () => {
          if (!myLocation) return;
          
          try {
            const label = await reverseGeocode(pos.lat, pos.lng);
            const updated = await base44.entities.UserLocation.update(myLocation.id, {
              location_lat: pos.lat,
              location_lng: pos.lng,
              location_label: label,
            });
            setMyLocation(updated);
            
            // Store in localStorage for offline support
            localStorage.setItem('my_last_position', JSON.stringify(pos));
          } catch (e) {
            console.error("Failed to update location:", e);
            // Continue tracking even if server update fails (offline mode)
          }
        }, 10000); // Update server every 10 seconds
      };
    })(),
    [myLocation]
  );

  // Don't auto-start tracking - let user control when GPS updates
  // Tracking still happens in background but doesn't move the map

  // Load last known position from localStorage (offline support)
  useEffect(() => {
    const lastPos = localStorage.getItem('my_last_position');
    if (lastPos && !myRealTimePosition) {
      try {
        setMyRealTimePosition(JSON.parse(lastPos));
      } catch (e) {
        console.error("Failed to load last position");
      }
    }
  }, []);

  // Follow mode is now MANUAL only - never auto-triggers
  // User must explicitly click Follow button to enable tracking

  // Disable follow mode when user manually interacts with map
  useEffect(() => {
    // This is now just a placeholder - follow mode is completely disabled
    // Map never auto-follows, only responds to manual "Find Me" button clicks
  }, []);

  // Put every user on the map automatically the first time they open it
  useEffect(() => {
    if (!loading && !myLocation && user && !autoShared.current) {
      autoShared.current = true;
      shareLocation(true);
    }
  }, [loading, myLocation, user]);

  const shareLocation = async (silent = false) => {
    setSharing(true);
    try {
      const pos = await getLocation();
      if (!pos) {
        if (silent !== true) alert("Unable to get your location. Please allow location access in your browser settings and try again.");
        return;
      }
      const label = await reverseGeocode(pos.lat, pos.lng);
      const name = user?.full_name || user?.email || "User";
      
      // Use the user's profile photo if available, otherwise use emoji
      const payload = {
        location_lat: pos.lat,
        location_lng: pos.lng,
        location_label: label,
        emoji: user?.avatar_url ? null : emoji,
        avatar_url: user?.avatar_url || avatarUrl,
        full_name: name,
      };
      
      if (myLocation) {
        const updated = await base44.entities.UserLocation.update(myLocation.id, payload);
        setMyLocation(updated);
      } else {
        const created = await base44.entities.UserLocation.create(payload);
        setMyLocation(created);
      }
      try { await base44.auth.updateMe({ location_lat: pos.lat, location_lng: pos.lng }); } catch (e) { /* non-critical */ }
      // Don't auto-fly on location share - let user stay where they are exploring
    } catch (e) {
      alert("Failed to share location: " + e.message);
    } finally {
      setSharing(false);
    }
  };

  const updateEmoji = async (newEmoji) => {
    setEmoji(newEmoji);
    setAvatarUrl(null);
    setAvatarOpen(false);
    if (myLocation) {
      try {
        const updated = await base44.entities.UserLocation.update(myLocation.id, { emoji: newEmoji, avatar_url: null });
        setMyLocation(updated);
      } catch (e) { console.error(e); }
    }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setAvatarUrl(file_url);
      await base44.auth.updateMe({ avatar_url: file_url });
      if (myLocation) {
        const updated = await base44.entities.UserLocation.update(myLocation.id, { avatar_url: file_url });
        setMyLocation(updated);
      }
      setAvatarOpen(false);
    } catch (err) {
      alert("Failed to upload photo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    setAvatarUrl(null);
    await base44.auth.updateMe({ avatar_url: null });
    if (myLocation) {
      try {
        const updated = await base44.entities.UserLocation.update(myLocation.id, { avatar_url: null });
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
    if (myLocation) {
      setFlyTrigger((t) => t + 1);
      // Don't enable continuous follow - just fly once
    }
  };

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
        {locations.map((loc) => {
          const isMe = loc.created_by_id === user?.id;
          
          // Use real-time position for "me" marker if available
          const markerLat = isMe && myRealTimePosition ? myRealTimePosition.lat : loc.location_lat;
          const markerLng = isMe && myRealTimePosition ? myRealTimePosition.lng : loc.location_lng;
          
          return (
            <Marker
              key={loc.id}
              position={[markerLat, markerLng]}
              icon={getMarkerIcon(loc, isMe)}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    {loc.avatar_url ? (
                      <img src={loc.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.7)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }} />
                    ) : (
                      <span style={{ fontSize: 26, lineHeight: 1 }}>{loc.emoji || "🧍"}</span>
                    )}
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
                      {loc.full_name || "Community member"}{isMe ? " (you)" : ""}
                    </span>
                  </div>
                  {isMe && tracking && (
                    <div style={{ fontSize: 11, color: "#10b981", marginBottom: 4, fontWeight: 600 }}>
                      🟢 Live tracking active
                    </div>
                  )}
                  {loc.location_label && (
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, display: "flex", alignItems: "flex-start", gap: 4 }}>
                      <span style={{ flexShrink: 0 }}>📍</span>
                      <span>{loc.location_label}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: isMe ? 8 : 0 }}>
                    Updated {timeAgo(loc.updated_date || loc.created_date)}
                  </div>
                  {isMe && (
                    <button
                      onClick={() => setAvatarOpen(true)}
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
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}
                    >
                      ✏️ Edit avatar
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
        {/* Hazard Report markers */}
        {hazardReports.map((report) => (
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
                    {report.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
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
                      maxHeight: 150,
                      objectFit: "cover",
                      borderRadius: 8,
                      marginTop: 8,
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
        <EarthquakeLayer visible={showQuakes} />
        <FaultLineLayer visible={showFaults} />
        <MapClickHandler />
        <FlyToMe trigger={flyTrigger} location={myLocation} realtimePos={myRealTimePosition} />
      </MapContainer>

      {/* Top bar overlay - Enhanced Glassmorphism */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-3xl glass-cinematic p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl neomorph-raised text-blue-600">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 sm:text-base">Community Map</h1>
              <p className="text-xs text-slate-600 font-medium">
                {tracking && <span className="text-emerald-600 font-bold">🟢 Live tracking • </span>}
                {locations.length} {locations.length === 1 ? "person" : "people"} sharing
                {hazardReports.length > 0 && ` • ${hazardReports.length} hazard${hazardReports.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {myLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAvatarOpen(true)}
                className="hidden sm:flex clay-card border-0 hover:scale-105 transition-transform"
              >
                {avatarUrl ? <Camera className="mr-1 h-4 w-4" /> : <span className="text-lg leading-none">{emoji}</span>}
                <Smile className="ml-1 h-4 w-4 text-slate-400" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuakes((v) => !v)}
              className={`hidden sm:flex clay-card border-0 hover:scale-105 transition-transform ${showQuakes ? "clay-card-pressed ring-2 ring-rose-400" : ""}`}
              title="Toggle earthquake detection"
            >
              <Activity className="mr-1 h-4 w-4" /> Quakes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFaults((v) => !v)}
              className={`hidden sm:flex clay-card border-0 hover:scale-105 transition-transform ${showFaults ? "clay-card-pressed ring-2 ring-orange-400" : ""}`}
              title="Toggle active fault lines"
            >
              ⚠️ Faults
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex clay-card border-0 hover:scale-105 transition-transform">
                  <Layers className="mr-1 h-4 w-4" /> {MAP_STYLES[mapStyle].label}
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
            {myLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => flyToMe()}
                className="hidden sm:flex clay-card border-0 hover:scale-105 transition-transform"
              >
                <LocateFixed className="mr-1 h-4 w-4" /> Find Me
              </Button>
            )}
            <Button
              onClick={() => shareLocation()}
              disabled={sharing}
              size="sm"
              className={myLocation 
                ? "glass-tinted-emerald border-emerald-300/50 hover:scale-105 transition-transform shadow-lg glow-emerald" 
                : "glass-tinted-blue border-blue-300/50 hover:scale-105 transition-transform shadow-lg glow-blue"}
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

      {/* Not sharing banner - Enhanced Glass */}
      {!myLocation && !loading && !sharing && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-[1000] flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl glass-tinted-blue px-5 py-4 shadow-xl">
            <Users className="h-6 w-6 shrink-0 text-blue-600" />
            <p className="text-sm text-blue-900 font-medium">
              You're not on the map yet. Share your location to let your household and community see you.
            </p>
          </div>
        </div>
      )}

      {/* User list panel - Enhanced Glass */}
      {locations.length > 0 && (
        <div className="absolute bottom-0 left-0 z-[1000] w-full sm:w-80">
          <div className="m-3 overflow-hidden rounded-3xl glass-cinematic shadow-2xl">
            <button
              onClick={() => setListOpen(!listOpen)}
              className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-white/20 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-5 w-5 text-blue-600" />
                People on the map ({locations.length})
              </span>
              {listOpen ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
            </button>
            {listOpen && (
              <div className="max-h-64 overflow-y-auto border-t border-white/60 px-3 py-3">
                <ul className="space-y-2">
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
                          className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all hover:bg-white/40 hover:scale-[1.02] neomorph-inset"
                        >
                          {loc.avatar_url ? (
                            <img src={loc.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white shadow-lg" />
                          ) : (
                            <span className="text-3xl leading-none">{loc.emoji || "🧍"}</span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {loc.full_name || "Community member"}{isMe && <span className="text-xs text-blue-600 font-extrabold"> (you)</span>}
                            </p>
                            <p className="truncate text-xs text-slate-500 font-medium">
                              {loc.location_label || `${loc.location_lat?.toFixed(3)}, ${loc.location_lng?.toFixed(3)}`}
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] text-slate-400 font-semibold">{timeAgo(loc.updated_date || loc.created_date)}</span>
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

      {/* My location controls (mobile) - Clay Buttons */}
      {myLocation && (
        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-3 sm:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowQuakes((v) => !v)}
            className={`h-14 w-14 rounded-full clay-card border-0 shadow-xl hover:scale-110 transition-transform ${showQuakes ? "clay-card-pressed ring-2 ring-rose-400" : ""}`}
            title="Toggle earthquake detection"
          >
            <Activity className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFaults((v) => !v)}
            className={`h-14 w-14 rounded-full clay-card border-0 shadow-xl hover:scale-110 transition-transform ${showFaults ? "clay-card-pressed ring-2 ring-orange-400" : ""}`}
            title="Toggle active fault lines"
          >
            <span className="text-2xl">⚠️</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-14 w-14 rounded-full clay-card border-0 shadow-xl hover:scale-110 transition-transform">
                <Layers className="h-6 w-6 text-blue-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-frosted border-white/50">
              {Object.entries(MAP_STYLES).map(([key, s]) => (
                <DropdownMenuItem key={key} onClick={() => setMapStyle(key)} className={mapStyle === key ? "font-bold bg-blue-50/50" : ""}>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon"
            onClick={() => flyToMe()}
            className="h-14 w-14 rounded-full clay-card border-0 shadow-xl hover:scale-110 transition-transform"
          >
            <LocateFixed className="h-6 w-6 text-blue-600" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAvatarOpen(true)}
            className="h-14 w-14 rounded-full clay-card border-0 shadow-xl hover:scale-110 transition-transform"
          >
            {avatarUrl ? <Camera className="h-6 w-6 text-blue-600" /> : <span className="text-2xl">{emoji}</span>}
          </Button>
        </div>
      )}

      {/* Avatar picker dialog (emoji or photo) - Enhanced Glass */}
      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
        <DialogContent className="sm:max-w-md glass-frosted border-white/50">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Choose your map avatar</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {/* Current selection */}
            <div className="mb-5 flex items-center justify-center">
              <div className="text-center">
                <p className="mb-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Current avatar</p>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-blue-400 shadow-xl" />
                ) : (
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full neomorph-raised text-4xl">{emoji}</div>
                )}
              </div>
            </div>

            {/* Photo option */}
            <div className="mb-4 rounded-2xl clay-card p-5">
              <p className="mb-3 text-sm font-bold text-slate-800">Option 1: Use your profile photo</p>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={uploadPhoto}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1 clay-card border-0 hover:scale-105 transition-transform"
                >
                  {uploading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                  ) : avatarUrl ? (
                    <><Camera className="mr-2 h-4 w-4" />Change photo</>
                  ) : (
                    <><Camera className="mr-2 h-4 w-4" />Upload photo</>
                  )}
                </Button>
                {avatarUrl && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={removePhoto} 
                    title="Remove photo"
                    className="text-rose-500 hover:bg-rose-50 neomorph-inset rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {avatarUrl && (
                <p className="mt-3 text-xs text-emerald-600 font-bold">✓ Photo is active on the map</p>
              )}
            </div>

            {/* Emoji option */}
            <div className="rounded-2xl clay-card p-5">
              <p className="mb-3 text-sm font-bold text-slate-800">Option 2: Pick an emoji</p>
              <div className="grid grid-cols-8 gap-2">
                {EMOJI_CHOICES.map((e) => (
                  <button
                    key={e}
                    onClick={() => updateEmoji(e)}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all hover:scale-110 ${
                      emoji === e && !avatarUrl ? "neomorph-raised ring-2 ring-blue-400" : "neomorph-inset hover:neomorph"
                    }`}
                    title="Click to use this emoji"
                  >
                    {e}
                  </button>
                ))}
              </div>
              {!avatarUrl && (
                <p className="mt-3 text-xs text-emerald-600 font-bold">✓ Emoji is active on the map</p>
              )}
            </div>
          </div>
          {myLocation && (
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button variant="outline" onClick={removeLocation} className="w-full text-rose-600 hover:bg-rose-50 clay-card border-0">
                Stop sharing my location
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}