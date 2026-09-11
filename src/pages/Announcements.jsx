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
  Megaphone, Plus, Loader2, ShieldCheck, Clock, AlertTriangle, Info, GraduationCap, Wrench
} from "lucide-react";

const TYPE_CONFIG = {
  verified_advisory: { label: "Verified Advisory", icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200" },
  community: { label: "Community", icon: Megaphone, color: "text-slate-600", bg: "bg-slate-50", ring: "ring-slate-200" },
  drill: { label: "Drill Notice", icon: GraduationCap, color: "text-indigo-600", bg: "bg-indigo-50", ring: "ring-indigo-200" },
  recovery_update: { label: "Recovery Update", icon: Wrench, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" },
};

const PRIORITY_CONFIG = {
  info: { label: "Info", icon: Info, ring: "ring-blue-200", bar: "bg-blue-500" },
  warning: { label: "Warning", icon: AlertTriangle, ring: "ring-amber-200", bar: "bg-amber-500" },
  critical: { label: "Critical", icon: AlertTriangle, ring: "ring-rose-200", bar: "bg-rose-500" },
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

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "", content: "", type: "community", priority: "info", target_audience: "all",
  });

  const canPostVerified = ["drrmo", "lgu", "admin"].includes(user?.role);

  const loadData = useCallback(async () => {
    try {
      const list = await base44.entities.Announcement.list("-created_date", 50);
      setAnnouncements(list || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      const ann = await base44.entities.Announcement.create(form);
      setAnnouncements([ann, ...announcements]);
      setForm({ title: "", content: "", type: "community", priority: "info", target_audience: "all" });
      setDialogOpen(false);
    } catch (e) {
      alert("Failed to post: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Community Announcements"
        description="Verified advisories and community updates"
        icon={Megaphone}
        actions={
          <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Post announcement
          </Button>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements yet"
          description="Post community updates, drill notices, or verified advisories for your area."
          action={
            <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> Post the first announcement
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {announcements.map((ann) => {
            const tc = TYPE_CONFIG[ann.type] || TYPE_CONFIG.community;
            const pc = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.info;
            const TypeIcon = tc.icon;
            return (
              <li
                key={ann.id}
                className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md`}
              >
                <div className={`h-1 w-full ${pc.bar}`} />
                <div className="p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ring-1 ${tc.bg} ${tc.color} ${tc.ring}`}>
                      <TypeIcon className="h-3 w-3" />
                      {tc.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ring-1 ${pc.ring} ${pc.bar.replace('bg-', 'text-')}`}>
                      {pc.label}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{ann.title}</h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{ann.content}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {timeAgo(ann.created_date)}
                    </span>
                    {ann.target_audience !== "all" && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                        For: {ann.target_audience}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post an announcement</DialogTitle>
            <DialogDescription>
              {canPostVerified
                ? "As an official, you can post verified advisories."
                : "Share community updates and information."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="a-title">Title</Label>
              <Input id="a-title" placeholder="Announcement title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-content">Content</Label>
              <Textarea id="a-content" placeholder="Write your announcement..." rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="community">Community</SelectItem>
                    {canPostVerified && <SelectItem value="verified_advisory">Verified Advisory</SelectItem>}
                    <SelectItem value="drill">Drill Notice</SelectItem>
                    <SelectItem value="recovery_update">Recovery Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={form.target_audience} onValueChange={(v) => setForm({ ...form, target_audience: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="residents">Residents</SelectItem>
                  <SelectItem value="responders">Responders</SelectItem>
                  <SelectItem value="volunteers">Volunteers</SelectItem>
                  <SelectItem value="lgus">LGUs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-blue-600 hover:bg-blue-700" disabled={submitting || !form.title.trim() || !form.content.trim()}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Posting...</> : "Post announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}