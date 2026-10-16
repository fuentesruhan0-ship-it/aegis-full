import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import {
  Siren, Home as HomeIcon, Bot, Megaphone, AlertTriangle,
  Users, ShieldCheck, ArrowRight, Plus, MapPin, Clock, ChevronRight,
  ShieldAlert, Backpack, BookOpen, Tent, FolderLock, Building2, HeartHandshake,
  Heart, Radio, Compass, Navigation, CheckCircle2, UserCheck, Phone
} from "lucide-react";
import { filterVisibleLocations } from "@/lib/locationSharing";
import { EVACUATION_CENTERS } from "./EvacuationLocator";

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
  const [sharingUsers, setSharingUsers] = useState([]);
  const [safetyCheckIns, setSafetyCheckIns] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [annList, sosList, hazList, locList] = await Promise.all([
        base44.entities.Announcement.list("-created_date", 4).catch(() => []),
        base44.entities.SOSAlert.filter({ status: "active" }, "-created_date", 5).catch(() => []),
        base44.entities.HazardReport.filter({ status: "reported" }, "-created_date", 5).catch(() => []),
        base44.entities.UserLocation.list("-updated_date", 50).catch(() => []),
      ]);

      setAnnouncements(annList || []);
      setActiveSos(sosList || []);
      setReportedHazards(hazList || []);

      let hhMembers = [];
      if (user?.household_id) {
        try {
          const hh = await base44.entities.Household.get(user.household_id);
          setHousehold(hh);
          hhMembers = hh?.member_user_ids || [];
          // Load safety check-ins
          const checkIns = await base44.entities.SafetyCheckIn.filter(
            { household_id: user.household_id },
            "-created_date",
            10
          ).catch(() => []);
          setSafetyCheckIns(checkIns || []);
        } catch { /* non-critical */ }
      }

      const activeSosUserIds = (sosList || []).map(s => String(s.created_by_id || s.sender_id));
      const visibleLocations = filterVisibleLocations(locList || [], user, hhMembers, activeSosUserIds);
      setSharingUsers(visibleLocations || []);
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.household_id, user]);

  useEffect(() => {
    loadData();

    // Base44 real-time subscriptions
    const unsubAnn = base44.entities.Announcement.subscribe(() => loadData());
    const unsubSos = base44.entities.SOSAlert.subscribe(() => loadData());
    const unsubHaz = base44.entities.HazardReport.subscribe(() => loadData());
    const unsubLoc = base44.entities.UserLocation.subscribe(() => loadData());

    // 15-second polling fallback for guaranteed synchronization
    const timer = setInterval(() => {
      loadData();
    }, 15000);

    return () => {
      unsubAnn();
      unsubSos();
      unsubHaz();
      unsubLoc();
      clearInterval(timer);
    };
  }, [loadData]);

  const needsSetup = !user?.household_id;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title={`Welcome, ${user?.full_name?.split(" ")[0] || "there"}`}
        description="Your real-time connected earthquake preparedness and community safety hub"
        icon={ShieldCheck}
      />

      {/* Setup banner */}
      {needsSetup && !loading && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl backdrop-saturate-150 p-6 shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                <HomeIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Complete your emergency safety setup</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Create or join a household to unlock emergency contacts, real-time safety check-ins, and one-tap SOS alerts.
                </p>
              </div>
            </div>
            <Link to="/profile">
              <Button className="shrink-0 bg-blue-600 hover:bg-blue-700 shadow-md">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 transition-transform group-hover:scale-110 shadow-sm">
              <Siren className="h-6 w-6" />
            </div>
            <span className="text-sm font-bold text-slate-900">Emergency SOS</span>
          </div>
        </Link>
        <Link to="/household">
          <div className="group flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 transition-all hover:border-emerald-400 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition-transform group-hover:scale-110 shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-sm font-bold text-slate-900">Safety Check-In</span>
          </div>
        </Link>
        <Link to="/map">
          <div className="group flex flex-col items-center gap-2 rounded-2xl border border-blue-200 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 transition-all hover:border-blue-400 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-transform group-hover:scale-110 shadow-sm">
              <Compass className="h-6 w-6" />
            </div>
            <span className="text-sm font-bold text-slate-900">Community Map</span>
          </div>
        </Link>
        <Link to="/hazards">
          <div className="group flex flex-col items-center gap-2 rounded-2xl border border-amber-200 bg-white/55 p-5 backdrop-blur-xl backdrop-saturate-150 transition-all hover:border-amber-400 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 transition-transform group-hover:scale-110 shadow-sm">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <span className="text-sm font-bold text-slate-900">Report Hazard</span>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Household Members"
          value={household?.member_user_ids?.length || (household ? 1 : 0)}
          sublabel={household?.name || "No household yet"}
          accent="blue"
        />
        <StatCard
          icon={Siren}
          label="Active SOS Alerts"
          value={activeSos.length}
          sublabel={activeSos.length === 0 ? "All safe" : "Community distress signals"}
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
          icon={Compass}
          label="Sharing Locations"
          value={sharingUsers.length}
          sublabel="Active on Community Map"
          accent="emerald"
        />
      </div>

      {/* Live Community Connected Strip */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Live People on Map Widget */}
        <div className="rounded-2xl border border-white/40 bg-white/60 p-5 shadow-lg backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-900">Live Community Map</h3>
              </div>
              <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                {sharingUsers.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Registered community members currently sharing their locations in real time.
            </p>
            {/* Avatar Pill Strip */}
            <div className="flex items-center gap-1.5 overflow-hidden py-1">
              {sharingUsers.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No one sharing currently</span>
              ) : (
                sharingUsers.slice(0, 6).map((u) => (
                  <div key={u.id} className="relative group" title={u.full_name}>
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm shadow-sm">
                        {u.emoji || "🧍"}
                      </div>
                    )}
                  </div>
                ))
              )}
              {sharingUsers.length > 6 && (
                <span className="text-[11px] font-bold text-slate-500 ml-1">+{sharingUsers.length - 6} more</span>
              )}
            </div>
          </div>
          <Link to="/map" className="mt-4">
            <Button variant="outline" size="sm" className="w-full text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              Open Live Map <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Nearby Evacuation Center Widget */}
        <div className="rounded-2xl border border-white/40 bg-white/60 p-5 shadow-lg backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tent className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Evacuation Centers</h3>
              </div>
              <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                {EVACUATION_CENTERS.length} Registered
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800">Primary: {EVACUATION_CENTERS[0]?.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
              📍 {EVACUATION_CENTERS[0]?.address}
            </p>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-700 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Capacity: {EVACUATION_CENTERS[0]?.capacity} Evacuees · Standby
            </div>
          </div>
          <Link to="/evacuation" className="mt-4">
            <Button variant="outline" size="sm" className="w-full text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50">
              View All Evacuation Centers <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Safety Check-in / Household Status Widget */}
        <div className="rounded-2xl border border-white/40 bg-white/60 p-5 shadow-lg backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Safety Check-In</h3>
              </div>
              <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                {household ? "Household Active" : "Setup Needed"}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {household ? (
                <>Meeting Point: <strong>{household.evacuation_meeting_point || "Designated Open Space"}</strong></>
              ) : (
                "Set up your household to enable instant one-tap safety check-in after an earthquake."
              )}
            </p>
            {safetyCheckIns.length > 0 && (
              <p className="mt-2 text-[11px] text-emerald-600 font-semibold">
                ✓ Latest check-in: {timeAgo(safetyCheckIns[0]?.created_date)}
              </p>
            )}
          </div>
          <Link to="/household" className="mt-4">
            <Button variant="outline" size="sm" className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
              Check-In Now <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Preparedness & Recovery Suite */}
      <div className="mb-8 rounded-2xl border border-white/40 bg-white/55 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-xl backdrop-saturate-150">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-blue-600" />
              Earthquake Preparedness & Recovery Suite
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized hazard scores, family drills, evacuation centers, document vault, and recovery aid
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Link to="/risk-assessment" className="group p-3.5 rounded-xl border border-slate-200/60 bg-white/70 hover:bg-white hover:border-blue-400 hover:shadow-sm transition-all">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 w-fit mb-2 group-hover:scale-105 transition-transform">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600">Risk Assessment</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">PHIVOLCS hazard profile</p>
          </Link>

          <Link to="/go-bag" className="group p-3.5 rounded-xl border border-slate-200/60 bg-white/70 hover:bg-white hover:border-emerald-400 hover:shadow-sm transition-all">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 w-fit mb-2 group-hover:scale-105 transition-transform">
              <Backpack className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">Go-Bag Manager</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">72-hour survival kit</p>
          </Link>

          <Link to="/drills" className="group p-3.5 rounded-xl border border-slate-200/60 bg-white/70 hover:bg-white hover:border-purple-400 hover:shadow-sm transition-all">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 w-fit mb-2 group-hover:scale-105 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600">Drill Scheduler</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Drop, Cover, Hold timer</p>
          </Link>

          <Link to="/knowledge" className="group p-3.5 rounded-xl border border-slate-200/60 bg-white/70 hover:bg-white hover:border-indigo-400 hover:shadow-sm transition-all">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 w-fit mb-2 group-hover:scale-105 transition-transform">
              <BookOpen className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600">Knowledge Hub</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Glossary & past quakes</p>
          </Link>

          <Link to="/evacuation" className="group p-3.5 rounded-xl border border-slate-200/60 bg-white/70 hover:bg-white hover:border-amber-400 hover:shadow-sm transition-all">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 w-fit mb-2 group-hover:scale-105 transition-transform">
              <Tent className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-600">Evacuation Centers</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Nearest open spaces</p>
          </Link>

          <Link to="/damage-vault" className="group p-3.5 rounded-xl border border-slate-200/60 bg-white/70 hover:bg-white hover:border-rose-400 hover:shadow-sm transition-all">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 w-fit mb-2 group-hover:scale-105 transition-transform">
              <FolderLock className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-600">Damage & Vault</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Photo proof & secure IDs</p>
          </Link>

          <Link to="/infrastructure" className="group p-3.5 rounded-xl border border-slate-200/60 bg-white/70 hover:bg-white hover:border-cyan-400 hover:shadow-sm transition-all">
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600 w-fit mb-2 group-hover:scale-105 transition-transform">
              <Building2 className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-cyan-600">Infrastructure</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Roads, bridges, power</p>
          </Link>

          <Link to="/recovery" className="group p-3.5 rounded-xl border border-slate-200/60 bg-white/70 hover:bg-white hover:border-teal-400 hover:shadow-sm transition-all">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 w-fit mb-2 group-hover:scale-105 transition-transform">
              <HeartHandshake className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-600">Recovery Tracker</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">DSWD & LGU aid progress</p>
          </Link>

          <Link to="/volunteers" className="group p-3.5 rounded-xl border border-slate-200/60 bg-white/70 hover:bg-white hover:border-emerald-400 hover:shadow-sm transition-all col-span-2 sm:col-span-1">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 w-fit mb-2 group-hover:scale-105 transition-transform">
              <Heart className="h-4 w-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600">Volunteer Hub</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">LGU relief missions</p>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent announcements */}
        <div className="rounded-2xl border border-white/40 bg-white/55 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-xl backdrop-saturate-150">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Megaphone className="h-4 w-4 text-slate-500" />
              Latest Announcements
            </h2>
            <Link to="/announcements" className="text-xs font-bold text-blue-600 hover:text-blue-700">
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
                    className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/40 bg-white/20 border border-white/30"
                  >
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${
                        PRIORITY_STYLES[ann.priority] || PRIORITY_STYLES.info
                      }`}
                    >
                      {ann.priority}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{ann.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {TYPE_LABELS[ann.type] || ann.type} · {timeAgo(ann.created_date)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 mt-1" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Active alerts */}
        <div className="rounded-2xl border border-white/40 bg-white/55 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-xl backdrop-saturate-150">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Siren className="h-4 w-4 text-rose-500" />
              Active Community SOS Alerts
            </h2>
            <Link to="/sos" className="text-xs font-bold text-blue-600 hover:text-blue-700">
              SOS Station
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
              <ShieldCheck className="mb-2 h-9 w-9 text-emerald-500" />
              <p className="text-sm font-bold text-slate-700">No active emergencies</p>
              <p className="mt-0.5 text-xs text-slate-500">Your community is safe right now</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {activeSos.map((sos) => (
                <li
                  key={sos.id}
                  className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 animate-pulse items-center justify-center rounded-full bg-rose-600 text-white">
                      <Siren className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-xs font-bold text-rose-900">
                          {sos.sender_name || "Community Member"}
                        </p>
                        <span className="text-[10px] text-rose-600 font-semibold">{timeAgo(sos.created_date)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-700 italic">
                        "{sos.message || "Emergency assistance needed"}"
                      </p>
                      {sos.location_label && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3 text-rose-600" />
                          {sos.location_label}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {sos.location_lat && (
                          <Link to="/map">
                            <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold text-rose-700 border-rose-300 hover:bg-rose-100">
                              <Compass className="mr-1 h-3 w-3" /> View Beacon on Map
                            </Button>
                          </Link>
                        )}
                        <a href="tel:911">
                          <Button size="sm" variant="destructive" className="h-7 text-[10px] font-bold bg-rose-700 hover:bg-rose-800">
                            <Phone className="mr-1 h-3 w-3" /> Call 911
                          </Button>
                        </a>
                        {sos.sender_phone && (
                          <a href={`tel:${sos.sender_phone.replace(/[^\d+]/g, '')}`}>
                            <Button size="sm" className="h-7 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white">
                              <Phone className="mr-1 h-3 w-3" /> Call Resident ({sos.sender_phone})
                            </Button>
                          </a>
                        )}
                        {sos.primary_contact_phone && (
                          <a href={`tel:${sos.primary_contact_phone.replace(/[^\d+]/g, '')}`}>
                            <Button size="sm" className="h-7 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                              <Phone className="mr-1 h-3 w-3" /> Call Recipient ({sos.primary_contact_name || "Contact"})
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
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