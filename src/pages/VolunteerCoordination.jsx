import React, { useState, useEffect, useMemo, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Heart,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Plus,
  AlertTriangle,
  Calendar,
  Sparkles,
  Filter,
  Search,
  Check,
  ChevronRight,
  Eye,
  MessageSquare,
  Truck,
  Stethoscope,
  Briefcase,
  Trash2,
  Edit2,
  User,
  HandHeart,
  HelpingHand,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import ReactionButtons from "@/components/interactions/ReactionButtons";
import CommentSection from "@/components/interactions/CommentSection";
import {
  getBatchCommentCounts,
  getBatchReactionSummaries,
  TARGET_TYPES,
} from "@/lib/interactions";

// Default volunteer opportunities and offers for Tupi & South Cotabato
const INITIAL_MISSIONS = [
  {
    id: "mis-1",
    postType: "need", // "need" or "offer"
    title: "Relief Goods Packing & Distribution",
    organization: "MDRRMO Tupi & MSWDO",
    category: "Relief & Logistics",
    urgency: "High",
    location: "Tupi Municipal Gymnasium, Poblacion",
    date: "Today & Tomorrow",
    time: "8:00 AM - 5:00 PM",
    needed: 30,
    registered: 22,
    skillsNeeded: ["Packing", "Inventory", "Lifting"],
    description:
      "Sorting and repacking rice, canned goods, potable water, and hygiene kits for 1,200 displaced families across South Cotabato.",
    coordinator: "MDRRMO Officer Alcantara",
    contact: "(083) 228-3095",
    created_by_id: "seed_drrmo_1",
    created_by_name: "MDRRMO Officer Alcantara",
    created_by_role: "drrmo",
    created_date: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: "mis-2",
    postType: "need",
    title: "Community First Aid & Health Triage Support",
    organization: "Philippine Red Cross - South Cotabato Chapter",
    category: "Medical & Health",
    urgency: "Critical",
    location: "Roel I. Senador Memorial Hospital Grounds",
    date: "Continuous 24/7 Shifts",
    time: "Morning / Night Shifts",
    needed: 15,
    registered: 9,
    skillsNeeded: ["First Aid", "CPR", "Nursing / EMT", "Triage"],
    description:
      "Assisting doctors and nurses in attending to minor lacerations, blood pressure monitoring, and psychological first aid for anxious residents.",
    coordinator: "Dr. Grace Mendoza",
    contact: "(083) 228-3200",
    created_by_id: "seed_drrmo_2",
    created_by_name: "Dr. Grace Mendoza",
    created_by_role: "responder",
    created_date: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "mis-3",
    postType: "offer",
    title: "4x4 Pickup Truck Available for Relief Cargo Transport",
    organization: "Tupi 4x4 Off-Road Volunteer Group",
    category: "Transport & Logistics",
    urgency: "Normal",
    location: "Barangay Acmonan / Poblacion Corridor",
    date: "Available Daily on Call",
    time: "Flexible Hours",
    needed: 1,
    registered: 1,
    skillsNeeded: ["Heavy Transport", "Off-Road Driver", "Cargo Hauling"],
    description:
      "Offering high-clearance 4WD Hilux with winch and cargo bed to haul water tanks, relief boxes, or rescue gear across rough detour roads.",
    coordinator: "Ramon Valenzuela (Volunteer Driver)",
    contact: "0918-552-4019",
    created_by_id: "seed_vol_1",
    created_by_name: "Ramon Valenzuela",
    created_by_role: "volunteer",
    created_date: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "mis-4",
    postType: "offer",
    title: "Registered Nurse Offering Emergency Wound Care & Triage",
    organization: "Independent Volunteer Health Responder",
    category: "Medical & Health",
    urgency: "High",
    location: "Central Elementary Evacuation Shelter",
    date: "Daily Evenings",
    time: "4:00 PM - 9:00 PM",
    needed: 1,
    registered: 1,
    skillsNeeded: ["Nursing Care", "Wound Dressing", "Pediatric Checkup"],
    description:
      "Licensed nurse with personal emergency medical kit offering free triage, vitals checking, and wound dressing for evacuee children and seniors.",
    coordinator: "Kristine Joy Santos, RN",
    contact: "0927-410-8832",
    created_by_id: "seed_vol_2",
    created_by_name: "Kristine Joy Santos, RN",
    created_by_role: "volunteer",
    created_date: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "mis-5",
    postType: "need",
    title: "Debris Clearing & Pathway Access Marshals",
    organization: "Barangay Crossing Rubber DRRM Council",
    category: "Search & Clearing",
    urgency: "High",
    location: "Crossing Rubber Inner Barangay Road",
    date: "Tomorrow Morning",
    time: "6:00 AM - 12:00 PM",
    needed: 20,
    registered: 14,
    skillsNeeded: ["Chainsaw Op", "Heavy Labor", "Safety Gear"],
    description:
      "Clearing fallen tree branches and masonry rubble along municipal access road to ensure ambulance and relief truck passage.",
    coordinator: "Captain Rodrigo Santos",
    contact: "0917-882-9411",
    created_by_id: "seed_resident_1",
    created_by_name: "Captain Rodrigo Santos",
    created_by_role: "lgu",
    created_date: new Date(Date.now() - 3600000 * 16).toISOString(),
  },
];

const SKILL_OPTIONS = [
  "First Aid / CPR",
  "Medical / Nursing",
  "Search & Rescue",
  "Relief Packing & Sorting",
  "Heavy Lifting & Clearing",
  "Driver / Vehicle Transport",
  "Psychological First Aid",
  "Drone Pilot / Mapping",
  "Cooking & Community Kitchen",
  "Teaching / Child Care",
];

const ROLE_BADGES = {
  admin: { label: "Admin", class: "bg-rose-100 text-rose-800 ring-rose-300" },
  drrmo: { label: "DRRMO", class: "bg-blue-100 text-blue-800 ring-blue-300 font-semibold" },
  lgu: { label: "LGU Official", class: "bg-indigo-100 text-indigo-800 ring-indigo-300 font-semibold" },
  responder: { label: "Responder", class: "bg-amber-100 text-amber-800 ring-amber-300" },
  volunteer: { label: "Volunteer", class: "bg-purple-100 text-purple-800 ring-purple-300 font-semibold" },
  resident: { label: "Resident", class: "bg-slate-100 text-slate-700 ring-slate-200" },
};

const STORAGE_KEY = "aegis_volunteer_missions";

export default function VolunteerCoordination() {
  const { user } = useAuth();

  const [missions, setMissions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_MISSIONS;
    } catch {
      return INITIAL_MISSIONS;
    }
  });

  // User's joined missions
  const [joinedMissions, setJoinedMissions] = useState(() => {
    try {
      const saved = localStorage.getItem("aegis_user_joined_missions");
      return saved ? JSON.parse(saved) : ["mis-1"];
    } catch {
      return ["mis-1"];
    }
  });

  // User volunteer profile skills
  const [userSkills, setUserSkills] = useState(() => {
    try {
      const saved = localStorage.getItem("aegis_volunteer_skills");
      return saved ? JSON.parse(saved) : ["First Aid / CPR", "Relief Packing & Sorting"];
    } catch {
      return ["First Aid / CPR", "Relief Packing & Sorting"];
    }
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [postTypeFilter, setPostTypeFilter] = useState("all"); // "all", "need", "offer"
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [selectedMission, setSelectedMission] = useState(null);
  const [isAddMissionOpen, setIsAddMissionOpen] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

  // Batch interactions
  const [commentCounts, setCommentCounts] = useState({});
  const [reactionSummaries, setReactionSummaries] = useState({});

  const saveMissions = useCallback((newMissions) => {
    setMissions(newMissions);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMissions));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("aegis_user_joined_missions", JSON.stringify(joinedMissions));
    } catch (e) {
      console.error(e);
    }
  }, [joinedMissions]);

  useEffect(() => {
    try {
      localStorage.setItem("aegis_volunteer_skills", JSON.stringify(userSkills));
    } catch (e) {
      console.error(e);
    }
  }, [userSkills]);

  // Load batch counts
  const loadInteractions = useCallback(async () => {
    if (missions.length === 0) return;
    const ids = missions.map((m) => m.id);
    try {
      const [cCounts, rSummaries] = await Promise.all([
        getBatchCommentCounts({
          targetType: TARGET_TYPES.VOLUNTEER_POST,
          targetIds: ids,
        }),
        getBatchReactionSummaries({
          targetType: TARGET_TYPES.VOLUNTEER_POST,
          targetIds: ids,
          currentUserId: user?.id,
        }),
      ]);
      setCommentCounts(cCounts || {});
      setReactionSummaries(rSummaries || {});
    } catch (e) {
      console.error("Failed to load volunteer interactions:", e);
    }
  }, [missions, user?.id]);

  useEffect(() => {
    loadInteractions();
  }, [loadInteractions]);

  // Join/Enlist Action
  const handleToggleJoin = (missionId) => {
    if (joinedMissions.includes(missionId)) {
      setJoinedMissions(joinedMissions.filter((id) => id !== missionId));
      const updated = missions.map((m) =>
        m.id === missionId ? { ...m, registered: Math.max(0, m.registered - 1) } : m
      );
      saveMissions(updated);
      if (selectedMission?.id === missionId) {
        setSelectedMission(updated.find((m) => m.id === missionId));
      }
    } else {
      setJoinedMissions([...joinedMissions, missionId]);
      const updated = missions.map((m) =>
        m.id === missionId ? { ...m, registered: m.registered + 1 } : m
      );
      saveMissions(updated);
      if (selectedMission?.id === missionId) {
        setSelectedMission(updated.find((m) => m.id === missionId));
      }
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    postType: "need", // "need" or "offer"
    title: "",
    organization: "",
    category: "Relief & Logistics",
    urgency: "High",
    location: "",
    date: "Tomorrow",
    time: "8:00 AM - 12:00 PM",
    needed: 10,
    skillsNeededText: "General Volunteer",
    description: "",
    coordinator: "",
    contact: "",
  });

  const handleOpenCreate = () => {
    setEditingMission(null);
    setFormData({
      postType: "need",
      title: "",
      organization: user?.role === "volunteer" ? "Volunteer Initiative" : "Community Response Unit",
      category: "Relief & Logistics",
      urgency: "High",
      location: "",
      date: "Tomorrow",
      time: "8:00 AM - 12:00 PM",
      needed: 10,
      skillsNeededText: "General Volunteer",
      description: "",
      coordinator: user?.name || user?.email?.split("@")[0] || "Community Coordinator",
      contact: "",
    });
    setIsAddMissionOpen(true);
  };

  const handleOpenEdit = (mission, e) => {
    if (e) e.stopPropagation();
    setEditingMission(mission);
    setFormData({
      postType: mission.postType || "need",
      title: mission.title,
      organization: mission.organization,
      category: mission.category,
      urgency: mission.urgency,
      location: mission.location,
      date: mission.date,
      time: mission.time,
      needed: mission.needed || 1,
      skillsNeededText: (mission.skillsNeeded || []).join(", "),
      description: mission.description,
      coordinator: mission.coordinator,
      contact: mission.contact,
    });
    setIsAddMissionOpen(true);
  };

  const handleSavePost = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const skillsArray = formData.skillsNeededText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingMission) {
      // Edit
      const updated = missions.map((m) =>
        m.id === editingMission.id
          ? {
              ...m,
              postType: formData.postType,
              title: formData.title,
              organization: formData.organization,
              category: formData.category,
              urgency: formData.urgency,
              location: formData.location || "Poblacion, Tupi",
              date: formData.date,
              time: formData.time,
              needed: parseInt(formData.needed) || 1,
              skillsNeeded: skillsArray.length > 0 ? skillsArray : ["General Volunteer"],
              description: formData.description,
              coordinator: formData.coordinator,
              contact: formData.contact,
            }
          : m
      );
      saveMissions(updated);
      if (selectedMission?.id === editingMission.id) {
        setSelectedMission(updated.find((m) => m.id === editingMission.id));
      }
    } else {
      // Create new
      const newPost = {
        id: "mis-" + Date.now(),
        postType: formData.postType,
        title: formData.title,
        organization: formData.organization || (formData.postType === "offer" ? "Independent Volunteer" : "Community Volunteer Task"),
        category: formData.category,
        urgency: formData.urgency,
        location: formData.location || "Poblacion, Tupi",
        date: formData.date,
        time: formData.time,
        needed: parseInt(formData.needed) || 1,
        registered: formData.postType === "offer" ? 1 : 0,
        skillsNeeded: skillsArray.length > 0 ? skillsArray : ["General Volunteer"],
        description: formData.description,
        coordinator: formData.coordinator,
        contact: formData.contact || "Reach via discussion below",
        created_by_id: user?.id || "anon",
        created_by_name: user?.name || user?.email?.split("@")[0] || "Community Member",
        created_by_role: user?.role || "volunteer",
        created_date: new Date().toISOString(),
      };
      saveMissions([newPost, ...missions]);
    }

    setIsAddMissionOpen(false);
  };

  const handleDeletePost = (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this volunteer post?")) return;
    const filtered = missions.filter((m) => m.id !== id);
    saveMissions(filtered);
    if (selectedMission?.id === id) setSelectedMission(null);
  };

  const handleToggleSkill = (skill) => {
    if (userSkills.includes(skill)) {
      setUserSkills(userSkills.filter((s) => s !== skill));
    } else {
      setUserSkills([...userSkills, skill]);
    }
  };

  // Filtered missions
  const filteredMissions = useMemo(() => {
    return missions.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        m.title.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (m.created_by_name || "").toLowerCase().includes(q);

      const matchesType = postTypeFilter === "all" || (m.postType || "need") === postTypeFilter;
      const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [missions, searchQuery, postTypeFilter, categoryFilter]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        title="Volunteer Coordination Hub"
        description="Shared community network: Volunteers post resource offers and mission drives. Residents and emergency managers connect and respond."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSkillsModalOpen(true)}
              className="text-xs flex items-center gap-1.5 bg-white/70"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              My Skills ({userSkills.length})
            </Button>
            <Button
              onClick={handleOpenCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 text-xs"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Post Volunteer Need or Offer
            </Button>
          </div>
        }
      />

      {/* Volunteer Profile Banner */}
      <div className="p-5 rounded-2xl bg-white/60 border border-white/60 backdrop-blur-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shrink-0">
            <Heart className="w-6 h-6 fill-emerald-500/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {user?.name || user?.email?.split("@")[0] || "Community Volunteer"}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                {user?.role ? user.role.toUpperCase() : "VOLUNTEER"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enlisted in <strong>{joinedMissions.length}</strong> community operation{joinedMissions.length === 1 ? "" : "s"} • {userSkills.length} registered emergency skills
            </p>
          </div>
        </div>

        {/* Quick summary metrics */}
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="text-center px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
            <span className="block font-bold text-amber-800 text-sm">
              {missions.filter((m) => (m.postType || "need") === "need").length}
            </span>
            <span className="text-[10px] text-amber-700">Needs Active</span>
          </div>
          <div className="text-center px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="block font-bold text-emerald-800 text-sm">
              {missions.filter((m) => m.postType === "offer").length}
            </span>
            <span className="text-[10px] text-emerald-700">Offers Available</span>
          </div>
        </div>
      </div>

      {/* Control Filters & Search Bar */}
      <div className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="relative sm:col-span-6">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search relief missions, volunteer offers, vehicle hauling, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-white/80 border-slate-200"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={postTypeFilter}
              onChange={(e) => setPostTypeFilter(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-700"
            >
              <option value="all">All Post Types (Needs & Offers)</option>
              <option value="need">🆘 Volunteer Needs (Requests)</option>
              <option value="offer">🤝 Volunteer Offers (Skills/Assets)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-700"
            >
              <option value="all">All Categories</option>
              <option value="Relief & Logistics">Relief & Packing</option>
              <option value="Medical & Health">Medical & Health</option>
              <option value="Search & Clearing">Debris Clearing</option>
              <option value="Transport & Logistics">Transport & Logistics</option>
              <option value="Community Welfare">Community Care</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/50">
          <span>{filteredMissions.length} volunteer posts available in the shared network.</span>
          <span className="text-emerald-700 font-medium">Click any post to enlist, react, or respond in discussion.</span>
        </div>
      </div>

      {/* Volunteer Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMissions.map((mission) => {
          const isOffer = mission.postType === "offer";
          const isJoined = joinedMissions.includes(mission.id);
          const percentFilled = Math.min(100, Math.round(((mission.registered || 1) / (mission.needed || 1)) * 100));
          const isOwner = user && String(user.id) === String(mission.created_by_id);
          const roleBadge = ROLE_BADGES[mission.created_by_role] || ROLE_BADGES.volunteer;
          const cCount = commentCounts[mission.id] || 0;

          return (
            <div
              key={mission.id}
              onClick={() => setSelectedMission(mission)}
              className={`group cursor-pointer rounded-2xl border p-5 backdrop-blur-xl transition-all hover:shadow-lg flex flex-col justify-between ${
                isOffer
                  ? "border-emerald-300/80 bg-gradient-to-br from-emerald-50/50 via-white/70 to-teal-50/40 shadow-sm ring-1 ring-emerald-400/20"
                  : "border-white/50 bg-white/60 shadow-[4px_4px_16px_rgba(0,0,0,0.04),-4px_-4px_12px_rgba(255,255,255,0.9)]"
              }`}
            >
              <div className="space-y-3">
                {/* Header Tag Bar */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Need vs Offer Badge */}
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ring-1 ${
                        isOffer
                          ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
                          : "bg-amber-100 text-amber-800 ring-amber-300"
                      }`}
                    >
                      {isOffer ? <HandHeart className="w-3 h-3" /> : <HelpingHand className="w-3 h-3" />}
                      {isOffer ? "Volunteer Offer" : "Volunteer Need"}
                    </span>

                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      {mission.category}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border shrink-0 ${
                      mission.urgency === "Critical"
                        ? "bg-rose-50 text-rose-700 border-rose-300"
                        : "bg-amber-50 text-amber-700 border-amber-300"
                    }`}
                  >
                    {mission.urgency} Priority
                  </span>
                </div>

                {/* Title */}
                <h4 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                  {mission.title}
                </h4>

                {/* Author Identity & Organization */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span className="text-slate-600 font-medium">By {mission.created_by_name || mission.coordinator}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-semibold uppercase ring-1 ${roleBadge.class}`}
                  >
                    {roleBadge.label}
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[180px]">{mission.organization}</span>
                </div>

                {/* Description snippet */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {mission.description}
                </p>

                {/* Venue & Time info */}
                <div className="space-y-1 p-2.5 rounded-xl bg-white/70 border border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{mission.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{mission.date} • {mission.time}</span>
                  </div>
                </div>

                {/* Capacity progress for needs */}
                {!isOffer && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">Enlisted Volunteers:</span>
                      <span className="font-semibold text-slate-900">
                        {mission.registered} / {mission.needed} ({percentFilled}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentFilled >= 100 ? "bg-emerald-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom interactions & Join bar */}
              <div
                className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ReactionButtons
                    targetType={TARGET_TYPES.VOLUNTEER_POST}
                    targetId={mission.id}
                    currentUserId={user?.id}
                    initialSummary={reactionSummaries[mission.id]}
                    compact={true}
                  />

                  <button
                    type="button"
                    onClick={() => setSelectedMission(mission)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{cCount} {cCount === 1 ? "response" : "responses"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  {(isOwner || user?.role === "admin") && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900"
                        onClick={(e) => handleOpenEdit(mission, e)}
                        title="Edit post"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        onClick={(e) => handleDeletePost(mission.id, e)}
                        title="Delete post"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}

                  {!isOffer ? (
                    <Button
                      size="sm"
                      onClick={() => handleToggleJoin(mission.id)}
                      className={`text-xs h-7 px-3 font-medium transition-all ${
                        isJoined
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      {isJoined ? (
                        <>
                          <Check className="w-3 h-3 mr-1 text-emerald-600" /> Enlisted
                        </>
                      ) : (
                        <>
                          <Heart className="w-3 h-3 mr-1" /> Join Mission
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedMission(mission)}
                      className="text-xs h-7 px-2.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Eye className="w-3 h-3 mr-1" /> Respond
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* MISSION / OFFER DETAILS & COMMUNITY DISCUSSION MODAL              */}
      {/* ================================================================= */}
      {selectedMission && (
        <Dialog open={!!selectedMission} onOpenChange={() => setSelectedMission(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="border-b pb-3 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ring-1 ${
                      selectedMission.postType === "offer"
                        ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
                        : "bg-amber-100 text-amber-800 ring-amber-300"
                    }`}
                  >
                    {selectedMission.postType === "offer" ? "Volunteer Offer" : "Volunteer Need"}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {selectedMission.category}
                  </span>
                </div>

                <DialogTitle className="text-xl font-bold text-slate-900">
                  {selectedMission.title}
                </DialogTitle>
                <DialogDescription>
                  Organized by: {selectedMission.organization}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <p className="text-slate-700 leading-relaxed bg-white/70 p-3.5 rounded-xl border border-slate-200/60 whitespace-pre-wrap">
                {selectedMission.description}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" /> Staging Venue:
                  </span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedMission.location}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Schedule:
                  </span>
                  <p className="font-medium text-slate-800 mt-0.5">
                    {selectedMission.date} ({selectedMission.time})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Coordinator:
                  </span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedMission.coordinator}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-blue-600" /> Direct Contact:
                  </span>
                  {selectedMission.contact ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href={`tel:${selectedMission.contact.replace(/[^\d+]/g, '')}`}
                        className="font-medium text-blue-700 hover:underline font-mono"
                        title="Click to call coordinator"
                      >
                        {selectedMission.contact}
                      </a>
                      <a
                        href={`tel:${selectedMission.contact.replace(/[^\d+]/g, '')}`}
                        className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold shadow-xs transition-all active:scale-95"
                      >
                        <Phone className="w-2.5 h-2.5" /> Call
                      </a>
                    </div>
                  ) : (
                    <p className="text-slate-400 mt-0.5">No phone provided</p>
                  )}
                </div>
              </div>

              {selectedMission.skillsNeeded && selectedMission.skillsNeeded.length > 0 && (
                <div>
                  <h5 className="font-semibold text-slate-700 mb-1.5">Relevant Skills or Capabilities:</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMission.skillsNeeded.map((s, idx) => (
                      <span
                        key={idx}
                        className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-emerald-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Reactions Bar */}
              <ReactionButtons
                targetType={TARGET_TYPES.VOLUNTEER_POST}
                targetId={selectedMission.id}
                currentUserId={user?.id}
                compact={false}
              />

              {/* Embedded Community Responses & Discussion */}
              <CommentSection
                targetType={TARGET_TYPES.VOLUNTEER_POST}
                targetId={selectedMission.id}
                currentUser={user}
                onCommentCountChange={(count) => {
                  setCommentCounts((prev) => ({ ...prev, [selectedMission.id]: count }));
                }}
              />
            </div>

            <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => setSelectedMission(null)}>
                Close
              </Button>

              {selectedMission.postType !== "offer" && (
                <Button
                  size="sm"
                  onClick={() => handleToggleJoin(selectedMission.id)}
                  className={
                    joinedMissions.includes(selectedMission.id)
                      ? "bg-slate-200 text-slate-800 hover:bg-slate-300"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }
                >
                  {joinedMissions.includes(selectedMission.id) ? "Leave Mission" : "Enlist as Volunteer"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ================================================================= */}
      {/* POST VOLUNTEER NEED OR OFFER DIALOG                               */}
      {/* ================================================================= */}
      <Dialog open={isAddMissionOpen} onOpenChange={setIsAddMissionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <HelpingHand className="w-5 h-5 text-emerald-600" />
              {editingMission ? "Edit Volunteer Post" : "Post Volunteer Need or Resource Offer"}
            </DialogTitle>
            <DialogDescription>
              Broadcast a relief volunteer drive, or offer your personal skills, tools, or vehicles to assist the community.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePost} className="space-y-3 py-2 text-xs">
            {/* Post Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, postType: "need" })}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  formData.postType === "need"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🆘 Volunteer Need (Drive)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, postType: "offer" })}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  formData.postType === "offer"
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🤝 Resource Offer (Skills/Asset)
              </button>
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">
                {formData.postType === "offer" ? "Offer Title / Capability *" : "Mission / Need Title *"}
              </label>
              <Input
                required
                placeholder={
                  formData.postType === "offer"
                    ? "e.g. 4x4 Truck Available for Relief Hauling or Nurse On Call"
                    : "e.g. Relief Pack Sorting or Debris Clearing Crew"
                }
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                >
                  <option value="Relief & Logistics">Relief & Packing</option>
                  <option value="Medical & Health">Medical & Health</option>
                  <option value="Search & Clearing">Debris Clearing</option>
                  <option value="Transport & Logistics">Transport & Logistics</option>
                  <option value="Community Welfare">Community Care</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Priority</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Organization or Group</label>
              <Input
                placeholder="e.g. Independent Volunteer, Brgy. Youth Council, Red Cross"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Location or Service Area</label>
              <Input
                placeholder="e.g. Tupi Central Gym or Brgy Acmonan Corridor"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Schedule / Date</label>
                <Input
                  placeholder="e.g. Tomorrow or Daily"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="font-medium text-slate-700 block mb-1">Hours / Time</label>
                <Input
                  placeholder="e.g. 8:00 AM - 12:00 PM"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Detailed Description</label>
              <Textarea
                rows={3}
                placeholder="Specify requirements, tools needed, meeting spot, or specifics of what you can offer..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Coordinator / Name</label>
                <Input
                  value={formData.coordinator}
                  onChange={(e) => setFormData({ ...formData, coordinator: e.target.value })}
                />
              </div>
              <div>
                <label className="font-medium text-slate-700 block mb-1">Contact Phone / Details</label>
                <Input
                  placeholder="e.g. 0917-000-0000"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddMissionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {editingMission ? "Save Changes" : "Post to Network"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* MANAGE VOLUNTEER SKILLS MODAL                                     */}
      {/* ================================================================= */}
      <Dialog open={isSkillsModalOpen} onOpenChange={setIsSkillsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Volunteer Skill Registry
            </DialogTitle>
            <DialogDescription>
              Select your emergency capabilities and skillsets to assist relief managers.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            {SKILL_OPTIONS.map((skill) => {
              const isSelected = userSkills.includes(skill);
              return (
                <div
                  key={skill}
                  onClick={() => handleToggleSkill(skill)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-800 font-semibold"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{skill}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setIsSkillsModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
