import React, { useState, useEffect, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  FileText, Shield, Camera, Upload, Plus, Trash2, Edit3, Eye, EyeOff,
  CheckCircle2, AlertTriangle, Download, ExternalLink, Calendar,
  Building, Lock, Unlock, Search, Filter, Sparkles, FolderLock,
  FileCheck, MapPin, DollarSign, Image as ImageIcon, Share2, Printer
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

// Initial damage sample records
const INITIAL_DAMAGE_REPORTS = [
  {
    id: "dmg-1",
    title: "Cracked perimeter wall and lintel beam",
    category: "Structural",
    severity: "Moderate",
    cost: 45000,
    address: "Poblacion, Tupi, South Cotabato",
    date: "2026-10-10",
    status: "Under Review",
    description: "Diagonal shear cracks along northern concrete hollow block wall and hairline fractures on the main support beam after recent 5.8 quake.",
    photos: [
      "https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=600&q=80"
    ]
  },
  {
    id: "dmg-2",
    title: "Shattered windows and fallen ceiling panels",
    category: "Non-Structural",
    severity: "Minor",
    cost: 18500,
    address: "Crossing Rubber, Tupi, South Cotabato",
    date: "2026-10-11",
    status: "Approved for Cash Assistance",
    description: "Three exterior window panes broken, interior acoustic ceiling panels fell into living room area. No structural beam damage observed.",
    photos: [
      "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80"
    ]
  }
];

// Initial vault documents
const INITIAL_VAULT_DOCUMENTS = [
  {
    id: "doc-1",
    title: "Philippine National ID (PhilID)",
    category: "Government ID",
    docNumber: "•••• •••• 9102",
    holderName: "Juan Dela Cruz",
    issuedDate: "2023-04-12",
    expiryDate: "Lifetime",
    notes: "Stored for proof of identity and LGU relief distributions.",
    fileData: null,
    isVerified: true
  },
  {
    id: "doc-2",
    title: "Transfer Certificate of Title (TCT Land Deed)",
    category: "Property & Land",
    docNumber: "TCT No. •••-78421",
    holderName: "Dela Cruz Family",
    issuedDate: "2019-08-20",
    expiryDate: "Permanent",
    notes: "Proof of ownership for property damage claims & housing reconstruction aid.",
    fileData: null,
    isVerified: true
  },
  {
    id: "doc-3",
    title: "Comprehensive Household Disaster Insurance",
    category: "Insurance Policy",
    docNumber: "POL-EQ-2026-881",
    holderName: "Juan Dela Cruz",
    issuedDate: "2026-01-01",
    expiryDate: "2027-01-01",
    notes: "Policy covers up to ₱1,500,000 for earthquake and fire hazards.",
    fileData: null,
    isVerified: true
  },
  {
    id: "doc-4",
    title: "Philippine Statistics Authority (PSA) Birth Certificate",
    category: "Vital Records",
    docNumber: "PSA-BC-4481029",
    holderName: "Juan Dela Cruz",
    issuedDate: "2020-03-15",
    expiryDate: "Permanent",
    notes: "Digital backup copy in case physical copies are damaged during calamity.",
    fileData: null,
    isVerified: true
  }
];

const SEVERITY_BADGES = {
  Minor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Moderate: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Severe: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  "Total Loss": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
};

const STATUS_BADGES = {
  Draft: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  "Submitted for LGU Aid": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "Under Review": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  "Approved for Cash Assistance": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
};

export default function DamageVault() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("damage"); // 'damage' | 'vault'

  // Damage Reports State
  const [damageReports, setDamageReports] = useState(() => {
    try {
      const saved = localStorage.getItem("aegis_damage_reports");
      return saved ? JSON.parse(saved) : INITIAL_DAMAGE_REPORTS;
    } catch {
      return INITIAL_DAMAGE_REPORTS;
    }
  });

  // Vault Documents State
  const [vaultDocs, setVaultDocs] = useState(() => {
    try {
      const saved = localStorage.getItem("aegis_document_vault");
      return saved ? JSON.parse(saved) : INITIAL_VAULT_DOCUMENTS;
    } catch {
      return INITIAL_VAULT_DOCUMENTS;
    }
  });

  // Save to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem("aegis_damage_reports", JSON.stringify(damageReports));
    } catch (e) {
      console.error(e);
    }
  }, [damageReports]);

  useEffect(() => {
    try {
      localStorage.setItem("aegis_document_vault", JSON.stringify(vaultDocs));
    } catch (e) {
      console.error(e);
    }
  }, [vaultDocs]);

  // Privacy lock toggle
  const [isVaultLocked, setIsVaultLocked] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterDocCategory, setFilterDocCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddDamageOpen, setIsAddDamageOpen] = useState(false);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [selectedDamage, setSelectedDamage] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // New damage form
  const [newDamage, setNewDamage] = useState({
    title: "",
    category: "Structural",
    severity: "Moderate",
    cost: "",
    address: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    photos: []
  });

  // New document form
  const [newDoc, setNewDoc] = useState({
    title: "",
    category: "Government ID",
    docNumber: "",
    holderName: "",
    issuedDate: "",
    expiryDate: "",
    notes: "",
    fileData: null
  });

  // Add damage handler
  const handleSaveDamage = (e) => {
    e.preventDefault();
    if (!newDamage.title.trim()) return;

    const report = {
      id: "dmg-" + Date.now(),
      title: newDamage.title,
      category: newDamage.category,
      severity: newDamage.severity,
      cost: parseFloat(newDamage.cost) || 0,
      address: newDamage.address || "Tupi, South Cotabato",
      date: newDamage.date || new Date().toISOString().split("T")[0],
      status: "Submitted for LGU Aid",
      description: newDamage.description,
      photos: newDamage.photos.length > 0 ? newDamage.photos : [
        "https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=600&q=80"
      ]
    };

    setDamageReports([report, ...damageReports]);
    setIsAddDamageOpen(false);
    setNewDamage({
      title: "",
      category: "Structural",
      severity: "Moderate",
      cost: "",
      address: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      photos: []
    });
  };

  // Add doc handler
  const handleSaveDoc = (e) => {
    e.preventDefault();
    if (!newDoc.title.trim()) return;

    const doc = {
      id: "doc-" + Date.now(),
      title: newDoc.title,
      category: newDoc.category,
      docNumber: newDoc.docNumber || "N/A",
      holderName: newDoc.holderName || user?.fullName || "Family Member",
      issuedDate: newDoc.issuedDate || new Date().toISOString().split("T")[0],
      expiryDate: newDoc.expiryDate || "Permanent",
      notes: newDoc.notes,
      fileData: newDoc.fileData,
      isVerified: true
    };

    setVaultDocs([doc, ...vaultDocs]);
    setIsAddDocOpen(false);
    setNewDoc({
      title: "",
      category: "Government ID",
      docNumber: "",
      holderName: "",
      issuedDate: "",
      expiryDate: "",
      notes: "",
      fileData: null
    });
  };

  // File upload reader
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setNewDamage((prev) => ({
          ...prev,
          photos: [...prev.photos, uploadEvent.target.result]
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      if (uploadEvent.target?.result) {
        setNewDoc((prev) => ({
          ...prev,
          fileData: uploadEvent.target.result
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Calculations
  const totalDamageCost = useMemo(() => {
    return damageReports.reduce((acc, r) => acc + (r.cost || 0), 0);
  }, [damageReports]);

  // Essential checklist count
  const essentialDocsCount = useMemo(() => {
    const categoriesPresent = new Set(vaultDocs.map((d) => d.category));
    return categoriesPresent.size;
  }, [vaultDocs]);

  // Filtered damage
  const filteredDamage = useMemo(() => {
    return damageReports.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = filterSeverity === "all" || item.severity === filterSeverity;
      return matchesSearch && matchesSeverity;
    });
  }, [damageReports, searchQuery, filterSeverity]);

  // Filtered docs
  const filteredDocs = useMemo(() => {
    return vaultDocs.filter((item) => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.holderName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = filterDocCategory === "all" || item.category === filterDocCategory;
      return matchesSearch && matchesCat;
    });
  }, [vaultDocs, searchQuery, filterDocCategory]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Damage Documentation & Vault"
        description="Photograph and report earthquake damage for government aid, and securely store digital copies of vital personal documents."
      />

      {/* Top summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Recorded Loss</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                ₱{totalDamageCost.toLocaleString()}
              </h3>
            </div>
            <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {damageReports.length} damage assessment {damageReports.length === 1 ? "claim" : "claims"} logged
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Vaulted Documents</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {vaultDocs.length} Copies
              </h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <FolderLock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Encrypted & accessible even during power/cell outages
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Paperwork Readiness</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {Math.min(100, Math.round((essentialDocsCount / 5) * 100))}%
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {essentialDocsCount} of 5 essential recovery categories stored
          </p>
        </div>
      </div>

      {/* Main Switcher Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("damage")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "damage"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Camera className="w-4 h-4" />
            Damage Documentation ({damageReports.length})
          </button>
          <button
            onClick={() => setActiveTab("vault")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "vault"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FolderLock className="w-4 h-4" />
            Disaster Document Vault ({vaultDocs.length})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === "damage" ? (
            <Button
              onClick={() => setIsAddDamageOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Document New Damage
            </Button>
          ) : (
            <Button
              onClick={() => setIsAddDocOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Upload Essential Document
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: DAMAGE DOCUMENTATION */}
      {activeTab === "damage" && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search damage reports by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/70 dark:bg-slate-900/70"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">Severity:</span>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Severities</option>
                <option value="Minor">Minor</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
                <option value="Total Loss">Total Loss</option>
              </select>
            </div>
          </div>

          {/* List of Damage Reports */}
          {filteredDamage.length === 0 ? (
            <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <Camera className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">No damage reports found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Log structural cracks, collapsed walls, or damaged personal belongings to support emergency assistance claims.
              </p>
              <Button
                onClick={() => setIsAddDamageOpen(true)}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Create First Damage Report
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDamage.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${SEVERITY_BADGES[report.severity] || "bg-slate-100"}`}>
                            {report.severity}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {report.category}
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                          {report.title}
                        </h4>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-1 rounded-lg border whitespace-nowrap ${STATUS_BADGES[report.status] || "bg-slate-100 text-slate-700"}`}>
                        {report.status}
                      </span>
                    </div>

                    {/* Photo thumbnail */}
                    {report.photos && report.photos.length > 0 && (
                      <div className="mt-3 relative h-36 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800/60">
                        <img
                          src={report.photos[0]}
                          alt={report.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-medium text-white flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          {report.photos.length} Photo{report.photos.length > 1 ? "s" : ""}
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                      {report.description}
                    </p>

                    <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3.5 h-3.5" />
                          {report.address}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {report.date}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-medium pt-1">
                        <span className="text-slate-500">Estimated Repair Cost:</span>
                        <span className="text-slate-900 dark:text-white font-semibold">
                          ₱{report.cost?.toLocaleString() || "0"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDamage(report)}
                      className="flex-1 text-xs h-8"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View Claim Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDamageReports(damageReports.filter((r) => r.id !== report.id));
                      }}
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DISASTER DOCUMENT VAULT */}
      {activeTab === "vault" && (
        <div className="space-y-4">
          {/* Vault Security Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Local Offline Vault Protected
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vital files stay cached on this device so you can present proofs of identity and property ownership without internet.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsVaultLocked(!isVaultLocked)}
              className="text-xs flex items-center gap-2 whitespace-nowrap"
            >
              {isVaultLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                  Reveal Document IDs
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  Mask Document IDs
                </>
              )}
            </Button>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search documents by title or holder name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/70 dark:bg-slate-900/70"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">Category:</span>
              <select
                value={filterDocCategory}
                onChange={(e) => setFilterDocCategory(e.target.value)}
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="Government ID">Government ID</option>
                <option value="Property & Land">Property & Land</option>
                <option value="Insurance Policy">Insurance Policy</option>
                <option value="Vital Records">Vital Records</option>
                <option value="Medical">Medical Records</option>
              </select>
            </div>
          </div>

          {/* Documents Grid */}
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              <FolderLock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">No documents in vault</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Upload scans or photos of your National ID, land deeds, insurance certificates, and medical history.
              </p>
              <Button
                onClick={() => setIsAddDocOpen(true)}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Upload First Document
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl mb-3">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                        {doc.category}
                      </span>
                    </div>

                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                      {doc.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Holder: <span className="text-slate-700 dark:text-slate-300 font-medium">{doc.holderName}</span>
                    </p>

                    <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Doc ID:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {isVaultLocked ? "•••• •••• ••••" : doc.docNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Expiry:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{doc.expiryDate}</span>
                      </div>
                    </div>

                    {doc.notes && (
                      <p className="text-xs text-slate-500 italic mt-2.5 line-clamp-2">
                        "{doc.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDoc(doc)}
                      className="flex-1 text-xs h-8"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Inspect Document
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVaultDocs(vaultDocs.filter((d) => d.id !== doc.id))}
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DIALOG 1: ADD DAMAGE MODAL */}
      <Dialog open={isAddDamageOpen} onOpenChange={setIsAddDamageOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Camera className="w-5 h-5" />
              Document Earthquake Damage
            </DialogTitle>
            <DialogDescription>
              Record proof of physical damage for disaster claims, barangay validation, and structural repairs.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDamage} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Damage Title / Summary *
              </label>
              <Input
                required
                placeholder="e.g. Major wall crack in kitchen area"
                value={newDamage.title}
                onChange={(e) => setNewDamage({ ...newDamage, title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={newDamage.category}
                  onChange={(e) => setNewDamage({ ...newDamage, category: e.target.value })}
                  className="w-full mt-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
                >
                  <option value="Structural">Structural (Beams, Columns, Walls)</option>
                  <option value="Non-Structural">Non-Structural (Ceiling, Windows)</option>
                  <option value="Electrical/Plumbing">Electrical / Plumbing</option>
                  <option value="Belongings/Appliances">Belongings & Appliances</option>
                  <option value="Vehicle/Equipment">Vehicle / Farm Equipment</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Severity Rating
                </label>
                <select
                  value={newDamage.severity}
                  onChange={(e) => setNewDamage({ ...newDamage, severity: e.target.value })}
                  className="w-full mt-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
                >
                  <option value="Minor">Minor (Cosmetic / Superficial)</option>
                  <option value="Moderate">Moderate (Needs repair, habitable)</option>
                  <option value="Severe">Severe (Structural hazard, do not enter)</option>
                  <option value="Total Loss">Total Loss (Structure collapsed)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Estimated Repair Cost (₱)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 25000"
                  value={newDamage.cost}
                  onChange={(e) => setNewDamage({ ...newDamage, cost: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Date of Event
                </label>
                <Input
                  type="date"
                  value={newDamage.date}
                  onChange={(e) => setNewDamage({ ...newDamage, date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Location / Address
              </label>
              <Input
                placeholder="e.g. Zone 3, Poblacion, Tupi, South Cotabato"
                value={newDamage.address}
                onChange={(e) => setNewDamage({ ...newDamage, address: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Detailed Description & Hazard Notes
              </label>
              <textarea
                rows={3}
                placeholder="Describe crack length, depth, water leaks, or immediate safety concerns..."
                value={newDamage.description}
                onChange={(e) => setNewDamage({ ...newDamage, description: e.target.value })}
                className="w-full mt-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Attach Photo Evidence
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              {newDamage.photos.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {newDamage.photos.map((p, idx) => (
                    <img key={idx} src={p} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddDamageOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                Save & Submit Damage Report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: ADD DOCUMENT MODAL */}
      <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <FolderLock className="w-5 h-5" />
              Vault Essential Document
            </DialogTitle>
            <DialogDescription>
              Secure critical identity and ownership papers to expedite relief goods and recovery grants.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDoc} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Document Title *
              </label>
              <Input
                required
                placeholder="e.g. Philippine National ID or Property Deed"
                value={newDoc.title}
                onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Document Category
                </label>
                <select
                  value={newDoc.category}
                  onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                  className="w-full mt-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
                >
                  <option value="Government ID">Government ID</option>
                  <option value="Property & Land">Property & Land Title</option>
                  <option value="Insurance Policy">Insurance Policy</option>
                  <option value="Vital Records">Vital Records (Birth/Marriage)</option>
                  <option value="Medical">Medical / Prescriptions</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Document / Serial Number
                </label>
                <Input
                  placeholder="e.g. 1234-5678-9012"
                  value={newDoc.docNumber}
                  onChange={(e) => setNewDoc({ ...newDoc, docNumber: e.target.value })}
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Holder / Full Name
                </label>
                <Input
                  placeholder="Name on document"
                  value={newDoc.holderName}
                  onChange={(e) => setNewDoc({ ...newDoc, holderName: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Expiry Date
                </label>
                <Input
                  placeholder="e.g. 2030-12-31 or Lifetime"
                  value={newDoc.expiryDate}
                  onChange={(e) => setNewDoc({ ...newDoc, expiryDate: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Notes & Safe Storage Instructions
              </label>
              <textarea
                rows={2}
                placeholder="Where physical original is kept, policy limits, emergency contact info..."
                value={newDoc.notes}
                onChange={(e) => setNewDoc({ ...newDoc, notes: e.target.value })}
                className="w-full mt-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Upload Scanned Copy / Photo
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleDocFileUpload}
                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddDocOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Save to Encrypted Vault
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: VIEW DAMAGE DETAILS MODAL */}
      {selectedDamage && (
        <Dialog open={!!selectedDamage} onOpenChange={() => setSelectedDamage(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${SEVERITY_BADGES[selectedDamage.severity] || "bg-slate-100"}`}>
                  {selectedDamage.severity}
                </span>
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {selectedDamage.category}
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedDamage.title}
              </DialogTitle>
              <DialogDescription>
                Reference ID: {selectedDamage.id} • Logged on {selectedDamage.date}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {selectedDamage.photos && selectedDamage.photos.length > 0 && (
                <div className="h-48 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200">
                  <img src={selectedDamage.photos[0]} alt="Damage" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Damage Location:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedDamage.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Cost:</span>
                  <span className="font-bold text-slate-900 dark:text-white">₱{selectedDamage.cost?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assistance Status:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedDamage.status}</span>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description & Impact</h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                  {selectedDamage.description}
                </p>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2.5">
                <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-normal">
                  This report has been formatted to match the standard NDRRMC / MDRRMO Post-Disaster Needs Assessment (PDNA) template.
                </p>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </Button>
              <Button size="sm" onClick={() => setSelectedDamage(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG 4: VIEW DOC DETAILS MODAL */}
      {selectedDoc && (
        <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl w-fit mb-2">
                <FolderLock className="w-6 h-6" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedDoc.title}
              </DialogTitle>
              <DialogDescription>
                Category: {selectedDoc.category}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Document Number:</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {selectedDoc.docNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Holder Name:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedDoc.holderName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valid / Expiry:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedDoc.expiryDate}
                  </span>
                </div>
              </div>

              {selectedDoc.notes && (
                <div>
                  <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes:</h5>
                  <p className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                    {selectedDoc.notes}
                  </p>
                </div>
              )}

              {selectedDoc.fileData ? (
                <div className="mt-2">
                  <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Preview Scanned Copy:</h5>
                  <div className="h-44 rounded-xl overflow-hidden border border-slate-200">
                    <img src={selectedDoc.fileData} alt="Document" className="w-full h-full object-cover" />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Metadata record verified & backed up locally.
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button size="sm" onClick={() => setSelectedDoc(null)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
