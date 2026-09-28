import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import {
  Siren, Home as HomeIcon, Bot, Megaphone, AlertTriangle,
  Users, ShieldCheck, ArrowRight, Plus, MapPin, Clock, ChevronRight
} from "lucide-react";

const PRIORITY_STYLES = {
  critical: "bg-rose-50 text-rose-700 ring-rose-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
};

const TYPE_LABELS = {
  verified_advisory: "Verified Advisory",
  community: "Community",
  drill: "Drill Notice",
  recovery_update: "Recovery Update",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Home() {
  const { user } = useAuth();
  const [household, setHousehold] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [activeSos, setActiveSos] = useState([]);
  const [reportedHazards, setReportedHazards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user?.household_id]);

  const loadData = async () => {
    try {
      const [annList, sosList, hazList] = await Promise.all([
        base44.entities.Announcement.list("-created_date", 3),
        base44.entities.SOSAlert.filter({ status: "active" }, "-created_date", 5),
        base44.entities.HazardReport.filter({ status: "reported" }, "-created_date", 5),
      ]);
      setAnnouncements(annList || []);
      setActiveSos(sosList || []);
      setReportedHazards(hazList || []);
      if (user?.household_id) {
        try {
          const hh = await base44.entities.Household.get(user.household_id);
          setHousehold(hh);
        } catch (e) { /* household may not exist yet */ }
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const needsSetup = !user?.household_id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={`Welcome, ${user?.full_name?.split(" ")[0] || "there"}`}
        description="Your earthquake preparedness and emergency response hub"
        icon={ShieldCheck}
      />

      {/* Setup banner */}
      {needsSetup && !loading && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl backdrop-saturate-150 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                <HomeIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Complete your safety setup</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Create or join a household to unlock emergency contacts, safety check-ins, and one-tap SOS.
                </p>
              </div>
            </div>
            <Link to="/profile">
              <Button className="shrink-0 bg-blue-600 hover:bg-blue-700">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link to="/sos">
          <div className="group flex flex-col items-center gap-2 rounded-2xl border border-rose-200 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 transition-all hover:border-rose-400 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 transition-transform group-hover:scale-110">
              <Siren className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Emergency SOS</span>
          </div>
        </Link>
        <Link to="/household">
          <div className="group flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 transition-all hover:border-emerald-400 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Check In</span>
          </div>
        </Link>
        <Link to="/assistant">
          <div className="group flex flex-col items-center gap-2 rounded-2xl border border-indigo-200 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 transition-all hover:border-indigo-400 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 transition-transform group-hover:scale-110">
              <Bot className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-900">AI Assistant</span>
          </div>
        </Link>
        <Link to="/hazards">
          <div className="group flex flex-col items-center gap-2 rounded-2xl border border-amber-200 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 transition-all hover:border-amber-400 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 transition-transform group-hover:scale-110">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold text-slate-900">Report Hazard</span>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Household Members"
          value={household?.member_user_ids?.length || 0}
          sublabel={household?.name || "No household yet"}
          accent="blue"
        />
        <StatCard
          icon={Siren}
          label="Active SOS Alerts"
          value={activeSos.length}
          sublabel="Across the community"
          accent="rose"
        />
        <StatCard
          icon={AlertTriangle}
          label="Reported Hazards"
          value={reportedHazards.length}
          sublabel="Awaiting verification"
          accent="amber"
        />
        <StatCard
          icon={Megaphone}
          label="Recent Advisories"
          value={announcements.length}
          sublabel="Latest updates"
          accent="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent announcements */}
        <div className="rounded-2xl border border-white/40 bg-white/55 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-xl backdrop-saturate-150">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Megaphone className="h-4 w-4 text-slate-400" />
              Latest Announcements
            </h2>
            <Link to="/announcements" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-white/30" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No announcements yet</p>
          ) : (
            <ul className="space-y-2">
              {announcements.map((ann) => (
                <li key={ann.id}>
                  <Link
                    to="/announcements"
                    className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-white/30"
                  >
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${
                        PRIORITY_STYLES[ann.priority] || PRIORITY_STYLES.info
                      }`}
                    >
                      {ann.priority}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{ann.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {TYPE_LABELS[ann.type] || ann.type} · {timeAgo(ann.created_date)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Active alerts */}
        <div className="rounded-2xl border border-white/40 bg-white/55 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-xl backdrop-saturate-150">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Siren className="h-4 w-4 text-rose-500" />
              Active Community Alerts
            </h2>
            <Link to="/sos" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-white/30" />
              ))}
            </div>
          ) : activeSos.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <ShieldCheck className="mb-2 h-8 w-8 text-emerald-400" />
              <p className="text-sm font-medium text-slate-600">No active emergencies</p>
              <p className="mt-0.5 text-xs text-slate-400">Your community is safe right now</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {activeSos.map((sos) => (
                <li
                  key={sos.id}
                  className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-full bg-rose-600 text-white">
                    <Siren className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-rose-900">
                      {sos.message || "Emergency assistance needed"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-rose-600">
                      <Clock className="h-3 w-3" />
                      {timeAgo(sos.created_date)}
                      {sos.location_label && (
                        <>
                          <MapPin className="ml-1 h-3 w-3" />
                          {sos.location_label}
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}