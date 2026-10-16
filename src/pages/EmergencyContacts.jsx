import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import {
  Phone, Plus, Pencil, Trash2, Mail, Star, Loader2, Users, ShieldAlert, CheckCircle2,
  AlertCircle, Radio, Sparkles
} from "lucide-react";
import { formatDialablePhone, fetchEmergencyContacts } from "@/lib/sosDispatch";

const PRIORITY_LABELS = {
  primary: { label: "Primary (Immediate)", color: "bg-rose-50 text-rose-700 ring-rose-200" },
  secondary: { label: "Secondary", color: "bg-blue-50 text-blue-700 ring-blue-200" },
  tertiary: { label: "Tertiary", color: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export default function EmergencyContacts() {
  const { user, updateUser } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", relationship: "", phone: "", email: "", priority: "secondary" });
  const [settingUpHh, setSettingUpHh] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const list = await fetchEmergencyContacts(user?.household_id, user?.id);
      setContacts(list || []);
    } catch (e) {
      console.error("Failed to load emergency contacts:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.household_id, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickSetupHousehold = async () => {
    setSettingUpHh(true);
    try {
      const defaultName = `${user?.full_name || "Personal"}'s Emergency Group`;
      const createdHh = await base44.entities.Household.create({
        name: defaultName,
        address: user?.address || "Home Location",
        evacuation_meeting_point: "Designated Community Open Space",
        member_user_ids: [user?.id],
      });
      await base44.auth.updateMe({ household_id: createdHh.id });
      if (updateUser) {
        updateUser({ ...user, household_id: createdHh.id });
      }
      await loadData();
      return createdHh.id;
    } catch (err) {
      console.error("Failed to auto-create household:", err);
      return null;
    } finally {
      setSettingUpHh(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", relationship: "", phone: "", email: "", priority: "secondary" });
    setPhoneError("");
    setDialogOpen(true);
  };

  const openEdit = (contact) => {
    setEditing(contact);
    setForm({
      name: contact.name,
      relationship: contact.relationship || "",
      phone: contact.phone,
      email: contact.email || "",
      priority: contact.priority || "secondary",
    });
    setPhoneError("");
    setDialogOpen(true);
  };

  const validatePhone = (phone) => {
    const dialable = formatDialablePhone(phone);
    return Boolean(dialable && dialable.length >= 7 && dialable.length <= 16);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    if (!validatePhone(form.phone)) {
      setPhoneError("Please enter a valid phone number (e.g., 09123456789 or +63 912 345 6789)");
      return;
    }
    setPhoneError("");

    try {
      let currentHhId = user?.household_id;
      if (!currentHhId) {
        currentHhId = await handleQuickSetupHousehold();
      }

      const formattedPhone = form.phone.trim();

      if (editing) {
        const updated = await base44.entities.EmergencyContact.update(editing.id, {
          ...form,
          phone: formattedPhone,
        });
        setContacts(contacts.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        const created = await base44.entities.EmergencyContact.create({
          ...form,
          phone: formattedPhone,
          household_id: currentHhId || "household_" + (user?.id || Date.now()),
          created_by_id: user?.id,
        });
        setContacts([created, ...contacts]);
      }
      setDialogOpen(false);
    } catch (e) {
      alert("Failed to save contact: " + e.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Remove this emergency contact?")) return;
    try {
      await base44.entities.EmergencyContact.delete(id);
      setContacts(contacts.filter((c) => c.id !== id));
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const sorted = [...contacts].sort((a, b) => {
    const order = { primary: 0, secondary: 1, tertiary: 2 };
    return (order[a.priority] || 2) - (order[b.priority] || 2);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Emergency Contacts"
        description="People who will be notified when you send an SOS"
        icon={Phone}
        actions={
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Add contact
          </Button>
        }
      />

      {/* Info notice for SOS integration */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-200/60 bg-blue-50/70 p-4 text-xs text-blue-900 shadow-sm backdrop-blur-md">
        <ShieldAlert className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <p className="font-bold">Connected Emergency Dispatch</p>
          <p className="mt-0.5 text-blue-700">
            Contacts in this directory are the real recipients dispatched during an Emergency SOS alert.
            In-app notification records are generated instantly for every contact.
          </p>
        </div>
      </div>

      {contacts.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No contacts yet"
          description="Add family members, neighbors, or emergency services so they're notified instantly during an SOS."
          action={
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Add your first contact
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((c) => {
            const pri = PRIORITY_LABELS[c.priority] || PRIORITY_LABELS.secondary;
            const cleanPhone = formatDialablePhone(c.phone);
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl backdrop-saturate-150 p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-200/60"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold text-slate-900">{c.name}</p>
                      {c.priority === "primary" && (
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {c.relationship ? <span className="font-medium text-slate-700">{c.relationship} · </span> : ""}
                      {cleanPhone ? (
                        <a href={`tel:${cleanPhone}`} className="text-blue-600 font-semibold hover:underline" title="Click to call">{c.phone}</a>
                      ) : (
                        <span>{c.phone}</span>
                      )}
                      {c.email && <span className="text-slate-400"> · {c.email}</span>}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${pri.color}`}>
                    {pri.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {cleanPhone && (
                      <a
                        href={`tel:${cleanPhone}`}
                        className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                        title={`Call ${c.name} directly`}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-9 w-9 text-slate-400 hover:text-slate-700">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)} className="h-9 w-9 text-slate-400 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Notification Channel Readiness */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> In-App Notification: Ready
                  </span>
                  <span className="flex items-center gap-1 text-slate-400 font-medium" title="SMS gateway ready for Twilio or telecom configuration">
                    <Radio className="h-3 w-3 text-amber-500" /> SMS Carrier: Gateway Pending
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md glass-frosted border-white/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900">{editing ? "Edit contact" : "Add emergency contact"}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This person will be directly notified whenever you trigger an Emergency SOS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-name" className="text-xs font-semibold">Contact Name *</Label>
              <Input id="c-name" placeholder="Full name (e.g. Maria Santos)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/80" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-rel" className="text-xs font-semibold">Relationship</Label>
                <Input id="c-rel" placeholder="e.g. Parent, Sibling" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="bg-white/80" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-pri" className="text-xs font-semibold">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger id="c-pri" className="bg-white/80"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass-frosted border-white/50 z-[2000]">
                    <SelectItem value="primary">Primary (Immediate)</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="tertiary">Tertiary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone" className="text-xs font-semibold">Phone Number *</Label>
              <Input id="c-phone" placeholder="+63 912 345 6789 or 09123456789" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setPhoneError(""); }} className="bg-white/80" />
              {phoneError && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {phoneError}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email" className="text-xs font-semibold">Email (optional)</Label>
              <Input id="c-email" type="email" placeholder="contact@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-white/80" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 shadow-md font-bold" disabled={!form.name.trim() || !form.phone.trim()}>
              {editing ? "Save Changes" : "Save Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
