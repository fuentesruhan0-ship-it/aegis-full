import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import {
  Siren, MapPin, Phone, Users, ShieldCheck, X, Loader2, AlertCircle, CheckCircle2
} from "lucide-react";

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
    .then((d) => d?.display_name || "Current location")
    .catch(() => "Current location");
}

export default function SOS() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeSos, setActiveSos] = useState(null);
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (user?.household_id) {
        const [hh, contactList, sosList] = await Promise.all([
          base44.entities.Household.get(user.household_id),
          base44.entities.EmergencyContact.filter({ household_id: user.household_id }),
          base44.entities.SOSAlert.filter(
            { household_id: user.household_id, status: "active" },
            "-created_date",
            1
          ),
        ]);
        setHousehold(hh);
        setContacts(contactList || []);
        setActiveSos(sosList?.[0] || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.household_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sendSOS = async () => {
    setSending(true);
    try {
      const loc = await getLocation();
      let locationLabel = "Location unavailable";
      if (loc) {
        locationLabel = await reverseGeocode(loc.lat, loc.lng);
      }
      const alert = await base44.entities.SOSAlert.create({
        household_id: user.household_id,
        message: "I need emergency assistance. This is an AEGIS SOS alert.",
        location_lat: loc?.lat,
        location_lng: loc?.lng,
        location_label: locationLabel,
        status: "active",
      });
      setActiveSos(alert);
      setConfirmOpen(false);
    } catch (e) {
      console.error("SOS failed:", e);
      alert("Failed to send SOS. Please try again or call emergency services directly.");
    } finally {
      setSending(false);
    }
  };

  const resolveSOS = async () => {
    if (!activeSos) return;
    setResolving(true);
    try {
      await base44.entities.SOSAlert.update(activeSos.id, { status: "resolved" });
      setActiveSos(null);
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(false);
    }
  };

  const hasHousehold = !!user?.household_id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Emergency SOS"
        description="One tap alerts all your emergency contacts with your location"
        icon={Siren}
        accent="rose"
      />

      {!hasHousehold && !loading ? (
        <EmptyState
          icon={Users}
          title="Set up your household first"
          description="SOS sends alerts to your household's emergency contacts. Create a household to get started."
          action={
            <a href="/profile">
              <Button className="bg-blue-600 hover:bg-blue-700">Set up household</Button>
            </a>
          }
        />
      ) : activeSos ? (
        /* Active SOS state */
        <div className="overflow-hidden rounded-3xl border-2 border-rose-300 bg-gradient-to-b from-rose-50 to-white shadow-lg">
          <div className="bg-rose-600 px-6 py-5 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <Siren className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">SOS Active</h2>
            <p className="mt-1 text-sm text-rose-100">Your contacts have been notified</p>
          </div>
          <div className="p-6">
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Your location</p>
                <p className="mt-0.5 text-sm text-slate-600">{activeSos.location_label}</p>
                {activeSos.location_lat && (
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    {activeSos.location_lat?.toFixed(5)}, {activeSos.location_lng?.toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Notified contacts ({contacts.length})
              </p>
              {contacts.length === 0 ? (
                <p className="text-sm text-slate-400">No emergency contacts registered yet.</p>
              ) : (
                <ul className="space-y-2">
                  {contacts.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{c.name}</p>
                        <p className="truncate text-xs text-slate-500">{c.phone}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={resolveSOS}
                disabled={resolving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {resolving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
                ) : (
                  <><ShieldCheck className="mr-2 h-4 w-4" />I'm safe now</>
                )}
              </Button>
              <a href={`tel:911`} className="flex-1">
                <Button variant="outline" className="w-full border-rose-300 text-rose-700 hover:bg-rose-50">
                  <Phone className="mr-2 h-4 w-4" />Call 911 directly
                </Button>
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Idle SOS state */
        <div className="flex flex-col items-center py-8">
          <p className="mb-8 max-w-md text-center text-sm text-slate-500">
            Press the button below to instantly alert all {contacts.length} emergency contact
            {contacts.length !== 1 ? "s" : ""} in your household with your current location.
          </p>

          <button
            onClick={() => setConfirmOpen(true)}
            disabled={loading}
            className="group relative flex h-56 w-56 items-center justify-center rounded-full bg-rose-600 shadow-2xl shadow-rose-600/40 transition-all hover:scale-105 hover:bg-rose-700 active:scale-95 disabled:opacity-50"
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/30" />
            <span className="absolute inset-4 rounded-full bg-rose-600 ring-4 ring-white/20" />
            <span className="relative flex flex-col items-center">
              <Siren className="h-14 w-14 text-white" strokeWidth={2.5} />
              <span className="mt-2 text-2xl font-bold tracking-wider text-white">SOS</span>
              <span className="mt-1 text-xs font-medium uppercase tracking-widest text-rose-100">
                Tap to alert
              </span>
            </span>
          </button>

          {contacts.length === 0 && !loading && (
            <div className="mt-8 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              No emergency contacts yet — add some for SOS to reach people.
            </div>
          )}

          <div className="mt-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Users className="h-4 w-4 text-slate-400" />
              Will notify ({contacts.length})
            </h3>
            {contacts.length === 0 ? (
              <p className="text-sm text-slate-400">No contacts registered.</p>
            ) : (
              <ul className="space-y-1.5">
                {contacts.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <span className="text-slate-400">· {c.relationship || "contact"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
              <Siren className="h-7 w-7 text-rose-600" />
            </div>
            <DialogTitle className="text-center text-xl">Send Emergency SOS?</DialogTitle>
            <DialogDescription className="text-center">
              This will alert all your emergency contacts with your current location.
              Only use this in a real emergency.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="flex-1"
              disabled={sending}
            >
              <X className="mr-1 h-4 w-4" /> Cancel
            </Button>
            <Button
              onClick={sendSOS}
              className="flex-1 bg-rose-600 hover:bg-rose-700"
              disabled={sending}
            >
              {sending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
              ) : (
                <><Siren className="mr-2 h-4 w-4" />Send SOS</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}