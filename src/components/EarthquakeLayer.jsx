import React, { useEffect, useState } from "react";
import { CircleMarker, Popup } from "react-leaflet";
import { Loader2 } from "lucide-react";

// Philippines region bounds
const MIN_LAT = 4;
const MAX_LAT = 21;
const MIN_LNG = 116;
const MAX_LNG = 127;
const MIN_MAG = 2.5;
const DAYS = 30;

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

export default function EarthquakeLayer({ visible }) {
  const [quakes, setQuakes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      setQuakes(data.features || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) fetchQuakes();
  }, [visible]);

  // Refresh every 5 minutes while visible
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(fetchQuakes, 5 * 60 * 1000);
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
      {quakes.map((q) => {
        const [lng, lat, depth] = q.geometry.coordinates;
        const { mag, place, time, url } = q.properties;
        const color = magColor(mag);
        return (
          <CircleMarker
            key={q.id}
            center={[lat, lng]}
            radius={magRadius(mag)}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.55,
              weight: 1.5,
            }}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
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
    </>
  );
}

export { magColor, magRadius };