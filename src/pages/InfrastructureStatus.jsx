import React, { useState, useEffect, useMemo, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  Building2,
  Zap,
  Droplets,
  Wifi,
  ShieldAlert,
  Plus,
  RefreshCw,
  Navigation,
  MapPin,
  Eye,
  MessageSquare,
  Shield,
  Trash2,
  Edit2,
  ShieldCheck,
  AlertOctagon,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import ReactionButtons from "@/components/interactions/ReactionButtons";
import CommentSection from "@/components/interactions/CommentSection";
import {
  getBatchCommentCounts,
  getBatchReactionSummaries,
  TARGET_TYPES,
} from "@/lib/interactions";

// Default verified infrastructure network for Tupi and surrounding South Cotabato corridor
const INITIAL_INFRASTRUCTURE = [
  {
    id: "inf-1",
    name: "Makar-Dulawan National Highway (Tupi Stretch)",
    category: "Roads",
    status: "Passable with Caution",
    statusCode: "caution",
    location: "Poblacion to Brgy. Crossing Rubber, Tupi",
    agency: "DPWH South Cotabato 2nd DEO / MDRRMO",
    lastUpdated: "15 minutes ago",
    created_date: new Date(Date.now() - 3600000 * 2).toISOString(),
    details:
      "Hairline fissures on northbound lane near KM 642. Speed limit reduced to 30 km/h. Traffic enforcers deployed.",
    alternateRoute: "Inner barangay road open for light vehicles only.",
  },
  {
    id: "inf-2",
    name: "Crossing Rubber Concrete Bridge",
    category: "Bridges",
    status: "Closed / Impassable",
    statusCode: "closed",
    location: "Barangay Crossing Rubber, Tupi",
    agency: "Municipal Engineering Office / MDRRMO",
    lastUpdated: "30 minutes ago",
    created_date: new Date(Date.now() - 3600000 * 4).toISOString(),
    details:
      "Approach slab shifted 4 inches after tremor. Structural engineers inspecting bridge abutments. Strictly no crossing.",
    alternateRoute: "Detour via Barangay Bunao - Linan bypass road.",
  },
  {
    id: "inf-3",
    name: "Roel I. Senador Memorial Hospital",
    category: "Hospitals",
    status: "Fully Operational",
    statusCode: "operational",
    location: "Poblacion, Tupi, South Cotabato",
    agency: "Department of Health (DOH) / MHO",
    lastUpdated: "1 hour ago",
    created_date: new Date(Date.now() - 3600000 * 6).toISOString(),
    details:
      "Main building cleared by safety inspectors. Emergency Room, ICU, and surgical wards functioning on generator backup.",
    alternateRoute: "Ambulance priority access gate open at East Wing.",
  },
  {
    id: "inf-4",
    name: "Tupi Municipal Water District (Pumping Station 2)",
    category: "Utilities",
    status: "Limited / Low Pressure",
    statusCode: "caution",
    location: "Barangay Acmonan, Tupi",
    agency: "Tupi Water District",
    lastUpdated: "45 minutes ago",
    created_date: new Date(Date.now() - 3600000 * 8).toISOString(),
    details:
      "Main distribution pipe burst along Purok 3. Repair crew dispatched. Water pressure reduced in elevated zones.",
    alternateRoute: "Free potable water distribution tankers deployed at Poblacion Plaza.",
  },
  {
    id: "inf-5",
    name: "SOCOTECO II Main Grid Substation",
    category: "Utilities",
    status: "Under Inspection",
    statusCode: "inspection",
    location: "Tupi Industrial Area",
    agency: "South Cotabato II Electric Cooperative",
    lastUpdated: "20 minutes ago",
    created_date: new Date(Date.now() - 3600000 * 1).toISOString(),
    details:
      "Feeder 4 tripped due to transformer vibration sensor. Power restored in 10 of 15 barangays. Re-energization underway.",
    alternateRoute: "Public charging stations operating at Municipal Gymnasium.",
  },
  {
    id: "inf-6",
    name: "Tupi National High School Complex",
    category: "Schools",
    status: "Closed / Evacuation Use Only",
    statusCode: "caution",
    location: "Poblacion, Tupi",
    agency: "DepEd Division of South Cotabato",
    lastUpdated: "2 hours ago",
    created_date: new Date(Date.now() - 3600000 * 10).toISOString(),
    details:
      "Classes suspended. Multi-purpose covered gym activated as secondary emergency relief staging point.",
    alternateRoute: "Academic buildings cordoned off for structural integrity auditing.",
  },
];

const STATUS_CONFIGS = {
  operational: {
    label: "Fully Operational",
    icon: CheckCircle2,
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  },
  caution: {
    label: "Passable with Caution",
    icon: AlertTriangle,
    badge: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  },
  closed: {
    label: "Closed / Impassable",
    icon: XCircle,
    badge: "bg-rose-500/10 text-rose-700 border-rose-500/30 font-semibold",
  },
  inspection: {
    label: "Under Inspection",
    icon: RefreshCw,
    badge: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  },
};

const STORAGE_KEY = "aegis_infrastructure_status";

export default function InfrastructureStatus() {
  const { user } = useAuth();

  // Role check: Admin / LGU / DRRMO posts and manages infrastructure
  const canPostInfrastructure = ["admin", "lgu", "drrmo"].includes(user?.role);

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_INFRASTRUCTURE;
    } catch {
      return INITIAL_INFRASTRUCTURE;
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Interaction counts
  const [commentCounts, setCommentCounts] = useState({});
  const [reactionSummaries, setReactionSummaries] = useState({});

  // Sync state to shared storage
  const saveItems = useCallback((newItems) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch batch comments and reactions
  const loadInteractions = useCallback(async () => {
    if (items.length === 0) return;
    const ids = items.map((i) => i.id);
    try {
      const [cCounts, rSummaries] = await Promise.all([
        getBatchCommentCounts({
          targetType: TARGET_TYPES.INFRASTRUCTURE_STATUS,
          targetIds: ids,
        }),
        getBatchReactionSummaries({
          targetType: TARGET_TYPES.INFRASTRUCTURE_STATUS,
          targetIds: ids,
          currentUserId: user?.id,
        }),
      ]);
      setCommentCounts(cCounts || {});
      setReactionSummaries(rSummaries || {});
    } catch (e) {
      console.error("Failed to load infrastructure interactions:", e);
    }
  }, [items, user?.id]);

  useEffect(() => {
    loadInteractions();
  }, [loadInteractions]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "Roads",
    statusCode: "caution",
    location: "",
    agency: "",
    details: "",
    alternateRoute: "",
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      category: "Roads",
      statusCode: "caution",
      location: "",
      agency: user?.name ? `${user.name} (${user.role?.toUpperCase()})` : "MDRRMO Engineering Office",
      details: "",
      alternateRoute: "",
    });
    setIsReportModalOpen(true);
  };

  const handleOpenEdit = (item, e) => {
    if (e) e.stopPropagation();
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      statusCode: item.statusCode,
      location: item.location,
      agency: item.agency,
      details: item.details,
      alternateRoute: item.alternateRoute || "",
    });
    setIsReportModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (!canPostInfrastructure) {
      alert("Unauthorized: Only Admin or LGU-DRRMO officials can publish official infrastructure status updates.");
      return;
    }

    const statusLabel =
      formData.statusCode === "operational"
        ? "Fully Operational"
        : formData.statusCode === "caution"
        ? "Passable with Caution"
        : formData.statusCode === "closed"
        ? "Closed / Impassable"
        : "Under Inspection";

    if (editingItem) {
      // Update
      const updatedList = items.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              name: formData.name,
              category: formData.category,
              status: statusLabel,
              statusCode: formData.statusCode,
              location: formData.location || "Tupi, South Cotabato",
              agency: formData.agency || "MDRRMO Operations",
              lastUpdated: "Just now",
              details: formData.details,
              alternateRoute: formData.alternateRoute,
            }
          : i
      );
      saveItems(updatedList);
      if (selectedItem?.id === editingItem.id) {
        setSelectedItem(updatedList.find((i) => i.id === editingItem.id));
      }
    } else {
      // Create new
      const newItem = {
        id: "inf-" + Date.now(),
        name: formData.name,
        category: formData.category,
        status: statusLabel,
        statusCode: formData.statusCode,
        location: formData.location || "Tupi, South Cotabato",
        agency: formData.agency || "MDRRMO Operations",
        lastUpdated: "Just now",
        created_date: new Date().toISOString(),
        details: formData.details,
        alternateRoute: formData.alternateRoute,
      };
      saveItems([newItem, ...items]);
    }

    setIsReportModalOpen(false);
  };

  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    if (!canPostInfrastructure) {
      alert("Unauthorized: Only Admin or LGU-DRRMO can delete infrastructure status reports.");
      return;
    }
    if (!window.confirm("Are you sure you want to remove this infrastructure status advisory?")) return;
    const filtered = items.filter((i) => i.id !== id);
    saveItems(filtered);
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = items.length;
    const operational = items.filter((i) => i.statusCode === "operational").length;
    const caution = items.filter((i) => i.statusCode === "caution").length;
    const closed = items.filter((i) => i.statusCode === "closed").length;
    const operationalPct = total > 0 ? Math.round((operational / total) * 100) : 0;
    return { total, operational, caution, closed, operationalPct };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q);

      const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
      const matchesStatus = selectedStatus === "all" || item.statusCode === selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [items, searchQuery, selectedCategory, selectedStatus]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        title="Infrastructure Status Monitoring"
        description="Official post-earthquake operational status of critical lifelines, bridges, hospitals, and utilities. Community members can read and contribute real-time road updates."
        actions={
          canPostInfrastructure ? (
            <Button
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
            >
              <Plus className="mr-2 h-4 w-4" /> Post Infrastructure Update
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white/70 px-3 py-1.5 rounded-xl border border-slate-200">
              <Shield className="h-4 w-4 text-blue-600" />
              <span>Admin / DRRMO verified bulletin</span>
            </div>
          )
        }
      />

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white/70 border border-white/60 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Operational Rate</span>
            <span className="text-emerald-600 font-bold text-sm">{metrics.operationalPct}%</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            {metrics.operational} / {metrics.total}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Safe & accessible</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 border border-white/60 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase">Caution</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">{metrics.caution}</h3>
          <p className="text-xs text-slate-500 mt-1">Minor damage / slow traffic</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 border border-white/60 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 uppercase">Closed / Broken</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="text-2xl font-bold text-rose-600 mt-1">{metrics.closed}</h3>
          <p className="text-xs text-slate-500 mt-1">Strictly impassable</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 border border-white/60 shadow-sm backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 uppercase">Lifeline Grids</span>
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">SOCOTECO & Water</h3>
            <p className="text-xs text-slate-500">Monitoring Active</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search highway, bridge, hospital, water station, or purok..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-white/80 border-slate-200"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700"
            >
              <option value="all">All Categories</option>
              <option value="Roads">Roads & Corridors</option>
              <option value="Bridges">Bridges & Culverts</option>
              <option value="Hospitals">Hospitals & Clinics</option>
              <option value="Utilities">Power & Water</option>
              <option value="Schools">Schools & Shelters</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="operational">Operational</option>
              <option value="caution">Caution</option>
              <option value="closed">Closed / Impassable</option>
              <option value="inspection">Under Inspection</option>
            </select>
          </div>
        </div>

        {!canPostInfrastructure && (
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/50">
            <span>Official post-disaster infrastructure updates are posted by MDRRMO / LGU engineers.</span>
            <span className="text-blue-600 font-medium">All residents can react and post live comments.</span>
          </div>
        )}
      </div>

      {/* Infrastructure Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const cfg = STATUS_CONFIGS[item.statusCode] || STATUS_CONFIGS.operational;
          const StatusIcon = cfg.icon;
          const cCount = commentCounts[item.id] || 0;

          return (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group cursor-pointer rounded-2xl border border-white/50 bg-white/60 p-5 shadow-[4px_4px_16px_rgba(0,0,0,0.04),-4px_-4px_12px_rgba(255,255,255,0.9)] backdrop-blur-xl backdrop-saturate-150 transition-all hover:bg-white/75 hover:shadow-lg flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header line */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full ring-1 ring-slate-200">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.lastUpdated}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-base group-hover:text-blue-700 transition-colors">
                      {item.name}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      {item.location}
                    </p>
                  </div>

                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border flex items-center gap-1.5 shrink-0 ${cfg.badge}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {item.status}
                  </span>
                </div>

                {/* Details snippet */}
                <div className="p-3 rounded-xl bg-white/70 border border-slate-100 text-xs">
                  <p className="text-slate-700 leading-relaxed">{item.details}</p>

                  {item.alternateRoute && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-start gap-1.5 text-slate-600">
                      <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-800">Detour: </strong>
                        {item.alternateRoute}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom interactions & admin actions strip */}
              <div
                className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ReactionButtons
                    targetType={TARGET_TYPES.INFRASTRUCTURE_STATUS}
                    targetId={item.id}
                    currentUserId={user?.id}
                    initialSummary={reactionSummaries[item.id]}
                    compact={true}
                  />

                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white/50 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                    <span>{cCount} {cCount === 1 ? "comment" : "comments"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  {canPostInfrastructure && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900"
                        onClick={(e) => handleOpenEdit(item, e)}
                        title="Edit status"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Delete advisory"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItem(item)}
                    className="text-xs h-7 px-2.5"
                  >
                    <Eye className="w-3 h-3 mr-1" /> View Details
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* VIEW DETAILS & COMMUNITY DISCUSSION MODAL                         */}
      {/* ================================================================= */}
      {selectedItem && (
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full ring-1 ring-slate-200">
                  {selectedItem.category}
                </span>
                <span className="text-[10px] text-slate-400">Updated {selectedItem.lastUpdated}</span>
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {selectedItem.name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1 text-xs">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                {selectedItem.location}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  STATUS_CONFIGS[selectedItem.statusCode]?.badge || STATUS_CONFIGS.operational.badge
                }`}
              >
                <span className="font-semibold">Official Operational Condition:</span>
                <span className="font-bold flex items-center gap-1 text-sm">
                  {selectedItem.status}
                </span>
              </div>

              <div>
                <h5 className="font-bold text-slate-700 mb-1 text-xs">Official Damage Assessment:</h5>
                <p className="p-3 bg-white/70 rounded-xl text-slate-700 leading-relaxed border border-slate-200/60">
                  {selectedItem.details}
                </p>
              </div>

              {selectedItem.alternateRoute && (
                <div>
                  <h5 className="font-bold text-slate-700 mb-1 text-xs">Recommended Detour / Alternate Route:</h5>
                  <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-blue-900 flex items-start gap-2">
                    <Navigation className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                    <span>{selectedItem.alternateRoute}</span>
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                Authorized Agency: <strong>{selectedItem.agency}</strong>
              </div>

              {/* Full Reactions Bar */}
              <ReactionButtons
                targetType={TARGET_TYPES.INFRASTRUCTURE_STATUS}
                targetId={selectedItem.id}
                currentUserId={user?.id}
                compact={false}
              />

              {/* Embedded Live Discussion & Comments */}
              <CommentSection
                targetType={TARGET_TYPES.INFRASTRUCTURE_STATUS}
                targetId={selectedItem.id}
                currentUser={user}
                onCommentCountChange={(count) => {
                  setCommentCounts((prev) => ({ ...prev, [selectedItem.id]: count }));
                }}
              />
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setSelectedItem(null)}>
                Close Advisory
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ================================================================= */}
      {/* POST / EDIT INFRASTRUCTURE STATUS MODAL (Admin / Officials Only)  */}
      {/* ================================================================= */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              {editingItem ? "Edit Infrastructure Advisory" : "Post Official Infrastructure Update"}
            </DialogTitle>
            <DialogDescription>
              Broadcast official operational status for roads, bridges, and utilities.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-medium text-slate-700 block mb-1">Facility or Road Name *</label>
              <Input
                required
                placeholder="e.g. Crossing Rubber Bridge or Poblacion Highway"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-700"
                >
                  <option value="Roads">Roads & Corridors</option>
                  <option value="Bridges">Bridges & Culverts</option>
                  <option value="Hospitals">Hospitals & Clinics</option>
                  <option value="Utilities">Power & Water Utilities</option>
                  <option value="Schools">Schools & Shelters</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Status Condition</label>
                <select
                  value={formData.statusCode}
                  onChange={(e) => setFormData({ ...formData, statusCode: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 text-slate-700"
                >
                  <option value="operational">Fully Operational</option>
                  <option value="caution">Passable with Caution</option>
                  <option value="closed">Closed / Impassable</option>
                  <option value="inspection">Under Inspection</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Location Details</label>
              <Input
                placeholder="e.g. Barangay Crossing Rubber, Tupi"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Assessment Findings</label>
              <Input
                placeholder="e.g. Slab crack inspected by DPWH; light vehicles only"
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Recommended Detour / Alternate</label>
              <Input
                placeholder="e.g. Detour via Bunao-Linan Bypass"
                value={formData.alternateRoute}
                onChange={(e) => setFormData({ ...formData, alternateRoute: e.target.value })}
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Authorizing Agency</label>
              <Input
                placeholder="e.g. DPWH 2nd DEO / MDRRMO Operations"
                value={formData.agency}
                onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsReportModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                {editingItem ? "Save Changes" : "Publish Advisory"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
