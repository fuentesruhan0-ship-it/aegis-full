import React, { useEffect, useState, useRef } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import { Loader2, Bell } from "lucide-react";

// Philippines region bounds
const MIN_LAT = 4;
const MAX_LAT = 21;
const MIN_LNG = 116;
const MAX_LNG = 127;
const MIN_MAG = 2.5;
const DAYS = 30; // Show earthquakes from last 30 days
const ARCHIVE_DAYS = 60; // Archive earthquakes older than 60 days

function magColor(mag) {
  if (mag >= 6) return "#7c1d1d"; // major
  if (mag >= 5) return "#dc2626"; // strong
  if (mag >= 4) return "#f97316"; // moderate
  if (mag >= 3) return "#eab308"; // light
  return "#65a30d";               // minor
}

function magRadius(mag) {
  return Math.max(8, 6 + mag * 4);
}

function fmtTime(ms) {
  const d = new Date(ms);
  return d.toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Vibrate device for earthquake alert
function vibrateDevice(magnitude) {
  if (!navigator.vibrate) return;
  
  // Vibration pattern based on magnitude
  if (magnitude >= 6) {
    // Major: Long intense vibration
    navigator.vibrate([500, 100, 500, 100, 500]);
  } else if (magnitude >= 5) {
    // Strong: Medium vibration
    navigator.vibrate([300, 100, 300, 100, 300]);
  } else if (magnitude >= 4) {
    // Moderate: Short vibration
    navigator.vibrate([200, 100, 200]);
  } else {
    // Light: Single vibration
    navigator.vibrate(150);
  }
}

// Check if earthquake is "recent" (within last 10 minutes)
function isRecentQuake(time) {
  return Date.now() - time < 10 * 60 * 1000;
}

export default function EarthquakeLayer({ visible }) {
  const [quakes, setQuakes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newQuakeAlert, setNewQuakeAlert] = useState(null);
  const previousQuakeIds = useRef(new Set());
  const hasVibrated = useRef(new Set());

  const fetchQuakes = async () => {
    setLoading(true);
    setError(null);
    try {
      const start = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
      const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson` +
        `&starttime=${start}` +
        `&minlatitude=${MIN_LAT}&maxlatitude=${MAX_LAT}` +
        `&minlongitude=${MIN_LNG}&maxlongitude=${MAX_LNG}` +
        `&minmagnitude=${MIN_MAG}` +
        `&orderby=time`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`USGS responded ${res.status}`);
      const data = await res.json();
      const features = data.features || [];
      
      // Check for new earthquakes
      const newQuakes = features.filter(q => !previousQuakeIds.current.has(q.id));
      
      // Alert and vibrate for recent earthquakes
      newQuakes.forEach(q => {
        const { mag, place, time } = q.properties;
        if (isRecentQuake(time) && !hasVibrated.current.has(q.id)) {
          // Vibrate device
          vibrateDevice(mag);
          hasVibrated.current.add(q.id);
          
          // Show alert
          setNewQuakeAlert({
            mag,
            place,
            time,
            id: q.id,
          });
          
          // Auto-hide alert after 10 seconds
          setTimeout(() => {
            setNewQuakeAlert(null);
          }, 10000);
          
          // Browser notification (if permitted)
          if (Notification.permission === "granted") {
            new Notification(`🚨 Earthquake Detected: M${mag.toFixed(1)}`, {
              body: place || "Nearby earthquake detected",
              icon: "/aegis-icon.png",
              tag: q.id,
            });
          }
        }
        
        previousQuakeIds.current.add(q.id);
      });
      
      setQuakes(features);
      
      // Archive old earthquakes (older than 60 days) to history
      await archiveOldQuakes(features);
      
    } catch (e) {
      console.error("Earthquake fetch error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Archive earthquakes older than 60 days to Base44 storage
  const archiveOldQuakes = async (currentQuakes) => {
    try {
      const archiveDate = Date.now() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000;
      const oldQuakes = currentQuakes.filter(q => q.properties.time < archiveDate);
      
      if (oldQuakes.length === 0) return;
      
      // Store in Base44 as earthquake history
      // Check if we have an EarthquakeHistory entity, if not just log
      console.log(`Archiving ${oldQuakes.length} old earthquakes to history`);
      
      // You can implement actual Base44 storage here if you create an EarthquakeHistory entity
      // Example:
      // for (const quake of oldQuakes) {
      //   await base44.entities.EarthquakeHistory.create({
      //     usgs_id: quake.id,
      //     magnitude: quake.properties.mag,
      //     place: quake.properties.place,
      //     time: new Date(quake.properties.time).toISOString(),
      //     latitude: quake.geometry.coordinates[1],
      //     longitude: quake.geometry.coordinates[0],
      //     depth: quake.geometry.coordinates[2],
      //   });
      // }
    } catch (e) {
      console.error("Failed to archive old earthquakes:", e);
    }
  };

  // Request notification permission on first load
  useEffect(() => {
    if (visible && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) fetchQuakes();
  }, [visible]);

  // Refresh every 2 minutes while visible (faster for real-time detection)
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(fetchQuakes, 2 * 60 * 1000);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;

  if (loading && quakes.length === 0) {
    return (
      <div className="absolute right-3 top-24 z-[1000] flex items-center gap-2 rounded-xl glass-cinematic px-3 py-2 text-xs text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
        Detecting earthquakes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute right-3 top-24 z-[1000] rounded-xl glass-cinematic px-3 py-2 text-xs text-rose-600">
        Couldn't load earthquake data
      </div>
    );
  }

  return (
    <>
      {/* New earthquake alert banner */}
      {newQuakeAlert && (
        <div className="absolute left-1/2 top-24 z-[1001] -translate-x-1/2 animate-bounce">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-6 py-4 shadow-2xl">
            <Bell className="h-6 w-6 text-white animate-pulse" />
            <div>
              <div className="text-sm font-bold text-white">
                🚨 EARTHQUAKE DETECTED - M{newQuakeAlert.mag.toFixed(1)}
              </div>
              <div className="text-xs text-rose-100">
                {newQuakeAlert.place} · {timeAgo(newQuakeAlert.time)}
              </div>
            </div>
            <button
              onClick={() => setNewQuakeAlert(null)}
              className="text-white hover:text-rose-200 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Earthquake markers */}
      {quakes.map((q) => {
        const [lng, lat, depth] = q.geometry.coordinates;
        const { mag, place, time, url } = q.properties;
        const color = magColor(mag);
        const isRecent = isRecentQuake(time);
        
        return (
          <CircleMarker
            key={q.id}
            center={[lat, lng]}
            radius={magRadius(mag)}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: isRecent ? 0.8 : 0.55,
              weight: isRecent ? 2.5 : 1.5,
            }}
            className={isRecent ? "animate-pulse" : ""}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                {isRecent && (
                  <div style={{
                    background: "linear-gradient(135deg, #dc2626, #991b1b)",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    marginBottom: 8,
                    textAlign: "center",
                    textTransform: "uppercase",
                  }}>
                    🔴 LIVE - Just detected!
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    minWidth: 44, height: 28, borderRadius: 8,
                    background: color, color: "white", fontWeight: 700, fontSize: 14, padding: "0 8px",
                  }}>
                    M{mag.toFixed(1)}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
                    Earthquake detected
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                  📍 {place || `${lat.toFixed(3)}, ${lng.toFixed(3)}`}
                </div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                  📏 Depth: {depth.toFixed(1)} km
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
                  {fmtTime(time)} · {timeAgo(time)}
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block", fontSize: 12, fontWeight: 600,
                    color: "#dc2626", textDecoration: "none",
                  }}
                >
                  View on USGS →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
      
      {/* Earthquake count indicator */}
      {quakes.length > 0 && (
        <div className="absolute right-3 top-32 z-[1000] flex items-center gap-2 rounded-xl glass-cinematic px-3 py-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="font-semibold text-slate-700">
            {quakes.length} earthquake{quakes.length === 1 ? "" : "s"} (last 30 days)
          </span>
        </div>
      )}
    </>
  );
}

export { magColor, magRadius };