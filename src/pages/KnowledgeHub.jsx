import React, { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  BookOpen, Search, ChevronRight, Globe, Layers, Activity,
  Mountain, Shield, AlertTriangle, Building,
  Clock, BookmarkCheck
} from "lucide-react";

const GLOSSARY = [
  { id: "aftershock", term: "Aftershock", definition: "Smaller earthquakes that follow the mainshock and can continue for days, weeks, or months. They occur in the same region and can cause additional damage to weakened structures.", category: "seismology" },
  { id: "crust", term: "Crust", definition: "The outermost layer of the Earth, ranging from 5 km thick (oceanic) to 70 km (continental). Earthquakes occur when stress in the crust is released along fault lines.", category: "geology" },
  { id: "dch", term: "Drop, Cover, and Hold On", definition: "The recommended protective action during an earthquake: DROP to the ground, take COVER under sturdy furniture, and HOLD ON until the shaking stops. This is the official guidance from PHIVOLCS and the NDRRMC.", category: "response" },
  { id: "epicenter", term: "Epicenter", definition: "The point on the Earth's surface directly above the hypocenter (focus) where an earthquake originates. Damage is usually most severe near the epicenter.", category: "seismology" },
  { id: "fault", term: "Fault / Fault Line", definition: "A fracture in the Earth's crust where rocks on either side have moved relative to each other. Active faults are those that have moved recently and can generate earthquakes. The Philippines has several active faults including the Philippine Fault and the Cotabato Fault.", category: "geology" },
  { id: "focus", term: "Focus (Hypocenter)", definition: "The point within the Earth where an earthquake rupture begins. Shallow-focus earthquakes (0-70 km) tend to cause more surface damage than deep-focus earthquakes.", category: "seismology" },
  { id: "ground_accel", term: "Ground Acceleration (PGA)", definition: "Peak Ground Acceleration — a measure of how strongly the ground shakes at a location, expressed as a fraction of gravity (g). PGA values above 0.2g can cause significant structural damage.", category: "engineering" },
  { id: "intensity", term: "Intensity (PHIVOLCS Earthquake Intensity Scale - PEIS)", definition: "A measure of how strongly an earthquake is felt at a specific location, rated on the PEIS scale from I (Scarcely Perceptible) to X (Completely Devastating). Unlike magnitude, intensity varies by location.", category: "seismology" },
  { id: "landslide", term: "Landslide", definition: "A mass movement of soil, rock, or debris down a slope, which can be triggered by earthquake shaking, especially in mountainous areas with steep terrain or loose soil.", category: "hazards" },
  { id: "lateral_spread", term: "Lateral Spreading", definition: "Horizontal movement of soil on gentle slopes or flat ground near rivers and lakes, caused by liquefaction during an earthquake. Can damage roads, bridges, and pipelines.", category: "hazards" },
  { id: "liquefaction", term: "Liquefaction", definition: "A phenomenon where saturated, loose soil temporarily loses its strength and behaves like a liquid during intense shaking. Buildings can sink, tilt, or collapse as the ground loses its bearing capacity.", category: "hazards" },
  { id: "magnitude", term: "Magnitude", definition: "A numerical measure of the energy released by an earthquake. The Richter scale and Moment Magnitude (Mw) scale are commonly used. Each whole number increase represents about 32 times more energy released.", category: "seismology" },
  { id: "mainshock", term: "Mainshock", definition: "The largest earthquake in a sequence of earthquakes. It is preceded by foreshocks and followed by aftershocks.", category: "seismology" },
  { id: "ndrrmc", term: "NDRRMC", definition: "National Disaster Risk Reduction and Management Council — the Philippine government's lead agency for disaster preparedness, response, and recovery coordination.", category: "organizations" },
  { id: "pacific_ring", term: "Pacific Ring of Fire", definition: "A 40,000 km horseshoe-shaped zone in the Pacific Ocean basin where about 90% of the world's earthquakes occur. The Philippines sits within this zone, making it one of the most earthquake-prone countries.", category: "geology" },
  { id: "phivolcs", term: "PHIVOLCS", definition: "Philippine Institute of Volcanology and Seismology — the government agency responsible for monitoring earthquakes, volcanoes, and tsunamis, and issuing warnings to the public.", category: "organizations" },
  { id: "plate_tectonics", term: "Plate Tectonics", definition: "The scientific theory that Earth's outer shell is made up of large plates that float on the semi-fluid mantle. Earthquakes frequently occur at plate boundaries where plates collide, separate, or slide past each other. The Philippines sits at the convergence of the Philippine Sea Plate and the Eurasian Plate.", category: "geology" },
  { id: "primary_wave", term: "P-Wave (Primary Wave)", definition: "The fastest seismic wave, arriving first at seismograph stations. P-waves compress and expand the ground in the direction of travel. They can travel through solid rock and liquids.", category: "seismology" },
  { id: "secondary_wave", term: "S-Wave (Secondary Wave)", definition: "Seismic waves that arrive after P-waves and cause side-to-side shaking. S-waves typically cause more damage than P-waves because of their larger amplitude and different motion pattern.", category: "seismology" },
  { id: "seismograph", term: "Seismograph / Seismometer", definition: "An instrument that detects and records seismic waves from earthquakes. PHIVOLCS operates a network of seismographs throughout the Philippines.", category: "seismology" },
  { id: "surface_wave", term: "Surface Waves", definition: "Seismic waves that travel along the Earth's surface. They are slower than P and S waves but often produce the most destructive ground motion, including rolling and side-to-side movements.", category: "seismology" },
  { id: "tectonic", term: "Tectonic Earthquake", definition: "An earthquake caused by the movement of tectonic plates. This is the most common type of earthquake and accounts for the majority of seismic events in the Philippines.", category: "geology" },
  { id: "tsunami", term: "Tsunami", definition: "A series of large ocean waves generated by an undersea earthquake, volcanic eruption, or landslide. Coastal areas in the Philippines are at risk, and PHIVOLCS issues tsunami advisories and warnings.", category: "hazards" },
  { id: "volcanic_eq", term: "Volcanic Earthquake", definition: "An earthquake caused by volcanic activity, such as magma movement beneath a volcano. The Philippines has many active volcanoes that can generate volcanic earthquakes.", category: "geology" },
];

const NOTABLE_EVENTS = [
  {
    id: "e1", date: "2019-10-29", magnitude: 6.6, location: "Tulunan, Cotabato",
    description: "A magnitude 6.6 earthquake struck Tulunan, North Cotabato, causing significant damage to buildings and infrastructure across Mindanao. At least 8 people died and hundreds were injured. This was the third powerful earthquake to hit the region in two weeks.",
    depth: "7 km", intensity: "VII (Destructive) in epicentral area",
  },
  {
    id: "e2", date: "2019-10-31", magnitude: 6.5, location: "Makilala, Cotabato",
    description: "Just two days after the M6.6, another powerful earthquake struck the same region. Combined with the earlier quakes, this event displaced over 100,000 people and caused widespread damage to homes and schools.",
    depth: "2 km", intensity: "VII (Destructive) in epicentral area",
  },
  {
    id: "e3", date: "2019-10-16", magnitude: 6.3, location: "Makilala, Cotabato",
    description: "The first in a devastating series of earthquakes that struck the Cotabato region. Triggered multiple landslides and ground fissures. The earthquake sequence was linked to the Cotabato Fault system.",
    depth: "14 km", intensity: "VII (Destructive) in epicentral area",
  },
  {
    id: "e4", date: "2023-12-02", magnitude: 7.6, location: "Hinatuan, Surigao del Sur",
    description: "A major earthquake struck off the coast of Mindanao, triggering tsunami warnings across the Philippines and nearby countries. The deep focus (32 km) limited surface damage, but it was strongly felt across Mindanao and Visayas.",
    depth: "32 km", intensity: "V-VI in Mindanao",
  },
  {
    id: "e5", date: "2013-10-15", magnitude: 7.2, location: "Sagbayan, Bohol",
    description: "The deadliest earthquake in the Philippines in decades, killing over 220 people. The earthquake severely damaged centuries-old churches and caused widespread liquefaction and landslides in Bohol and Cebu.",
    depth: "12 km", intensity: "VIII (Very Destructive) in Bohol",
  },
  {
    id: "e6", date: "1990-07-16", magnitude: 7.7, location: "Cabanatuan, Nueva Ecija",
    description: "One of the strongest earthquakes in Philippine history. It killed over 1,600 people and caused catastrophic damage across Central Luzon. Liquefaction destroyed buildings in Dagupan City.",
    depth: "25 km", intensity: "IX (Devastating) in epicentral area",
  },
];

const CATEGORIES = [
  { id: "all", label: "All Terms", icon: BookOpen },
  { id: "seismology", label: "Seismology", icon: Activity },
  { id: "geology", label: "Geology", icon: Mountain },
  { id: "hazards", label: "Hazards", icon: AlertTriangle },
  { id: "engineering", label: "Engineering", icon: Building },
  { id: "response", label: "Response", icon: Shield },
  { id: "organizations", label: "Organizations", icon: Globe },
];

const COMPLETED_KEY = "aegis_glossary_read";

export default function KnowledgeHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeArticle, setActiveArticle] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [tab, setTab] = useState("glossary"); // "glossary" | "events"
  const [completedTerms, setCompletedTerms] = useState(() => {
    try { return JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]"); } catch { return []; }
  });

  const filteredTerms = useMemo(() => {
    return GLOSSARY.filter(term => {
      const matchesSearch = !searchQuery ||
        term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "all" || term.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery) return NOTABLE_EVENTS;
    return NOTABLE_EVENTS.filter(e =>
      e.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const toggleRead = (id) => {
    let updated;
    if (completedTerms.includes(id)) {
      updated = completedTerms.filter(t => t !== id);
    } else {
      updated = [...completedTerms, id];
    }
    setCompletedTerms(updated);
    try { localStorage.setItem(COMPLETED_KEY, JSON.stringify(updated)); } catch (e) { console.error(e); }
  };

  const getCategoryColor = (cat) => {
    const colors = {
      seismology: "bg-blue-50 text-blue-700 ring-blue-200",
      geology: "bg-amber-50 text-amber-700 ring-amber-200",
      hazards: "bg-rose-50 text-rose-700 ring-rose-200",
      engineering: "bg-indigo-50 text-indigo-700 ring-indigo-200",
      response: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      organizations: "bg-purple-50 text-purple-700 ring-purple-200",
    };
    return colors[cat] || "bg-slate-50 text-slate-700 ring-slate-200";
  };

  const getMagnitudeColor = (mag) => {
    if (mag >= 7) return "bg-rose-600";
    if (mag >= 6) return "bg-orange-500";
    if (mag >= 5) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Earthquake Knowledge Hub"
        description="Learn earthquake terminology, understand seismic science, and explore notable seismic events in the Philippines."
        icon={BookOpen}
        accent="indigo"
      />

      {/* Search & Tabs */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search terms, definitions, or events..."
            className="pl-9 bg-white/80 backdrop-blur-md"
          />
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl backdrop-blur-md">
          <button
            onClick={() => setTab("glossary")}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
              tab === "glossary" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="inline mr-1.5 h-3.5 w-3.5" />
            Glossary ({GLOSSARY.length})
          </button>
          <button
            onClick={() => setTab("events")}
            className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${
              tab === "events" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="inline mr-1.5 h-3.5 w-3.5" />
            Notable Events ({NOTABLE_EVENTS.length})
          </button>
        </div>
      </div>

      {/* Glossary Tab */}
      {tab === "glossary" && (
        <>
          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5 bg-slate-200/50 p-1 rounded-xl backdrop-blur-md mb-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Progress */}
          <div className="mb-6 flex items-center gap-3 text-xs text-slate-500">
            <BookmarkCheck className="h-4 w-4 text-emerald-500" />
            <span>{completedTerms.length} of {GLOSSARY.length} terms learned</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(completedTerms.length / GLOSSARY.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Terms Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTerms.map(term => {
              const isRead = completedTerms.includes(term.id);
              return (
                <div
                  key={term.id}
                  onClick={() => setActiveArticle(term)}
                  className={`cursor-pointer flex flex-col justify-between rounded-2xl border p-5 transition-all hover:shadow-md backdrop-blur-xl backdrop-saturate-150 ${
                    isRead
                      ? "border-emerald-200 bg-emerald-50/40 hover:border-emerald-300"
                      : "border-white/40 bg-white/55 hover:border-indigo-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${getCategoryColor(term.category)}`}>
                        {term.category}
                      </span>
                      {isRead && <BookmarkCheck className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{term.term}</h3>
                    <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {term.definition}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-end">
                    <span className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                      Read more <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTerms.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <Search className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No matching terms found</p>
              <p className="mt-0.5 text-xs text-slate-400">Try a different search or category filter</p>
            </div>
          )}
        </>
      )}

      {/* Events Tab */}
      {tab === "events" && (
        <div className="space-y-3">
          {filteredEvents.map(event => (
            <div
              key={event.id}
              onClick={() => setActiveEvent(event)}
              className="cursor-pointer flex items-start gap-4 rounded-2xl border border-white/40 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 shadow-sm transition-all hover:shadow-md hover:border-indigo-200"
            >
              <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl text-white shadow-md ${getMagnitudeColor(event.magnitude)}`}>
                <span className="text-lg font-extrabold leading-none">{event.magnitude}</span>
                <span className="text-[9px] font-medium opacity-80">Mw</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-900">{event.location}</h3>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(event.date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{event.description}</p>
                <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><Layers className="h-3 w-3" />Depth: {event.depth}</span>
                  <span className="flex items-center gap-1"><Activity className="h-3 w-3" />{event.intensity}</span>
                </div>
              </div>

              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 mt-2" />
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <Search className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No matching events found</p>
            </div>
          )}
        </div>
      )}

      {/* Term Detail Dialog */}
      <Dialog open={!!activeArticle} onOpenChange={(open) => !open && setActiveArticle(null)}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-2xl">
          {activeArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${getCategoryColor(activeArticle.category)}`}>
                    {activeArticle.category}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {activeArticle.term}
                </DialogTitle>
              </DialogHeader>

              <div className="my-4 text-sm leading-relaxed text-slate-700">
                {activeArticle.definition}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toggleRead(activeArticle.id);
                    setActiveArticle(null);
                  }}
                  className="text-xs"
                >
                  <BookmarkCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                  {completedTerms.includes(activeArticle.id) ? "Mark as Unread" : "Mark as Learned"}
                </Button>
                <Button size="sm" onClick={() => setActiveArticle(null)} className="bg-slate-900 text-white text-xs">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!activeEvent} onOpenChange={(open) => !open && setActiveEvent(null)}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-2xl">
          {activeEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold text-white ${getMagnitudeColor(activeEvent.magnitude)}`}>
                    M{activeEvent.magnitude}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(activeEvent.date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {activeEvent.location}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Depth: {activeEvent.depth} • {activeEvent.intensity}
                </DialogDescription>
              </DialogHeader>

              <div className="my-4 text-sm leading-relaxed text-slate-700">
                {activeEvent.description}
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button size="sm" onClick={() => setActiveEvent(null)} className="bg-slate-900 text-white text-xs">
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
