import React, { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  MapPin, Navigation, Search, Tent, Building2, TreePine,
  Phone, Users, ChevronRight,
  LocateFixed, Loader2
} from "lucide-react";

// Evacuation centers and safe spaces for Tupi, South Cotabato area
export const EVACUATION_CENTERS = [
  {
    id: "ec1", name: "Tupi Municipal Gymnasium",
    type: "evacuation_center",
    lat: 6.3330, lng: 125.0290,
    address: "National Highway, Poblacion, Tupi, South Cotabato",
    capacity: 500, contact: "(083) 228-3095",
    facilities: ["restrooms", "water", "medical", "electricity", "parking"],
    description: "Primary evacuation center for Tupi municipality. Large covered gymnasium with capacity for 500 evacuees."
  },
  {
    id: "ec2", name: "Tupi Central Elementary School",
    type: "evacuation_center",
    lat: 6.3335, lng: 125.0285,
    address: "Poblacion, Tupi, South Cotabato",
    capacity: 300, contact: "(083) 228-3200",
    facilities: ["restrooms", "water", "electricity", "wifi"],
    description: "Secondary evacuation center with multiple classrooms that can serve as temporary shelters."
  },
  {
    id: "ec3", name: "Barangay Hall - Crossing Rubber",
    type: "evacuation_center",
    lat: 6.3410, lng: 125.0180,
    address: "Crossing Rubber, Tupi, South Cotabato",
    capacity: 150, contact: "",
    facilities: ["restrooms", "water"],
    description: "Barangay-level evacuation point for Crossing Rubber residents."
  },
  {
    id: "ec4", name: "SEIATI Campus Covered Court",
    type: "evacuation_center",
    lat: 6.3265, lng: 125.0305,
    address: "South East Asian Institute of Technology, Tupi",
    capacity: 400, contact: "(083) 228-3100",
    facilities: ["restrooms", "water", "electricity", "medical", "wifi", "parking"],
    description: "University campus facility with large covered court. Near National Highway with good vehicle access."
  },
  {
    id: "ec5", name: "Barangay Hall - Bololmala",
    type: "evacuation_center",
    lat: 6.3150, lng: 125.0420,
    address: "Bololmala, Tupi, South Cotabato",
    capacity: 100, contact: "",
    facilities: ["restrooms", "water"],
    description: "Rural barangay evacuation point serving Bololmala and nearby sitios."
  },
];

const SAFE_OPEN_SPACES = [
  {
    id: "os1", name: "Tupi Municipal Plaza",
    type: "open_space",
    lat: 6.3328, lng: 125.0292,
    address: "Poblacion, Tupi, South Cotabato",
    area: "~2,000 sqm",
    description: "Central town plaza, flat open ground away from tall structures. Primary gathering point for the poblacion area."
  },
  {
    id: "os2", name: "SEIATI Open Field",
    type: "open_space",
    lat: 6.3260, lng: 125.0310,
    address: "SEIATI Campus, Tupi, South Cotabato",
    area: "~5,000 sqm",
    description: "Large open athletic field within the SEIATI campus. Flat, clear area suitable for temporary assembly."
  },
  {
    id: "os3", name: "Tupi Public Market Open Area",
    type: "open_space",
    lat: 6.3340, lng: 125.0280,
    address: "Public Market Area, Tupi, South Cotabato",
    area: "~1,500 sqm",
    description: "Parking and open area adjacent to the public market. Open to sky with minimal nearby tall structures."
  },
  {
    id: "os4", name: "Crossing Rubber Sports Field",
    type: "open_space",
    lat: 6.3405, lng: 125.0175,
    address: "Crossing Rubber, Tupi, South Cotabato",
    area: "~3,000 sqm",
    description: "Community sports field with flat open terrain. Used as assembly point during drills."
  },
  {
    id: "os5", name: "Kablon Rice Paddy Fields (Emergency Area)",
    type: "open_space",
    lat: 6.3380, lng: 125.0350,
    address: "Kablon, Tupi, South Cotabato",
    area: "Open area",
    description: "Open agricultural land that can serve as emergency assembly area. Wide and flat with no overhead hazards."
  },
];

const ALL_LOCATIONS = [...EVACUATION_CENTERS, ...SAFE_OPEN_SPACES];

const FACILITY_ICONS = {
  restrooms: { icon: "🚻", label: "Restrooms" },
  water: { icon: "💧", label: "Clean Water" },
  medical: { icon: "🏥", label: "Medical Aid" },
  electricity: { icon: "⚡", label: "Electricity" },
  wifi: { icon: "📶", label: "Wi-Fi" },
  parking: { icon: "🅿️", label: "Parking" },
};

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function EvacuationLocator() {
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); // "all" | "evacuation_center" | "open_space"
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        alert("Unable to get your location: " + err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const locationsWithDistance = useMemo(() => {
    return ALL_LOCATIONS.map(loc => ({
      ...loc,
      distance: userLocation
        ? haversineDistance(userLocation.lat, userLocation.lng, loc.lat, loc.lng)
        : null,
    }));
  }, [userLocation]);

  const filteredLocations = useMemo(() => {
    let locs = locationsWithDistance;
    if (filter !== "all") {
      locs = locs.filter(l => l.type === filter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      locs = locs.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q)
      );
    }
    if (userLocation) {
      locs = locs.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    return locs;
  }, [locationsWithDistance, filter, searchQuery, userLocation]);

  const nearestEvac = useMemo(() => {
    if (!userLocation) return null;
    const evacs = locationsWithDistance.filter(l => l.type === "evacuation_center");
    return evacs.sort((a, b) => a.distance - b.distance)[0] || null;
  }, [locationsWithDistance, userLocation]);

  const nearestOpen = useMemo(() => {
    if (!userLocation) return null;
    const opens = locationsWithDistance.filter(l => l.type === "open_space");
    return opens.sort((a, b) => a.distance - b.distance)[0] || null;
  }, [locationsWithDistance, userLocation]);

  const openInMaps = (lat, lng, name) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    window.open(url, "_blank");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Safe Spaces & Evacuation Centers"
        description="Find the nearest safe open spaces and evacuation centers in Tupi, South Cotabato."
        icon={Tent}
        accent="emerald"
      />

      {/* Location Detection */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl backdrop-saturate-150 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <Navigation className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Find Nearest Safe Locations</h2>
              <p className="mt-0.5 text-xs text-slate-600">
                {userLocation
                  ? `📍 Your location: ${userLocation.lat.toFixed(4)}°N, ${userLocation.lng.toFixed(4)}°E — Sorted by distance`
                  : "Enable GPS to see distances and sort by nearest location"
                }
              </p>
            </div>
          </div>
          <Button
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            {isLocating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Detecting...</>
            ) : (
              <><LocateFixed className="mr-2 h-4 w-4" /> {userLocation ? "Re-detect" : "Detect My Location"}</>
            )}
          </Button>
        </div>

        {/* Nearest summaries */}
        {userLocation && (nearestEvac || nearestOpen) && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 border-t border-slate-200/60 pt-5">
            {nearestEvac && (
              <div className="rounded-xl bg-blue-50/80 border border-blue-200 p-4 flex items-start gap-3">
                <Building2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase text-blue-600">Nearest Evacuation Center</span>
                  <p className="text-sm font-bold text-slate-900 truncate">{nearestEvac.name}</p>
                  <p className="text-xs text-blue-700 font-semibold">{nearestEvac.distance?.toFixed(1)} km away</p>
                </div>
              </div>
            )}
            {nearestOpen && (
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-4 flex items-start gap-3">
                <TreePine className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase text-emerald-600">Nearest Safe Open Space</span>
                  <p className="text-sm font-bold text-slate-900 truncate">{nearestOpen.name}</p>
                  <p className="text-xs text-emerald-700 font-semibold">{nearestOpen.distance?.toFixed(1)} km away</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or address..."
            className="pl-9 bg-white/80 backdrop-blur-md"
          />
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl backdrop-blur-md">
          {[
            { id: "all", label: "All", icon: MapPin },
            { id: "evacuation_center", label: "Evacuation Centers", icon: Building2 },
            { id: "open_space", label: "Safe Open Spaces", icon: TreePine },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5 ${
                filter === f.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Locations List */}
      <div className="space-y-3">
        {filteredLocations.map(loc => {
          const isEvac = loc.type === "evacuation_center";
          return (
            <div
              key={loc.id}
              className="flex items-start gap-4 rounded-2xl border border-white/40 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 shadow-sm transition-all hover:shadow-md hover:border-emerald-200"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md ${
                isEvac ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
              }`}>
                {isEvac ? <Building2 className="h-6 w-6" /> : <TreePine className="h-6 w-6" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-900">{loc.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isEvac ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  }`}>
                    {isEvac ? "Evacuation Center" : "Open Space"}
                  </span>
                  {loc.distance !== null && (
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {loc.distance.toFixed(1)} km
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                  <MapPin className="h-3 w-3" />
                  {loc.address}
                </p>

                <p className="text-xs text-slate-600 line-clamp-1">{loc.description}</p>

                {/* Facilities */}
                {isEvac && loc.facilities && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {loc.facilities.map(f => {
                      const facility = FACILITY_ICONS[f];
                      return facility ? (
                        <span key={f} className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200">
                          {facility.icon} {facility.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Meta info */}
                <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-400">
                  {isEvac && loc.capacity && (
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />Capacity: {loc.capacity}</span>
                  )}
                  {!isEvac && loc.area && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Area: {loc.area}</span>
                  )}
                  {loc.contact && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{loc.contact}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={() => openInMaps(loc.lat, loc.lng, loc.name)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                >
                  <Navigation className="mr-1 h-3 w-3" /> Navigate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedLocation(loc)}
                  className="text-xs h-8 border-slate-200"
                >
                  Details <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}

        {filteredLocations.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <MapPin className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No locations found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLocation} onOpenChange={(open) => !open && setSelectedLocation(null)}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-2xl">
          {selectedLocation && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold text-white ${
                    selectedLocation.type === "evacuation_center" ? "bg-blue-600" : "bg-emerald-600"
                  }`}>
                    {selectedLocation.type === "evacuation_center" ? "Evacuation Center" : "Safe Open Space"}
                  </span>
                  {selectedLocation.distance !== null && (
                    <span className="text-xs text-slate-500">{selectedLocation.distance?.toFixed(1)} km away</span>
                  )}
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {selectedLocation.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedLocation.address}
                </DialogDescription>
              </DialogHeader>

              <div className="my-4 space-y-4">
                <p className="text-sm leading-relaxed text-slate-700">{selectedLocation.description}</p>

                {selectedLocation.type === "evacuation_center" && (
                  <div className="space-y-3">
                    {selectedLocation.capacity && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span><strong>Capacity:</strong> {selectedLocation.capacity} persons</span>
                      </div>
                    )}
                    {selectedLocation.contact && (
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone className="h-4 w-4 text-blue-500" />
                        <span><strong>Contact:</strong> {selectedLocation.contact}</span>
                      </div>
                    )}
                    {selectedLocation.facilities && (
                      <div>
                        <span className="text-xs font-semibold text-slate-700">Available Facilities:</span>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {selectedLocation.facilities.map(f => {
                            const facility = FACILITY_ICONS[f];
                            return facility ? (
                              <span key={f} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                                {facility.icon} {facility.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedLocation.area && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                    <span><strong>Area:</strong> {selectedLocation.area}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <LocateFixed className="h-4 w-4" />
                  <span>Coordinates: {selectedLocation.lat.toFixed(4)}°N, {selectedLocation.lng.toFixed(4)}°E</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <Button
                  size="sm"
                  onClick={() => openInMaps(selectedLocation.lat, selectedLocation.lng, selectedLocation.name)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  <Navigation className="mr-1.5 h-3.5 w-3.5" /> Open in Google Maps
                </Button>
                <Button size="sm" onClick={() => setSelectedLocation(null)} className="bg-slate-900 text-white text-xs">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
