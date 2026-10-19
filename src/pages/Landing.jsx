// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Siren,
  AlertTriangle,
  Megaphone,
  MapPin,
  Users,
  Bot,
  ChevronRight,
  ArrowRight,
  Heart,
  Building2,
  BookOpen,
  Tent,
  ShieldAlert,
  Backpack,
  HeartHandshake,
  Zap,
  CheckCircle2,
  Star,
  Activity,
  Sparkles,
  Lock,
  PhoneCall,
  Phone,
  Eye,
  Check,
  Waves,
  Wind,
  Menu,
  X,
} from "lucide-react";

/* ─── Cinematic Background Effects & Keyframes ─── */
function CinematicBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      {/* Slow-moving atmospheric gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />

      {/* Animated perspective grid / digital topographic pattern */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floating ambient orbs */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-transparent blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
      <div className="absolute top-[30%] -right-32 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-[130px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
      <div className="absolute -bottom-32 left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent blur-[140px] animate-[pulse_12s_ease-in-out_infinite_4s]" />

      {/* Cinematic diagonal light ray */}
      <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent rotate-12 pointer-events-none" />
    </div>
  );
}

/* ━━━ Uiverse.io Orbit Loader Component ━━━ */
function OrbitLoader() {
  return (
    <div className="loader" aria-label="Loading command center">
      <div className="loader__inner" />
      <div className="loader__orbit">
        <div className="loader__dot" />
        <div className="loader__dot" />
        <div className="loader__dot" />
        <div className="loader__dot" />
      </div>
    </div>
  );
}

/* ─── 6 Core Pillars ─── */
const CORE_PILLARS = [
  {
    icon: Siren,
    title: "Instant Emergency SOS",
    tag: "Life Safety",
    tagColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    desc: "Single-tap distress dispatch with high-precision GPS coordinates, vital medical context, and automated household alerts.",
    color: "from-rose-500 to-red-600",
    glow: "hover:shadow-rose-500/20",
    stats: "< 2.5s Alert Broadcast",
  },
  {
    icon: AlertTriangle,
    title: "Community Hazard Feed",
    tag: "Crowdsourced",
    tagColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    desc: "Real-time street-level flood levels, road blockages, and downed wires. Backed by community confirmation ('I see this too') and DRRMO verification.",
    color: "from-amber-500 to-orange-600",
    glow: "hover:shadow-amber-500/20",
    stats: "Multi-Role Verification",
  },
  {
    icon: Megaphone,
    title: "Official Disaster Advisories",
    tag: "Early Warning",
    tagColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    desc: "Direct integration with LGU and DRRMO incident command. Receive official typhoon storm signals, flood warnings, and evacuation alerts.",
    color: "from-blue-500 to-indigo-600",
    glow: "hover:shadow-blue-500/20",
    stats: "Zero-Latency Push",
  },
  {
    icon: MapPin,
    title: "Live Evacuation & Hazard Map",
    tag: "Geospatial",
    tagColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    desc: "Geospatial navigation to verified evacuation centers with live occupancy meters, hazard perimeter zones, and safe traversal paths.",
    color: "from-emerald-500 to-teal-600",
    glow: "hover:shadow-emerald-500/20",
    stats: "Live Shelter Capacity",
  },
  {
    icon: Bot,
    title: "Disaster AI Co-Pilot",
    tag: "24/7 Intelligence",
    tagColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    desc: "Trained on national disaster protocols (PAGASA, NDRRMC, PHIVOLCS). Provides step-by-step first-aid triage, go-bag checklists, and safety guides.",
    color: "from-purple-500 to-violet-600",
    glow: "hover:shadow-purple-500/20",
    stats: "Conversational & Offline",
  },
  {
    icon: HeartHandshake,
    title: "Volunteer & Relief Hub",
    tag: "Community Action",
    tagColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    desc: "Connects willing volunteers with urgent community needs: relief pack distribution, medical assistance, heavy debris clearance, and post-disaster care.",
    color: "from-pink-500 to-rose-600",
    glow: "hover:shadow-pink-500/20",
    stats: "Transparent Tracking",
  },
];

/* ─── All 18 Modules ─── */
const ALL_MODULES = [
  { icon: Siren, name: "Emergency SOS", cat: "Response" },
  { icon: AlertTriangle, name: "Hazard Reports", cat: "Crowdsourced" },
  { icon: Megaphone, name: "Announcements", cat: "Official" },
  { icon: MapPin, name: "Community Map", cat: "Geospatial" },
  { icon: Bot, name: "AI Assistant", cat: "Intelligence" },
  { icon: Tent, name: "Evacuation Locator", cat: "Shelter" },
  { icon: Backpack, name: "Go-Bag Checklist", cat: "Preparedness" },
  { icon: Users, name: "Household Manager", cat: "Family" },
  { icon: PhoneCall, name: "Emergency Contacts", cat: "Directory" },
  { icon: ShieldAlert, name: "Risk Assessment", cat: "Analytics" },
  { icon: Star, name: "Drill Scheduler", cat: "Preparedness" },
  { icon: BookOpen, name: "Knowledge Hub", cat: "Education" },
  { icon: Building2, name: "Infrastructure Status", cat: "Utilities" },
  { icon: Heart, name: "Recovery Tracker", cat: "Rehabilitation" },
  { icon: HeartHandshake, name: "Volunteer Hub", cat: "Coordination" },
  { icon: Lock, name: "Damage Vault", cat: "Insurance & Claims" },
  { icon: Activity, name: "Moderation Queue", cat: "Governance" },
  { icon: CheckCircle2, name: "Offline Sync", cat: "Resilience" },
];

/* ─── Interactive Workflow Phases ─── */
const WORKFLOW_STEPS = [
  {
    phase: "01. Before Disaster",
    title: "Preparedness & Early Warning",
    desc: "Households register members, track essential go-bag supplies, schedule earthquake/flood drills, and receive NDRRMC-aligned storm warnings.",
    highlights: ["Go-Bag checklist completion", "Household contact sync", "Historical risk assessment"],
    accent: "from-blue-500 to-indigo-600",
  },
  {
    phase: "02. During Event",
    title: "Rapid Response & Situational Awareness",
    desc: "One-click SOS alerts emergency dispatchers. Residents broadcast real-time hazards, while neighbors confirm safety and locate open shelters.",
    highlights: ["GPS SOS broadcast with medical tags", "Crowdsourced hazard verification", "Live shelter capacity counters"],
    accent: "from-rose-500 to-orange-600",
  },
  {
    phase: "03. After Impact",
    title: "Rehabilitation & Community Recovery",
    desc: "Document damaged properties in the encrypted Damage Vault for rapid claims, mobilize volunteer relief packs, and track power/water restoration.",
    highlights: ["Encrypted post-disaster vault", "Volunteer aid & skills matching", "Utility & road repair timelines"],
    accent: "from-emerald-500 to-teal-600",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState(0);
  const [liveConfirmCount, setLiveConfirmCount] = useState(14);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLiveDemoConfirm = (e) => {
    e.preventDefault();
    if (!hasConfirmed) {
      setLiveConfirmCount((prev) => prev + 1);
      setHasConfirmed(true);
    } else {
      setLiveConfirmCount((prev) => prev - 1);
      setHasConfirmed(false);
    }
  };

  const handleGoToDashboard = (e) => {
    if (e) e.preventDefault();
    if (isNavigating) return;
    setIsNavigating(true);
    setTimeout(() => {
      navigate('/login');
    }, 2000);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-100 bg-slate-950 font-sans selection:bg-cyan-500 selection:text-slate-950">
      <CinematicBackground />

      {/* ━━━ Uiverse.io Orbit Loading Transition Overlay (2-second transition) ━━━ */}
      {isNavigating && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/92 backdrop-blur-2xl transition-all duration-300 animate-in fade-in">
          <OrbitLoader />
          <div className="mt-8 text-center space-y-2 px-4 max-w-sm">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
              <span className="text-base sm:text-lg font-bold tracking-wider text-white uppercase drop-shadow-[0_0_15px_rgba(56,189,248,0.6)]">
                Accessing Command Center
              </span>
            </div>
            <p className="text-xs text-cyan-300/80 font-mono tracking-widest uppercase animate-pulse">
              Initializing AEGIS Emergency System...
            </p>
          </div>
        </div>
      )}

      {/* ━━━ Cinematic Navigation Bar ━━━ */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled
            ? "bg-slate-950/80 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-cyan-950/20 border-b border-cyan-500/20 py-3"
            : "bg-transparent py-4 sm:py-5"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/landing" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center p-1.5 border border-cyan-500/40 shadow-[0_0_15px_rgba(56,189,248,0.3)] group-hover:shadow-[0_0_25px_rgba(56,189,248,0.6)] group-hover:scale-105 transition-all duration-300">
                <img
                  src="/logo.png"
                  alt="AEGIS Logo"
                  className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                />
              </div>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 ring-2 ring-emerald-400/40 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent">
                  AEGIS
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 tracking-wide hidden sm:block">
                Cinematic Disaster Command Center
              </p>
            </div>
          </Link>

          {/* Quick Nav Links (Desktop)[cite: 1] */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-full px-4 py-1.5 shadow-lg">
            <a
              href="#features"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-full hover:bg-slate-800 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-full hover:bg-slate-800 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#modules"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-full hover:bg-slate-800 transition-colors"
            >
              All 18 Modules
            </a>
            <a
              href="#hotlines"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-full hover:bg-slate-800 transition-colors"
            >
              Emergency Hotlines
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl hover:bg-slate-900 transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/login"
              onClick={handleGoToDashboard}
              className="group relative inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 px-4 sm:px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 overflow-hidden border border-cyan-400/30"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Zap className="w-4 h-4 text-cyan-300" />
              <span>Go to Dashboard</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full inset-x-0 bg-slate-950/95 backdrop-blur-2xl border-b border-slate-800 p-6 shadow-2xl flex flex-col gap-4 animate-[fadeIn_0.2s_ease-in-out]">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-300 hover:text-cyan-400"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-300 hover:text-cyan-400"
            >
              How It Works
            </a>
            <a
              href="#modules"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-300 hover:text-cyan-400"
            >
              All 18 Modules
            </a>
            <a
              href="#hotlines"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-semibold text-slate-300 hover:text-cyan-400"
            >
              Emergency Hotlines
            </a>
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-3">
              <Link
                to="/login"
                className="w-full text-center py-3 rounded-xl bg-slate-900 text-slate-200 font-bold text-sm border border-slate-800"
              >
                Log In
              </Link>
              <Link
                to="/login"
                onClick={handleGoToDashboard}
                className="w-full text-center py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/30"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ━━━ Cinematic Hero Section ━━━ */}
      <section className="relative z-10 pt-32 sm:pt-40 lg:pt-44 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Top Pill Alert */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(56,189,248,0.15)] hover:scale-[1.02] transition-transform">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <span className="text-xs font-bold text-cyan-300">
                ACTIVE CIVIL DEFENSE NETWORK
              </span>
              <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                · NDRRMC, PAGASA, & Local DRRMO Synced
              </span>
            </div>
          </div>

          {/* Main Hero Header */}
          <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-14">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.08] mb-6 drop-shadow-md">
              When Seconds Count,{" "}
              <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(56,189,248,0.4)]">
                Your Community&apos;s Shield
              </span>{" "}
              Stands Ready.
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              AEGIS unifies real-time <strong className="text-cyan-300">Emergency SOS</strong>, crowdsourced{" "}
              <strong className="text-cyan-300">Hazard Intelligence</strong>, dynamic <strong className="text-cyan-300">Evacuation Routing</strong>,
              and <strong className="text-cyan-300">AI-Powered Preparedness</strong> into a cinematic command center.
            </p>

            {/* Main Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-8">
              <Link
                to="/login"
                onClick={handleGoToDashboard}
                className="w-full sm:w-auto group relative inline-flex items-center justify-center gap-2.5 text-base font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 border border-cyan-400/30 overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Zap className="w-5 h-5 text-cyan-300" />
                <span>Go to Dashboard / Get Started</span>
                <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>

              <a
                href="#features"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold text-slate-200 hover:text-white px-7 py-4 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-lg hover:bg-slate-900 hover:border-cyan-500/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                <Eye className="w-5 h-5 text-cyan-400" />
                <span>Explore Live Modules</span>
              </a>
            </div>

            {/* Trust Points */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                100% Free for all residents
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                1-Click Demo Evaluation Login
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                Offline Emergency Guides
              </span>
            </div>
          </div>

          {/* ━━━ Cinematic Dashboard Preview (Command Center Mockup) ━━━ */}
          <div className="max-w-5xl mx-auto">
            <div className="rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-cyan-500/20 via-slate-900/80 to-slate-950 backdrop-blur-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-950/50">
              <div className="rounded-2xl bg-slate-950 text-white overflow-hidden border border-slate-800 shadow-inner">
                {/* Mockup Titlebar */}
                <div className="bg-slate-900/90 px-4 py-3 flex items-center justify-between border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 font-mono text-cyan-400 text-[11px] hidden sm:inline">
                      aegis-command-center.live/active-incident
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>COMMAND CENTER ONLINE · 18 MODULES ACTIVE</span>
                  </div>
                </div>

                {/* Mockup Content Grid */}
                <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                  {/* Card 1: Verified Advisory[cite: 1] */}
                  <div className="rounded-2xl p-4 bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          🚨 Verified Advisory
                        </span>
                        <span className="text-[10px] text-slate-400">2m ago</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                        <Wind className="w-4 h-4 text-cyan-400" />
                        Typhoon Signal No. 3
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Heavy to torrential rains expected over low-lying barangays. Riverbanks monitored.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Source: City DRRMO</span>
                      <span className="text-cyan-400 font-medium">94 acknowledged</span>
                    </div>
                  </div>

                  {/* Card 2: Interactive Crowdsourced Hazard[cite: 1] */}
                  <div className="rounded-2xl p-4 bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ⚠️ Live Hazard
                        </span>
                        <span className="text-[10px] text-slate-400">Barangay Central</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                        <Waves className="w-4 h-4 text-amber-400" />
                        Knee-Deep Flooding · Taft Ave
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Impassable for light vehicles. DPWH and responders deployed pump operations.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={handleLiveDemoConfirm}
                        className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${hasConfirmed
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                          }`}
                        title="Click to try live confirmation"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>I see this too ({liveConfirmCount})</span>
                      </button>
                      <span className="text-[10px] text-cyan-400/80 italic">Interactive Demo!</span>
                    </div>
                  </div>

                  {/* Card 3: Evacuation Shelter Status[cite: 1] */}
                  <div className="rounded-2xl p-4 bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/40 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Tent Shelter Status
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">OPEN</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
                        <Tent className="w-4 h-4 text-emerald-400" />
                        City Central High Gymnasium
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Medical station active. Clean water, hot meals, and power generators available.
                      </p>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Capacity</span>
                        <span className="text-emerald-400 font-bold">142 / 200 Cots (71%)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-700">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full w-[71%]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mockup Bottom Stats Bar */}
                <div className="bg-slate-950 px-4 sm:px-6 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-6 text-slate-400">
                    <div>
                      <strong className="text-white font-bold">&lt; 3.0s</strong> Emergency SOS Dispatch
                    </div>
                    <div className="hidden sm:block">
                      <strong className="text-white font-bold">18</strong> Integrated Safety Modules
                    </div>
                    <div className="hidden md:block">
                      <strong className="text-white font-bold">100%</strong> Public Feed Verification
                    </div>
                  </div>
                  <Link
                    to="/login"
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group"
                  >
                    <span>Launch Live Command Center</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ Key Metrics Strip ━━━ */}
      <section className="relative z-10 py-8 px-4 sm:px-6 lg:px-8 border-y border-slate-800/80 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              &lt; 3s
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
              SOS Broadcast Latency
            </p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              18+
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
              Safety & Relief Modules
            </p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              24/7
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
              AI Preparedness Co-Pilot
            </p>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent">
              100%
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
              Community & Role Isolation
            </p>
          </div>
        </div>
      </section>

      {/* ━━━ Core Pillars (Features Grid)[cite: 1] ━━━ */}
      <section id="features" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Engineered For Crisis Response
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
              Comprehensive Protection for Every Resident & Responder
            </h2>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              AEGIS is architected with multi-role enforcement, instant crowdsourcing,
              and military-grade reliability to protect lives across any disaster scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {CORE_PILLARS.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className={`group relative rounded-3xl p-7 bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-xl hover:border-cyan-500/50 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between ${pillar.glow}`}
                >
                  <div>
                    {/* Icon and Tag */}
                    <div className="flex items-center justify-between mb-6">
                      <div
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pillar.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        <Icon className="w-7 h-7 text-white stroke-[2.2]" />
                      </div>
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full border ${pillar.tagColor}`}
                      >
                        {pillar.tag}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2.5 group-hover:text-cyan-300 transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed mb-6">
                      {pillar.desc}
                    </p>
                  </div>

                  {/* Bottom Stats */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan-400/90">
                      {pillar.stats}
                    </span>
                    <Link
                      to="/login"
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                    >
                      <span>Explore</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━━ How It Works (Scenario Workflow)[cite: 1] ━━━ */}
      <section id="how-it-works" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white rounded-3xl mx-4 sm:mx-6 lg:mx-8 shadow-2xl border border-slate-800 overflow-hidden">
        {/* Ambient Dark Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Disaster Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-4 mb-3">
              How AEGIS Protects Communities
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              End-to-end civil defense capabilities across every critical phase of disaster risk reduction.
            </p>
          </div>

          {/* Phase Tabs */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10">
            {WORKFLOW_STEPS.map((step, idx) => (
              <button
                key={step.phase}
                onClick={() => setActiveWorkflow(idx)}
                className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 border ${activeWorkflow === idx
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-cyan-400/40 shadow-lg shadow-cyan-500/30 scale-105"
                    : "bg-slate-950/80 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700"
                  }`}
              >
                {step.phase}
              </button>
            ))}
          </div>

          {/* Active Phase Card */}
          <div className="rounded-3xl p-6 sm:p-10 bg-slate-950/70 border border-slate-800 backdrop-blur-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  {WORKFLOW_STEPS[activeWorkflow].phase}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 mb-4">
                  {WORKFLOW_STEPS[activeWorkflow].title}
                </h3>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
                  {WORKFLOW_STEPS[activeWorkflow].desc}
                </p>

                <div className="space-y-3">
                  {WORKFLOW_STEPS[activeWorkflow].highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-slate-200">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call to action inside phase */}
              <div className="rounded-2xl p-6 bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-white mb-2">
                    Experience This Phase in AEGIS
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Log in as a Resident, Emergency Responder, or LGU Administrator to test role-specific emergency workflows.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 transition-all border border-cyan-400/30"
                >
                  <span>Access in Dashboard (Sign In / Demo)</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ All 18 Modules Showcase[cite: 1] ━━━ */}
      <section id="modules" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3 inline-block">
              Full Spectrum Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              18 Integrated Safety & Response Modules
            </h2>
            <p className="text-base text-slate-300">
              Every tool an entire municipality, barangay, school, and household needs during high-stress crises.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {ALL_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.name}
                  to="/login"
                  className="group rounded-2xl p-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-md hover:shadow-xl hover:-translate-y-1 hover:border-cyan-500/40 hover:bg-slate-900 transition-all duration-200 flex flex-col items-center text-center"
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-800 group-hover:bg-cyan-500/20 text-slate-300 group-hover:text-cyan-300 flex items-center justify-center mb-3 transition-colors border border-slate-700">
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1">
                    {mod.name}
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {mod.cat}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ━━━ Hotlines Quick Reference Strip[cite: 1] ━━━ */}
      <section id="hotlines" className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 bg-slate-900/70 backdrop-blur-xl border-y border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <PhoneCall className="w-4 h-4 text-rose-400" />
                <h3 className="text-base font-bold text-white">
                  National Emergency Hotlines Integrated
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Quick-dial directly from the AEGIS Contacts directory during emergencies.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {[
                { name: "Emergency Dispatch", number: "911" },
                { name: "NDRRMC Operations", number: "(02) 8911-5061" },
                { name: "Philippine Red Cross", number: "143" },
                { name: "Bureau of Fire Protection", number: "160" },
              ].map((hotline) => (
                <a
                  key={hotline.name}
                  href={`tel:${hotline.number.replace(/[^\d+]/g, '')}`}
                  className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 shadow-sm flex items-center gap-2 transition-all group active:scale-95"
                  title={`Directly call ${hotline.name} (${hotline.number})`}
                >
                  <Phone className="h-3 w-3 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white">{hotline.name}:</span>
                  <strong className="text-xs font-bold text-cyan-400 font-mono group-hover:underline">{hotline.number}</strong>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ Final High-Impact CTA Banner[cite: 1] ━━━ */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl p-8 sm:p-14 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white shadow-2xl shadow-cyan-950/40 border border-cyan-500/30 overflow-hidden text-center">
            {/* Ambient Corner Lighting */}
            <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center mx-auto mb-6 p-2 shadow-[0_0_24px_rgba(56,189,248,0.3)]">
                <img src="/logo.png" alt="AEGIS Logo" className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                Be Prepared Today. <br />
                Stay Protected Tomorrow.
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8">
                Join our growing network of resilient barangays, first responders,
                and households. Create an account or explore with our instant demo credentials.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Link
                  to="/login"
                  onClick={handleGoToDashboard}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 font-bold text-base shadow-xl shadow-cyan-500/30 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200 border border-cyan-400/40"
                >
                  <Zap className="w-5 h-5 text-cyan-300" />
                  <span>Go to Dashboard (Sign In)</span>
                </Link>

                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-slate-200 font-semibold text-base transition-colors"
                >
                  <span>Create Resident Account</span>
                </Link>
              </div>

              <p className="text-[11px] text-slate-400 mt-6">
                No credit card needed · Instant 1-click evaluation access · Free community platform
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ Footer[cite: 1] ━━━ */}
      <footer className="relative z-10 py-10 px-4 sm:px-6 lg:px-8 border-t border-slate-800 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center p-1 border border-cyan-500/30">
              <img src="/logo.png" alt="AEGIS Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-white text-sm">AEGIS</span>
            <span>· Earthquake Guidance & Incident System</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-cyan-400 transition-colors">
              Log In
            </Link>
            <Link to="/register" className="hover:text-cyan-400 transition-colors">
              Register
            </Link>
            <a href="#features" className="hover:text-cyan-400 transition-colors">
              Features
            </a>
            <a href="#hotlines" className="hover:text-cyan-400 transition-colors">
              Emergency Directory
            </a>
          </div>

          <p>© {new Date().getFullYear()} AEGIS Civil Defense. Open Community Edition.</p>
        </div>
      </footer>
    </div>
  );
}