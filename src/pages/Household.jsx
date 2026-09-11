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
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import {
  Home as HomeIcon, Users, MapPin, ShieldCheck, AlertCircle,
  Plus, Pencil, CheckCircle2, HelpCircle, Clock, Loader2
} from "lucide-react";

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

const STATUS_CONFIG = {
  safe: { label: "Safe", icon: CheckCircle2, color: "emerald", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  need_help: { label: "Needs Help", icon: AlertCircle, color: "rose", bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" },
  unknown: { label: "Not Checked In", icon: HelpCircle, color: "slate", bg: "bg-slate-50", text: "text-slate-500", ring: "ring-slate-200" },
};

export default function Household() {
  const { user } = useAuth();
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", meeting_point: "", evacuation_plan: "" });

  const loadData = useCallback(async () => {
    try {
      if (user?.household_id) {
        const hh = await base44.entities.Household.get(user.household_id);
        setHousehold(hh);
        setForm({
          name: hh.name || "",
          address: hh.address || "",
          meeting_point: hh.meeting_point || "",
          evacuation_plan: hh.evacuation_plan || "",
        });
        const memberIds = hh.member_user_ids || [];
        if (memberIds.length > 0) {
          const users = await base44.entities.User.list();
          const hhMembers = (users || []).filter((u) => memberIds.includes(u.id));
          setMembers(hhMembers);
        } else {
          setMembers(user ? [user] : []);
        }
        const ci = await base44.entities.SafetyCheckIn.filter(
          { household_id: user.household_id },
          "-created_date",
          50
        );
        setCheckIns(ci || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.household_id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createHousehold = async () => {
    if (!form.name.trim()) return;
    try {
      const hh = await base44.entities.Household.create({
        name: form.name,
        address: form.address,
        meeting_point: form.meeting_point,
        evacuation_plan: form.evacuation_plan,
        member_user_ids: [user.id],
      });
      await base44.auth.updateMe({ household_id: hh.id });
      setHousehold(hh);
      setCreateOpen(false);
      setMembers([user]);
      window.location.reload();
    } catch (e) {
      alert("Failed to create household: " + e.message);
    }
  };

  const saveEdit = async () => {
    try {
      const updated = await base44.entities.Household.update(household.id, {
        address: form.address,
        meeting_point: form.meeting_point,
        evacuation_plan: form.evacuation_plan,
      });
      setHousehold(updated);
      setEditOpen(false);
    } catch (e) {
      alert("Failed to save: " + e.message);
    }
  };

  const checkIn = async (status) => {
    setCheckingIn(true);
    try {
      const loc = await getLocation();
      const ci = await base44.entities.SafetyCheckIn.create({
        household_id: user.household_id,
        status,
        location_lat: loc?.lat,
        location_lng: loc?.lng,
        location_label: loc ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : null,
      });
      setCheckIns([ci, ...checkIns]);
    } catch (e) {
      alert("Check-in failed: " + e.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const latestCheckInByUser = {};
  checkIns.forEach((ci) => {
    const uid = ci.created_by_id;
    if (!latestCheckInByUser[uid] || new Date(ci.created_date) > new Date(latestCheckInByUser[uid].created_date)) {
      latestCheckInByUser[uid] = ci;
    }
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="My Household" description="Your family emergency group" icon={HomeIcon} />
        <EmptyState
          icon={HomeIcon}
          title="No household yet"
          description="Create a household to share emergency contacts, evacuation plans, and safety check-ins with your family."
          action={
            <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> Create household
            </Button>
          }
        />
        <CreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          form={form}
          setForm={setForm}
          onCreate={createHousehold}
        />
      </div>
    );
  }

  const safeCount = members.filter((m) => latestCheckInByUser[m.id]?.status === "safe").length;
  const helpCount = members.filter((m) => latestCheckInByUser[m.id]?.status === "need_help").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={household.name}
        description="Household emergency plan and safety check-in"
        icon={HomeIcon}
        accent="emerald"
        actions={
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit plan
          </Button>
        }
      />

      {/* Safety check-in */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          Safety Check-In
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Mark your status — your household will be notified instantly.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => checkIn("safe")}
            disabled={checkingIn}
            className="h-16 bg-emerald-600 text-base hover:bg-emerald-700"
          >
            {checkingIn ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-5 w-5" />
            )}
            I'm Safe
          </Button>
          <Button
            onClick={() => checkIn("need_help")}
            disabled={checkingIn}
            className="h-16 bg-rose-600 text-base hover:bg-rose-700"
          >
            {checkingIn ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <AlertCircle className="mr-2 h-5 w-5" />
            )}
            I Need Help
          </Button>
        </div>
      </div>

      {/* Member status */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Users className="h-5 w-5 text-slate-400" />
            Member Status ({members.length})
          </h2>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1 font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> {safeCount} safe
            </span>
            {helpCount > 0 && (
              <span className="flex items-center gap-1 font-medium text-rose-600">
                <AlertCircle className="h-3.5 w-3.5" /> {helpCount} need help
              </span>
            )}
          </div>
        </div>
        <ul className="space-y-2">
          {members.map((m) => {
            const ci = latestCheckInByUser[m.id];
            const cfg = STATUS_CONFIG[ci?.status || "unknown"];
            const StatusIcon = cfg.icon;
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-sm font-semibold text-white">
                  {(m.full_name || m.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {m.full_name || m.email}
                    {m.id === user.id && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {ci ? `Checked in ${timeAgo(ci.created_date)}` : "Has not checked in"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {cfg.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Evacuation plan */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MapPin className="h-4 w-4 text-blue-600" />
            Meeting Point
          </h3>
          <p className="text-sm text-slate-600">
            {household.meeting_point || "No meeting point set. Edit your plan to add one."}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <HomeIcon className="h-4 w-4 text-blue-600" />
            Address
          </h3>
          <p className="text-sm text-slate-600">
            {household.address || "No address set."}
          </p>
        </div>
      </div>

      {household.evacuation_plan && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Evacuation Plan
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {household.evacuation_plan}
          </p>
        </div>
      )}

      {/* Recent check-ins */}
      {checkIns.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Clock className="h-4 w-4 text-slate-400" />
            Recent Check-Ins
          </h3>
          <ul className="space-y-2">
            {checkIns.slice(0, 8).map((ci) => {
              const member = members.find((m) => m.id === ci.created_by_id);
              const cfg = STATUS_CONFIG[ci.status];
              const StatusIcon = cfg.icon;
              return (
                <li key={ci.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
                  <StatusIcon className={`h-4 w-4 ${cfg.text}`} />
                  <span className="text-sm font-medium text-slate-700">
                    {member?.full_name || member?.email || "Member"}
                  </span>
                  <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
                  {ci.location_label && (
                    <span className="hidden text-xs text-slate-400 sm:inline">· {ci.location_label}</span>
                  )}
                  <span className="ml-auto text-xs text-slate-400">{timeAgo(ci.created_date)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={form}
        setForm={setForm}
        onCreate={createHousehold}
      />
      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        form={form}
        setForm={setForm}
        onSave={saveEdit}
      />
    </div>
  );
}

function CreateDialog({ open, onOpenChange, form, setForm, onCreate }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create your household</DialogTitle>
          <DialogDescription>
            Set up a family group to share emergency contacts and safety check-ins.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="hh-name">Household name</Label>
            <Input
              id="hh-name"
              placeholder="e.g. Fuentes Family"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hh-address">Home address</Label>
            <Input
              id="hh-address"
              placeholder="Street, barangay, city"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hh-meeting">Meeting point</Label>
            <Input
              id="hh-meeting"
              placeholder="Where your family will gather"
              value={form.meeting_point}
              onChange={(e) => setForm({ ...form, meeting_point: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hh-plan">Evacuation plan</Label>
            <Textarea
              id="hh-plan"
              placeholder="Step-by-step plan for your household..."
              rows={3}
              value={form.evacuation_plan}
              onChange={(e) => setForm({ ...form, evacuation_plan: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onCreate} className="bg-blue-600 hover:bg-blue-700" disabled={!form.name.trim()}>
            Create household
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ open, onOpenChange, form, setForm, onSave }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit emergency plan</DialogTitle>
          <DialogDescription>Update your household's evacuation details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ed-address">Home address</Label>
            <Input
              id="ed-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-meeting">Meeting point</Label>
            <Input
              id="ed-meeting"
              value={form.meeting_point}
              onChange={(e) => setForm({ ...form, meeting_point: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ed-plan">Evacuation plan</Label>
            <Textarea
              id="ed-plan"
              rows={4}
              value={form.evacuation_plan}
              onChange={(e) => setForm({ ...form, evacuation_plan: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} className="bg-blue-600 hover:bg-blue-700">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}