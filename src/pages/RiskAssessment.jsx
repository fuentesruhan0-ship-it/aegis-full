import React, { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ShieldAlert, MapPin, LocateFixed, Activity, BookOpen,
  CheckCircle2, ArrowRight, Sparkles, BookmarkCheck, Shield
} from "lucide-react";
import {
  TUPI_BARANGAYS,
  assessLocationRisk,
  EDUCATIONAL_RESOURCES,
} from "@/lib/riskEngine";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const STORAGE_KEY = "aegis_saved_risk_assessment";
const COMPLETED_READS_KEY = "aegis_read_resources";

export default function RiskAssessment() {
  // Input state
  const [selectedBarangay, setSelectedBarangay] = useState(TUPI_BARANGAYS[0].name);
  const [customLat, setCustomLat] = useState("");
  const [customLng, setCustomLng] = useState("");
  const [mode, setMode] = useState("barangay"); // 'barangay' | 'gps' | 'custom'
  const [isLocating, setIsLocating] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);

  // Result state
  const [assessment, setAssessment] = useState(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Educational Center state
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeArticle, setActiveArticle] = useState(null);
  const [completedReads, setCompletedReads] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(COMPLETED_READS_KEY) || "[]");
    } catch {
      return [];
    }
  });

  // Action items completion tracker
  const [checkedActions, setCheckedActions] = useState({});

  // Load saved assessment on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setAssessment(JSON.parse(saved));
      } else {
        // Default assessment for Poblacion Tupi
        const defaultAss = assessLocationRisk(
          TUPI_BARANGAYS[0].lat,
          TUPI_BARANGAYS[0].lng,
          TUPI_BARANGAYS[0].name
        );
        setAssessment(defaultAss);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleRunAssessment = (lat, lng, name) => {
    setIsAssessing(true);
    setTimeout(() => {
      const result = assessLocationRisk(lat, lng, name);
      setAssessment(result);
      setIsAssessing(false);
      setSavedSuccess(false);
    }, 400);
  };

  const handleSelectBarangayChange = (e) => {
    const bName = e.target.value;
    setSelectedBarangay(bName);
    const b = TUPI_BARANGAYS.find((item) => item.name === bName);
    if (b) {
      handleRunAssessment(b.lat, b.lng, b.name);
    }
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setMode("gps");
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCustomLat(lat.toFixed(4));
        setCustomLng(lng.toFixed(4));
        handleRunAssessment(lat, lng, `Current GPS Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`);
      },
      (err) => {
        setIsLocating(false);
        alert("Unable to acquire GPS coordinates: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid numeric latitude and longitude coordinates.");
      return;
    }
    handleRunAssessment(lat, lng, `Custom Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  };

  const handleSaveToProfile = () => {
    if (!assessment) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assessment));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAction = (idx) => {
    setCheckedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const toggleReadStatus = (id) => {
    let updated;
    if (completedReads.includes(id)) {
      updated = completedReads.filter((item) => item !== id);
    } else {
      updated = [...completedReads, id];
    }
    setCompletedReads(updated);
    try {
      localStorage.setItem(COMPLETED_READS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered resources
  const filteredResources = EDUCATIONAL_RESOURCES.filter((res) => {
    if (selectedCategory === "all") return true;
    if (selectedCategory === "high_priority") return res.priority === "high";
    return res.category === selectedCategory;
  });

  const getScoreBadgeStyles = (level) => {
    switch (level) {
      case "Severe":
        return {
          bg: "bg-rose-500/10 text-rose-700 ring-rose-500/30",
          bar: "bg-rose-600",
          ring: "text-rose-600",
        };
      case "High":
        return {
          bg: "bg-orange-500/10 text-orange-700 ring-orange-500/30",
          bar: "bg-orange-500",
          ring: "text-orange-500",
        };
      case "Moderate":
        return {
          bg: "bg-amber-500/10 text-amber-700 ring-amber-500/30",
          bar: "bg-amber-500",
          ring: "text-amber-500",
        };
      default:
        return {
          bg: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30",
          bar: "bg-emerald-500",
          ring: "text-emerald-500",
        };
    }
  };

  const badgeStyles = assessment ? getScoreBadgeStyles(assessment.riskLevel) : getScoreBadgeStyles("Moderate");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="AI Risk Assessment & Educational Center"
        description="Check your household's proximity to active fault lines, view your calculated hazard score, and explore tailored preparedness materials."
        icon={ShieldAlert}
        accent="red"
      />

      {/* Top Section: Location Selector & Assessment Trigger */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl backdrop-saturate-150 p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Select or Detect Household Location
            </h2>
            <p className="text-xs text-slate-600">
              Evaluates distance against PHIVOLCS active faults, regional seismicity, and local soil conditions.
            </p>
          </div>

          {/* Location Mode Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={mode === "barangay" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("barangay")}
              className={mode === "barangay" ? "bg-blue-600 text-white" : "border-white/50 bg-white/50 text-slate-700"}
            >
              Tupi Barangays
            </Button>
            <Button
              type="button"
              variant={mode === "gps" ? "default" : "outline"}
              size="sm"
              onClick={handleUseGPS}
              disabled={isLocating}
              className={mode === "gps" ? "bg-blue-600 text-white" : "border-white/50 bg-white/50 text-slate-700"}
            >
              <LocateFixed className="mr-1.5 h-3.5 w-3.5" />
              {isLocating ? "Acquiring GPS..." : "Auto-Detect GPS"}
            </Button>
            <Button
              type="button"
              variant={mode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("custom")}
              className={mode === "custom" ? "bg-blue-600 text-white" : "border-white/50 bg-white/50 text-slate-700"}
            >
              Manual Coordinates
            </Button>
          </div>
        </div>

        {/* Input Controls */}
        <div className="mt-5 border-t border-slate-200/60 pt-4">
          {mode === "barangay" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Choose Barangay:
              </Label>
              <select
                value={selectedBarangay}
                onChange={handleSelectBarangayChange}
                className="w-full max-w-md rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 backdrop-blur-md"
              >
                {TUPI_BARANGAYS.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} — ({b.slope}, {b.soilType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === "gps" && (
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Using GPS Coordinates: <strong>{customLat || assessment?.lat.toFixed(4)}° N</strong>,{" "}
                <strong>{customLng || assessment?.lng.toFixed(4)}° E</strong>
              </span>
              <Button size="sm" variant="ghost" onClick={handleUseGPS} className="text-xs text-blue-600 h-7 px-2">
                Re-scan
              </Button>
            </div>
          )}

          {mode === "custom" && (
            <form onSubmit={handleCustomSubmit} className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Latitude:</Label>
                <input
                  type="text"
                  placeholder="e.g. 6.2356"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-28 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600">Longitude:</Label>
                <input
                  type="text"
                  placeholder="e.g. 125.0286"
                  value={customLng}
                  onChange={(e) => setCustomLng(e.target.value)}
                  className="w-28 rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <Button type="submit" size="sm" className="bg-blue-600 text-white h-8 text-xs">
                Calculate Risk
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Main Results Dashboard */}
      {assessment && (
        <div className="mb-10 grid gap-6 lg:grid-cols-3">
          {/* Left Column: Overall Hazard Gauge & Fault Proximity */}
          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/45 backdrop-blur-xl backdrop-saturate-150 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Calculated Hazard Exposure
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${badgeStyles.bg}`}>
                  <Activity className="h-3 w-3" />
                  {assessment.riskLevel} Risk
                </span>
              </div>

              {/* Gauge Circle */}
              <div className="my-6 flex flex-col items-center justify-center text-center">
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-8 border-slate-100 bg-white/70 shadow-inner">
                  <div className="text-center">
                    <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                      {assessment.riskScore}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 block">/ 100</span>
                  </div>
                </div>

                <div className="mt-3 w-full max-w-xs">
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${badgeStyles.bar}`}
                      style={{ width: `${assessment.riskScore}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-600">
                    <span>Low (0-39)</span>
                    <span>Mod (40-54)</span>
                    <span>High (55-74)</span>
                    <span>Severe (75+)</span>
                  </div>
                </div>
              </div>

              {/* Key Geographic Metrics */}
              <div className="space-y-3 border-t border-slate-200/60 pt-4">
                <div className="flex items-start justify-between text-xs">
                  <span className="text-slate-500">Assessed Location:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[60%] truncate">
                    {assessment.locationName}
                  </span>
                </div>
                <div className="flex items-start justify-between text-xs">
                  <span className="text-slate-500">Closest Active Fault:</span>
                  <span className="font-semibold text-rose-700 text-right max-w-[60%]">
                    {assessment.nearestFault.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Distance to Fault Line:</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                    {assessment.nearestFault.distanceKm} km
                  </span>
                </div>
                <div className="flex items-start justify-between text-xs">
                  <span className="text-slate-500">Potential Peak Shaking:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[60%]">
                    {assessment.expectedIntensity}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/60">
              <Button
                onClick={handleSaveToProfile}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                    Saved to Dashboard!
                  </>
                ) : (
                  <>
                    <BookmarkCheck className="mr-1.5 h-3.5 w-3.5" />
                    Save Assessment to Household
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right 2 Columns: AI Hazard Analysis & Tailored Action Checklist */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Hazard Summary Card */}
            <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/45 backdrop-blur-xl backdrop-saturate-150 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">AI Hazard Profile & Geological Breakdown</h3>
                  <p className="text-[11px] text-slate-500">Synthesized from PHIVOLCS fault database & local terrain data</p>
                </div>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-700">
                <p>
                  Your location is approximately <strong>{assessment.nearestFault.distanceKm} kilometers</strong> from the{" "}
                  <strong>{assessment.nearestFault.name}</strong>, which has an estimated historical seismic capacity of{" "}
                  <strong>M{assessment.nearestFault.historicMaxMag}</strong>.
                </p>
                <div className="rounded-xl bg-blue-50/80 p-3.5 border border-blue-100/80 space-y-1.5">
                  <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-blue-600" />
                    Geological Vulnerability: {assessment.primaryTerrainHazard}
                  </div>
                  <p className="text-blue-800 text-[11px]">
                    Ground motion near the Cotabato fault zone can experience significant high-frequency acceleration.
                    Structures built on unreinforced hollow blocks without tie-beams face heightened cracking risk.
                  </p>
                </div>
              </div>

              {/* Actionable Preparedness Checklist */}
              <div className="mt-5 pt-4 border-t border-slate-200/60">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Tailored Action Plan for Your Hazard Tier
                </h4>
                <div className="space-y-2">
                  {assessment.actionItems.map((action, idx) => {
                    const isDone = !!checkedActions[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleAction(idx)}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isDone
                            ? "bg-emerald-50/70 border-emerald-200 text-slate-600"
                            : "bg-white/60 border-slate-200 hover:border-blue-300 text-slate-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => {}}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`text-xs ${isDone ? "line-through text-slate-400" : "font-medium"}`}>
                          {action}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Educational Resource Center */}
      <div className="mt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Educational Resource Center
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Verified earthquake preparedness materials, guides, and safety protocols matching your profile.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-slate-200/50 p-1 rounded-xl backdrop-blur-md">
            {[
              { id: "all", label: "All Topics" },
              { id: "high_priority", label: "Priority" },
              { id: "immediate_response", label: "Active Shaking" },
              { id: "structural", label: "Structural" },
              { id: "survival", label: "Survival Kit" },
              { id: "local_hazard", label: "Local Hazards" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  selectedCategory === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resources Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((res) => {
            const isRead = completedReads.includes(res.id);
            return (
              <div
                key={res.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-white/40 bg-white/45 backdrop-blur-xl backdrop-saturate-150 p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                      {res.categoryLabel}
                    </span>
                    <span className="text-[11px] text-slate-400">{res.readTime}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {res.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {res.summary}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <button
                    onClick={() => toggleReadStatus(res.id)}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                  >
                    <BookmarkCheck className={`h-3.5 w-3.5 ${isRead ? "text-emerald-600 fill-emerald-100" : ""}`} />
                    {isRead ? "Completed" : "Mark as read"}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveArticle(res)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 px-2.5"
                  >
                    Read Guide
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reader Modal */}
      <Dialog open={!!activeArticle} onOpenChange={(open) => !open && setActiveArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-2xl">
          {activeArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    {activeArticle.categoryLabel}
                  </span>
                  <span className="text-xs text-slate-400">• {activeArticle.readTime}</span>
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {activeArticle.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {activeArticle.summary}
                </DialogDescription>
              </DialogHeader>

              <div className="my-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-700 space-y-4 whitespace-pre-line font-sans">
                {activeArticle.content}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toggleReadStatus(activeArticle.id);
                    setActiveArticle(null);
                  }}
                  className="text-xs"
                >
                  <BookmarkCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  {completedReads.includes(activeArticle.id) ? "Mark as Unread" : "Complete & Close"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setActiveArticle(null)}
                  className="bg-slate-900 text-white text-xs"
                >
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
