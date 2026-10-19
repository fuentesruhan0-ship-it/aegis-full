import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Siren, Plus, Trash2, Pencil, Calendar, Clock, MapPin, CheckCircle2, Play,
  Timer, ClipboardList, Star, RotateCcw
} from "lucide-react";

const STORAGE_KEY = "aegis_drill_schedules";
const DRILL_HISTORY_KEY = "aegis_drill_history";

const DRILL_TYPES = [
  { id: "drop_cover_hold", label: "Drop, Cover & Hold On", description: "Practice the standard earthquake response", duration: "2-5 min", icon: "🛡️" },
  { id: "evacuation", label: "Evacuation Drill", description: "Practice exiting the building to meeting point", duration: "5-15 min", icon: "🏃" },
  { id: "full_scenario", label: "Full Scenario Drill", description: "Complete earthquake simulation with all steps", duration: "15-30 min", icon: "🎯" },
  { id: "night_drill", label: "Night/Dark Drill", description: "Practice response in low-light conditions", duration: "5-10 min", icon: "🌙" },
  { id: "communication", label: "Communication Check", description: "Test that all contacts are reachable", duration: "5-10 min", icon: "📱" },
  { id: "first_aid", label: "First Aid Practice", description: "Review basic first aid procedures", duration: "10-20 min", icon: "🩹" },
];

const DRILL_LOCATIONS = [
  { id: "home", label: "Home" },
  { id: "school", label: "School" },
  { id: "workplace", label: "Workplace" },
  { id: "community", label: "Community" },
  { id: "other", label: "Other" },
];

const FREQUENCY_OPTIONS = [
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Every 2 Weeks" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "once", label: "One-Time" },
];

const DROP_COVER_HOLD_STEPS = [
  { step: 1, title: "DROP", description: "Get down on your hands and knees. This protects you from being knocked down and allows you to stay low and crawl to shelter.", time: "Immediately" },
  { step: 2, title: "COVER", description: "Cover your head and neck with your arms. Crawl under a sturdy desk or table if nearby. If no shelter is nearby, crawl next to an interior wall away from windows.", time: "1-2 seconds" },
  { step: 3, title: "HOLD ON", description: "If under a desk or table, hold on with one hand. Be ready to move with your shelter if it shifts. Stay in position until the shaking stops.", time: "Until shaking stops" },
  { step: 4, title: "ASSESS", description: "When shaking stops, look around for hazards. Check yourself and others for injuries. Be prepared for aftershocks.", time: "After shaking" },
  { step: 5, title: "EVACUATE", description: "If the building is damaged, evacuate calmly to your designated meeting point. Avoid using elevators. Take your go-bag if accessible.", time: "When safe" },
];

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-PH", {
    weekday: "short", year: "numeric", month: "short", day: "numeric"
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getNextDrillDate(drill) {
  if (!drill.date) return null;
  const drillDate = new Date(drill.date + "T" + (drill.time || "09:00"));
  if (drill.frequency === "once") return drillDate;

  const now = new Date();
  let next = new Date(drillDate);
  const intervals = { weekly: 7, biweekly: 14, monthly: 30, quarterly: 90 };
  const interval = intervals[drill.frequency] || 30;

  while (next < now) {
    next.setDate(next.getDate() + interval);
  }
  return next;
}

function getDaysUntil(date) {
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DrillScheduler() {
  const { user } = useAuth();
  const [drills, setDrills] = useState([]);
  const [history, setHistory] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [runningDrill, setRunningDrill] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [drillTimer, setDrillTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 0, notes: "", participants: "" });
  const [form, setForm] = useState({
    type: "drop_cover_hold", location: "home", date: "", time: "09:00",
    frequency: "monthly", participants: "", notes: ""
  });

  // Load data
  useEffect(() => {
    try {
      const savedDrills = localStorage.getItem(STORAGE_KEY);
      if (savedDrills) setDrills(JSON.parse(savedDrills));
      const savedHistory = localStorage.getItem(DRILL_HISTORY_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) { console.error(e); }
  }, []);

  const saveDrills = (newDrills) => {
    setDrills(newDrills);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newDrills)); } catch (e) { console.error(e); }
  };

  const saveHistory = (newHistory) => {
    setHistory(newHistory);
    try { localStorage.setItem(DRILL_HISTORY_KEY, JSON.stringify(newHistory)); } catch (e) { console.error(e); }
  };

  // Timer effect
  useEffect(() => {
    let interval;
    if (timerActive) {
      interval = setInterval(() => {
        setDrillTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Upcoming drills sorted
  const upcomingDrills = useMemo(() => {
    return drills
      .map(d => ({ ...d, nextDate: getNextDrillDate(d) }))
      .filter(d => d.nextDate)
      .sort((a, b) => a.nextDate - b.nextDate);
  }, [drills]);

  const openCreate = () => {
    setEditing(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setForm({
      type: "drop_cover_hold", location: "home",
      date: tomorrow.toISOString().split("T")[0], time: "09:00",
      frequency: "monthly", participants: "", notes: ""
    });
    setDialogOpen(true);
  };

  const openEdit = (drill) => {
    setEditing(drill);
    setForm({
      type: drill.type, location: drill.location,
      date: drill.date, time: drill.time,
      frequency: drill.frequency, participants: drill.participants || "",
      notes: drill.notes || ""
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.date) return;
    if (editing) {
      const updated = drills.map(d => d.id === editing.id ? { ...d, ...form } : d);
      saveDrills(updated);
    } else {
      const newDrill = { id: Date.now().toString(), ...form, createdDate: new Date().toISOString() };
      saveDrills([...drills, newDrill]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id) => {
    saveDrills(drills.filter(d => d.id !== id));
  };

  const startDrill = (drill) => {
    setRunningDrill(drill);
    setCurrentStep(0);
    setDrillTimer(0);
    setTimerActive(true);
  };

  const endDrill = () => {
    setTimerActive(false);
    setFeedback({ rating: 0, notes: "", participants: runningDrill?.participants || "" });
    setFeedbackDialog(true);
  };

  const saveDrillResult = () => {
    const result = {
      id: Date.now().toString(),
      drillId: runningDrill?.id,
      type: runningDrill?.type,
      location: runningDrill?.location,
      duration: drillTimer,
      rating: feedback.rating,
      notes: feedback.notes,
      participants: feedback.participants,
      completedDate: new Date().toISOString(),
    };
    saveHistory([result, ...history]);
    setFeedbackDialog(false);
    setRunningDrill(null);
    setCurrentStep(0);
    setDrillTimer(0);
  };

  const stats = useMemo(() => {
    const totalDrills = history.length;
    const thisMonth = history.filter(h => {
      const d = new Date(h.completedDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const avgRating = totalDrills > 0
      ? (history.reduce((sum, h) => sum + (h.rating || 0), 0) / totalDrills).toFixed(1)
      : "—";
    return { totalDrills, thisMonth, avgRating };
  }, [history]);

  // Active drill view
  if (runningDrill) {
    const drillType = DRILL_TYPES.find(t => t.id === runningDrill.type);
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-600" />
              Drill In Progress
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {drillType?.icon} {drillType?.label} — {DRILL_LOCATIONS.find(l => l.id === runningDrill.location)?.label}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5">
              <Timer className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-mono font-bold text-blue-700">{formatTimer(drillTimer)}</span>
            </div>
            <Button onClick={endDrill} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> End Drill
            </Button>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {DROP_COVER_HOLD_STEPS.map((step, idx) => {
            const isActive = idx === currentStep;
            const isDone = idx < currentStep;
            return (
              <div
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`rounded-2xl border p-5 transition-all cursor-pointer ${
                  isActive
                    ? "border-blue-400 bg-blue-50/80 shadow-md shadow-blue-500/10 scale-[1.01]"
                    : isDone
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-slate-200 bg-white/60"
                } backdrop-blur-md`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 animate-pulse"
                      : isDone
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : step.step}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-bold ${
                        isActive ? "text-blue-800" : isDone ? "text-emerald-700" : "text-slate-600"
                      }`}>
                        {step.title}
                      </h3>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{step.time}</span>
                    </div>
                    <p className={`mt-1 text-xs leading-relaxed ${
                      isActive ? "text-blue-700" : isDone ? "text-slate-500" : "text-slate-400"
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            className="text-xs"
          >
            ← Previous Step
          </Button>
          {currentStep < DROP_COVER_HOLD_STEPS.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Next Step →
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={endDrill}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Complete Drill
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Earthquake Drill Scheduler"
        description="Schedule, manage, and track earthquake drills for your household, school, or workplace."
        icon={Siren}
        accent="blue"
      />

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/40 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 text-center shadow-sm">
          <div className="text-2xl font-bold text-slate-900">{stats.totalDrills}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">Total Drills Completed</div>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.thisMonth}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">This Month</div>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 text-center shadow-sm">
          <div className="text-2xl font-bold text-amber-600">{stats.avgRating}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">Avg. Rating</div>
        </div>
      </div>

      {/* Quick Start Drill */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-xl p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
              <Play className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Start a Quick Drill Now</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Practice Drop, Cover & Hold On with your household. Takes only 2-5 minutes.
              </p>
            </div>
          </div>
          <Button
            onClick={() => startDrill({ type: "drop_cover_hold", location: "home" })}
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          >
            <Play className="mr-2 h-4 w-4" /> Start Quick Drill
          </Button>
        </div>
      </div>

      {/* Scheduled Drills */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Scheduled Drills
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Upcoming and recurring earthquake drills</p>
          </div>
          <Button size="sm" onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Schedule Drill
          </Button>
        </div>

        {upcomingDrills.length === 0 ? (
          <div className="rounded-2xl border border-white/40 bg-white/55 backdrop-blur-xl p-10 text-center shadow-sm">
            <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No drills scheduled</p>
            <p className="mt-0.5 text-xs text-slate-400">Schedule regular drills to keep your household prepared</p>
            <Button size="sm" onClick={openCreate} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Schedule Your First Drill
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingDrills.map(drill => {
              const drillType = DRILL_TYPES.find(t => t.id === drill.type);
              const location = DRILL_LOCATIONS.find(l => l.id === drill.location);
              const daysUntil = getDaysUntil(drill.nextDate);
              const isToday = daysUntil !== null && daysUntil <= 0;
              const isSoon = daysUntil !== null && daysUntil <= 3 && daysUntil > 0;

              return (
                <div
                  key={drill.id}
                  className={`flex items-center gap-4 rounded-xl border p-4 backdrop-blur-md transition-all ${
                    isToday
                      ? "border-blue-300 bg-blue-50/60 shadow-md"
                      : isSoon
                      ? "border-amber-200 bg-amber-50/40"
                      : "border-slate-200 bg-white/60"
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 border border-slate-200 text-xl shadow-sm">
                    {drillType?.icon || "🎯"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{drillType?.label || drill.type}</span>
                      {isToday && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
                          TODAY
                        </span>
                      )}
                      {isSoon && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          In {daysUntil}d
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{location?.label}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(drill.time)}</span>
                      <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />{FREQUENCY_OPTIONS.find(f => f.id === drill.frequency)?.label}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(drill.nextDate)}</span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => startDrill(drill)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                    >
                      <Play className="mr-1 h-3 w-3" /> Start
                    </Button>
                    <button
                      onClick={() => openEdit(drill)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(drill.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drill History */}
      {history.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-5">
            <ClipboardList className="h-5 w-5 text-emerald-600" />
            Drill History
          </h2>
          <div className="space-y-2">
            {history.slice(0, 10).map(h => {
              const drillType = DRILL_TYPES.find(t => t.id === h.type);
              return (
                <div key={h.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/60 p-3 backdrop-blur-md">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-base">
                    {drillType?.icon || "✅"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-slate-800">{drillType?.label || h.type}</span>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{formatDate(h.completedDate)}</span>
                      <span>{formatTimer(h.duration)}</span>
                      {h.rating > 0 && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: h.rating }, (_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                  {h.notes && (
                    <span className="text-[11px] text-slate-400 max-w-[30%] truncate">{h.notes}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editing ? "Edit Drill Schedule" : "Schedule Earthquake Drill"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set up a recurring or one-time earthquake drill.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Drill Type</Label>
              <Select value={form.type} onValueChange={val => setForm({ ...form, type: val })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DRILL_TYPES.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.icon} {t.label} ({t.duration})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Location</Label>
              <Select value={form.location} onValueChange={val => setForm({ ...form, location: val })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DRILL_LOCATIONS.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Time</Label>
                <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Frequency</Label>
              <Select value={form.frequency} onValueChange={val => setForm({ ...form, frequency: val })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Participants (Optional)</Label>
              <Input value={form.participants} onChange={e => setForm({ ...form, participants: e.target.value })} placeholder="e.g. Family, Barangay Responders, Neighbors" className="mt-1" />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Notes (Optional)</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions..." className="mt-1" rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              {editing ? "Update Schedule" : "Schedule Drill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Drill Complete!
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Duration: {formatTimer(drillTimer)}. Rate your drill performance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Rating</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setFeedback({ ...feedback, rating: star })}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`h-7 w-7 ${
                      star <= feedback.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-200"
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Notes (Optional)</Label>
              <Textarea
                value={feedback.notes}
                onChange={e => setFeedback({ ...feedback, notes: e.target.value })}
                placeholder="What went well? What needs improvement?"
                className="mt-1" rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setFeedbackDialog(false); setRunningDrill(null); }} className="text-xs">Skip</Button>
            <Button onClick={saveDrillResult} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
              Save Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
