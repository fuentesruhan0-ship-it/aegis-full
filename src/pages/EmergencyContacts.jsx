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
  Phone, Plus, Pencil, Trash2, Mail, Star, Loader2, Users
} from "lucide-react";

const PRIORITY_LABELS = {
  primary: { label: "Primary", color: "bg-blue-50 text-blue-700 ring-blue-200" },
  secondary: { label: "Secondary", color: "bg-slate-100 text-slate-600 ring-slate-200" },
  tertiary: { label: "Tertiary", color: "bg-slate-50 text-slate-500 ring-slate-200" },
};

export default function EmergencyContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", relationship: "", phone: "", email: "", priority: "secondary" });

  const loadData = useCallback(async () => {
    try {
      if (user?.household_id) {
        const list = await base44.entities.EmergencyContact.filter(
          { household_id: user.household_id },
          "-created_date"
        );
        setContacts(list || []);
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

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", relationship: "", phone: "", email: "", priority: "secondary" });
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
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    try {
      if (editing) {
        const updated = await base44.entities.EmergencyContact.update(editing.id, form);
        setContacts(contacts.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        const created = await base44.entities.EmergencyContact.create({
          ...form,
          household_id: user.household_id,
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

  if (!user?.household_id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader title="Emergency Contacts" description="Your shared contact directory" icon={Phone} />
        <EmptyState
          icon={Users}
          title="No household yet"
          description="Create a household first to manage emergency contacts."
          action={<a href="/profile"><Button className="bg-blue-600 hover:bg-blue-700">Set up household</Button></a>}
        />
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
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Add contact
          </Button>
        }
      />

      {contacts.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No contacts yet"
          description="Add family members, neighbors, or emergency services so they're notified instantly during an SOS."
          action={
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> Add your first contact
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((c) => {
            const pri = PRIORITY_LABELS[c.priority] || PRIORITY_LABELS.secondary;
            return (
              <li
                key={c.id}
                className="flex items-center gap-4 rounded-2xl border border-white/40 bg-white/55 backdrop-blur-xl backdrop-saturate-150 p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{c.name}</p>
                    {c.priority === "primary" && (
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {c.relationship ? `${c.relationship} · ` : ""}
                    <a href={`tel:${c.phone}`} className="text-blue-600 hover:underline">{c.phone}</a>
                    {c.email && <span> · {c.email}</span>}
                  </p>
                </div>
                <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 sm:inline ${pri.color}`}>
                  {pri.label}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-9 w-9 text-slate-400 hover:text-slate-700">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(c.id)} className="h-9 w-9 text-slate-400 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit contact" : "Add emergency contact"}</DialogTitle>
            <DialogDescription>
              This person will be notified when you trigger an SOS alert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="c-rel">Relationship</Label>
                <Input id="c-rel" placeholder="e.g. Parent" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-pri">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger id="c-pri"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="tertiary">Tertiary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">Phone</Label>
              <Input id="c-phone" placeholder="+63..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">Email (optional)</Label>
              <Input id="c-email" type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-blue-600 hover:bg-blue-700" disabled={!form.name.trim() || !form.phone.trim()}>
              {editing ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}