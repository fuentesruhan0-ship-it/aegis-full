// @ts-nocheck
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import ProfilePhotoCard from "@/components/ProfilePhotoCard";
import {
  UserCircle, Save, Loader2, Home as HomeIcon, Users, Plus, Phone, MapPin
} from "lucide-react";

const ROLES = [
  { value: "resident", label: "Resident", desc: "Personal risk profile, household tools, SOS, hazard reporting" },
  { value: "responder", label: "Emergency Responder", desc: "SOS alerts & household safety check-in access" },
  { value: "lgu", label: "LGU Staff", desc: "Real-time hazard visibility & infrastructure monitoring" },
  { value: "drrmo", label: "DRRMO Staff", desc: "Verified advisory posting & volunteer coordination" },
  { value: "volunteer", label: "Volunteer", desc: "Matching with LGUs & affected communities" },
];
// Geolocation helpers
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
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`
  )
    .then((r) => r.json())
    .then((d) => d?.display_name || "Current location")
    .catch(() => "Current location");
}

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ role: "resident", phone: "", address: "" });
  const [household, setHousehold] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hhOpen, setHhOpen] = useState(false);
  const [hhForm, setHhForm] = useState({ name: "", address: "", meeting_point: "", evacuation_plan: "" });
  const [joinId, setJoinId] = useState("");
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [fetchingHHLocation, setFetchingHHLocation] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        role: user.role || "resident",
        phone: user.phone || "",
        address: user.address || "",
      });

      // Auto-fetch location if address is empty
      if (!user.address || user.address.trim() === "") {
        autoFetchLocation();
      }
      if (user.household_id) {
        base44.entities.Household.get(user.household_id)
          .then(setHousehold)
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [user]);

  // Auto-fetch location for user profile
  const autoFetchLocation = async () => {
    setFetchingLocation(true);
    try {
      const loc = await getLocation();
      if (loc) {
        const address = await reverseGeocode(loc.lat, loc.lng);
        setForm((prev) => ({ ...prev, address }));
      }
    } catch (e) {
      console.error("Failed to fetch location:", e);
    } finally {
      setFetchingLocation(false);
    }
  };

  // Auto-fetch location for household creation
  const autoFetchHHLocation = async () => {
    setFetchingHHLocation(true);
    try {
      const loc = await getLocation();
      if (loc) {
        const address = await reverseGeocode(loc.lat, loc.lng);
        setHhForm((prev) => ({ ...prev, address }));
      }
    } catch (e) {
      console.error("Failed to fetch household location:", e);
    } finally {
      setFetchingHHLocation(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        role: form.role,
        phone: form.phone,
        address: form.address,
      });
      window.location.reload();
    } catch (e) {
      alert("Failed to save: " + e.message);
      setSaving(false);
    }
  };

  const createHousehold = async () => {
    if (!hhForm.name.trim()) return;
    try {
      const hh = await base44.entities.Household.create({
        name: hhForm.name,
        address: hhForm.address,
        meeting_point: hhForm.meeting_point,
        evacuation_plan: hhForm.evacuation_plan,
        member_user_ids: [user.id],
      });
      await base44.auth.updateMe({ household_id: hh.id });
      setHousehold(hh);
      setHhOpen(false);
      setHhForm({ name: "", address: "", meeting_point: "", evacuation_plan: "" });
    } catch (e) {
      alert("Failed to create household: " + e.message);
    }
  };

  const joinHousehold = async () => {
    if (!joinId.trim()) return;
    try {
      const hh = await base44.entities.Household.get(joinId.trim());
      const members = hh.member_user_ids || [];
      if (!members.includes(user.id)) {
        members.push(user.id);
        await base44.entities.Household.update(hh.id, { member_user_ids: members });
      }
      await base44.auth.updateMe({ household_id: hh.id });
      setHousehold({ ...hh, member_user_ids: members });
      setJoinId("");
    } catch (e) {
      alert("Household not found. Check the ID and try again.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title="Profile & Settings" description="Manage your role and household" icon={UserCircle} />

      {user && <ProfilePhotoCard user={user} />}

      {/* Role & contact */}
      <div className="mb-6 rounded-2xl glass-cinematic p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Your role & contact info</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              {ROLES.find((r) => r.value === form.role)?.desc}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="p-phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="p-phone" className="pl-10" placeholder="+63..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input id="p-address" className="pl-10" placeholder="Your home address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
                          <p className="text-xs text-slate-500">
                {fetchingLocation ? "Detecting your location..." : "Tap pin to auto-fill from your current location"}
              </p>
            </div>
          </div>
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save changes</>}
          </Button>
        </div>
      </div>

      {/* Household */}
      <div className="rounded-2xl glass-cinematic p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <HomeIcon className="h-5 w-5 text-emerald-600" />
          Household
        </h2>
        {loading ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : household ? (
          <div>
            <div className="rounded-xl bg-emerald-50/60 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{household.name}</p>
                  <p className="text-sm text-slate-500">
                    {household.member_user_ids?.length || 1} member(s)
                    {household.address ? ` Â· ${household.address}` : ""}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-white/50 bg-white/40 p-3">
              <p className="text-xs text-slate-400">Household ID (share to let family join)</p>
              <p className="mt-1 font-mono text-sm text-slate-700 select-all">{household.id}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Create a household or join an existing one with a household ID from a family member.
            </p>
            <Button onClick={() => setHhOpen(!hhOpen)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" /> Create household
            </Button>
            {hhOpen && (
              <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                <div className="space-y-2">
                  <Label htmlFor="hh-name">Household name</Label>
                  <Input id="hh-name" placeholder="e.g. Fuentes Family" value={hhForm.name} onChange={(e) => setHhForm({ ...hhForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hh-addr">Address</Label>
                  <Input id="hh-addr" placeholder="Home address" value={hhForm.address} onChange={(e) => setHhForm({ ...hhForm, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hh-meet">Meeting point</Label>
                  <Input id="hh-meet" placeholder="Where to gather" value={hhForm.meeting_point} onChange={(e) => setHhForm({ ...hhForm, meeting_point: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hh-plan">Evacuation plan</Label>
                  <Textarea id="hh-plan" rows={3} placeholder="Steps your family will follow..." value={hhForm.evacuation_plan} onChange={(e) => setHhForm({ ...hhForm, evacuation_plan: e.target.value })} />
                </div>
                <Button onClick={createHousehold} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!hhForm.name.trim()}>
                  Create household
                </Button>
              </div>
            )}
            <div className="border-t border-slate-200 pt-4">
              <Label htmlFor="join-id">Join with household ID</Label>
              <div className="mt-2 flex gap-2">
                <Input id="join-id" placeholder="Paste household ID" value={joinId} onChange={(e) => setJoinId(e.target.value)} />
                <Button onClick={joinHousehold} variant="outline" disabled={!joinId.trim()}>Join</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}