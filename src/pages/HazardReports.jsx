import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
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
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import {
  AlertTriangle, Plus, MapPin, Clock, Loader2, CheckCircle2, ShieldCheck, Flag
} from "lucide-react";

const HAZARD_TYPES = {
  cracked_road: { label: "Cracked Road", icon: "🛣️" },
  landslide: { label: "Landslide", icon: "⛰️" },
  fire: { label: "Fire", icon: "🔥" },
  gas_leak: { label: "Gas Leak", icon: "💨" },
  structural_damage: { label: "Structural Damage", icon: "🏚️" },
  flood: { label: "Flood", icon: "🌊" },
  other: { label: "Other", icon: "⚠️" },
};

const SEVERITY_STYLES = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  critical: "bg-rose-50 text-rose-700 ring-rose-200",
};

const STATUS_STYLES = {
  reported: "bg-slate-100 text-slate-600 ring-slate-200",
  verified: "bg-blue-50 text-blue-700 ring-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

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

export default function HazardReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "structural_damage",
    description: "",
    severity: "medium",
    location_label: "",
  });

  const canVerify = ["lgu", "drrmo", "admin"].includes(user?.role);

  const loadData = useCallback(async () => {
    try {
      const list = await base44.entities.HazardReport.list("-created_date", 500);
      setReports(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsub = base44.entities.HazardReport.subscribe(() => {
      loadData();
    });
    return unsub;
  }, [loadData]);

  const submit = async () => {
    if (!form.description.trim()) return;
    setSubmitting(true);
    try {
      const loc = await getLocation();
      const report = await base44.entities.HazardReport.create({
        type: form.type,
        description: form.description,
        severity: form.severity,
        location_label: form.location_label || (loc ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : "Location unavailable"),
        location_lat: loc?.lat,
        location_lng: loc?.lng,
        status: "reported",
      });
      setReports([report, ...reports]);
      setForm({ type: "structural_damage", description: "", severity: "medium", location_label: "" });
      setDialogOpen(false);
    } catch (e) {
      alert("Failed to submit report: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const updated = await base44.entities.HazardReport.update(id, { status });
      setReports(reports.map((r) => (r.id === id ? updated : r)));
    } catch (e) {
      alert("Failed to update: " + e.message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Community Hazard Reports"
        description="Report and track hazards in your area"
        icon={AlertTriangle}
        accent="amber"
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="mr-2 h-4 w-4" /> Report hazard
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No hazards reported"
          description="Be the first to report a hazard in your community — cracked roads, landslides, gas leaks, and more."
          action={
            <Button onClick={() => setDialogOpen(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="mr-2 h-4 w-4" /> Report a hazard
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const ht = HAZARD_TYPES[r.type] || HAZARD_TYPES.other;
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                    {ht.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{ht.label}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${SEVERITY_STYLES[r.severity] || SEVERITY_STYLES.medium}`}>
                        {r.severity}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${STATUS_STYLES[r.status] || STATUS_STYLES.reported}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600">{r.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      {r.location_label && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {r.location_label}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {timeAgo(r.created_date)}
                      </span>
                    </div>
                  </div>
                  {canVerify && r.status !== "resolved" && (
                    <div className="flex shrink-0 gap-1">
                      {r.status === "reported" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateStatus(r.id, "verified")}
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Verify
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(r.id, "resolved")}
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Resolve
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <Flag className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle>Report a Hazard</DialogTitle>
            <DialogDescription>
              Help your community by reporting hazards in real time. Your location will be attached automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Hazard type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(HAZARD_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="h-desc">Description</Label>
              <Textarea
                id="h-desc"
                placeholder="Describe what you see..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="h-loc">Location (optional)</Label>
              <Input
                id="h-loc"
                placeholder="Landmark or address — GPS added automatically"
                value={form.location_label}
                onChange={(e) => setForm({ ...form, location_label: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-amber-600 hover:bg-amber-700" disabled={submitting || !form.description.trim()}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}