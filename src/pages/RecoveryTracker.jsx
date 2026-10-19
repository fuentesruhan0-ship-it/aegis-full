import React, { useState, useEffect, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Clock, DollarSign, Plus,
  ShieldCheck, MapPin, Calendar, AlertCircle, HeartHandshake
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

// Initial sample recovery tracker applications
const INITIAL_RECOVERY_CLAIMS = [
  {
    id: "REC-2026-091",
    title: "DSWD Emergency Shelter Assistance (ESA)",
    category: "Financial Aid",
    agency: "DSWD Field Office XII / Tupi MSWDO",
    amount: 30000,
    currentStep: 3, // 0: Submitted, 1: Validation, 2: Document Review, 3: Approved, 4: Disbursed
    totalSteps: 5,
    status: "Approved - Payout Scheduled",
    statusCode: "approved",
    dateSubmitted: "2026-10-08",
    estimatedCompletion: "2026-10-16",
    nextAction: "Claim cash grant at Tupi Municipal Gymnasium with PhilID and Barangay Certificate on Oct 16, 9:00 AM.",
    payoutVenue: "Tupi Municipal Gym (Window 3)",
    referenceNumber: "DSWD-ESA-TP-88412",
    notes: "Partially damaged residence confirmed by Barangay DRRM committee validator."
  },
  {
    id: "REC-2026-144",
    title: "MDRRMO Post-Earthquake Building Safety Clearance",
    category: "Structural Safety",
    agency: "Municipal Engineering Office / MDRRMO",
    amount: 0,
    currentStep: 4,
    totalSteps: 5,
    status: "Cleared (Green Tag Issued)",
    statusCode: "completed",
    dateSubmitted: "2026-10-09",
    estimatedCompletion: "Completed",
    nextAction: "Green Safety Tag posted on premises. Safe for re-occupancy.",
    payoutVenue: "On-site Residence",
    referenceNumber: "MEO-STR-2026-042",
    notes: "Foundation and main reinforced columns intact. Hairline surface stucco cracks only."
  },
  {
    id: "REC-2026-189",
    title: "SOCOTECO II Service Drop Line Reconnection",
    category: "Utilities",
    agency: "South Cotabato II Electric Cooperative",
    amount: 0,
    currentStep: 2,
    totalSteps: 5,
    status: "Lineman Dispatch Scheduled",
    statusCode: "in_progress",
    dateSubmitted: "2026-10-11",
    estimatedCompletion: "2026-10-14",
    nextAction: "Ensure main household circuit breaker remains switched OFF prior to crew arrival.",
    payoutVenue: "Poblacion Line Feeder 2",
    referenceNumber: "SOC-WO-99210",
    notes: "Service drop wire detached during secondary shock. Replacement wire dispatched."
  },
  {
    id: "REC-2026-215",
    title: "NHA Emergency Housing Assistance Program (EHAP)",
    category: "Housing Repair",
    agency: "National Housing Authority (Region XII)",
    amount: 15000,
    currentStep: 1,
    totalSteps: 5,
    status: "Barangay Validation in Progress",
    statusCode: "in_progress",
    dateSubmitted: "2026-10-12",
    estimatedCompletion: "2026-10-22",
    nextAction: "Barangay inspector scheduled to conduct physical site assessment this Wednesday.",
    payoutVenue: "Municipal Hall Atrium",
    referenceNumber: "NHA-EHAP-2026-118",
    notes: "Application for roofing and cement rehabilitation supplies."
  }
];

const STEPS_MAP = [
  "Application Submitted",
  "Barangay Validation",
  "Agency Assessment",
  "Approval & Allocation",
  "Disbursement / Completed"
];

const STATUS_THEMES = {
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  action_needed: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
};

export default function RecoveryTracker() {
  const { user } = useAuth();
  const [claims, setClaims] = useState(() => {
    try {
      const saved = localStorage.getItem("aegis_recovery_claims");
      return saved ? JSON.parse(saved) : INITIAL_RECOVERY_CLAIMS;
    } catch {
      return INITIAL_RECOVERY_CLAIMS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("aegis_recovery_claims", JSON.stringify(claims));
    } catch (e) {
      console.error(e);
    }
  }, [claims]);

  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // New application state
  const [newApp, setNewApp] = useState({
    title: "",
    category: "Financial Aid",
    agency: "Tupi MSWDO",
    amount: "",
    notes: ""
  });

  const handleCreateApplication = (e) => {
    e.preventDefault();
    if (!newApp.title.trim()) return;

    const newClaim = {
      id: "REC-" + new Date().getFullYear() + "-" + Math.floor(100 + Math.random() * 900),
      title: newApp.title,
      category: newApp.category,
      agency: newApp.agency,
      amount: parseFloat(newApp.amount) || 0,
      currentStep: 0,
      totalSteps: 5,
      status: "Application Submitted",
      statusCode: "in_progress",
      dateSubmitted: new Date().toISOString().split("T")[0],
      estimatedCompletion: "7-14 Business Days",
      nextAction: "Waiting for barangay field validator assignment.",
      payoutVenue: "Municipal Hall / Field Office",
      referenceNumber: "REF-" + Math.floor(100000 + Math.random() * 900000),
      notes: newApp.notes || "Initial application submitted via Aegis Recovery Portal."
    };

    setClaims([newClaim, ...claims]);
    setIsApplyModalOpen(false);
    setNewApp({
      title: "",
      category: "Financial Aid",
      agency: "Tupi MSWDO",
      amount: "",
      notes: ""
    });
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = claims.length;
    const completed = claims.filter((c) => c.statusCode === "completed").length;
    const approved = claims.filter((c) => c.statusCode === "approved").length;
    const totalFundsAllocated = claims.reduce((acc, c) => acc + (c.amount || 0), 0);
    const overallProgress = total > 0
      ? Math.round((claims.reduce((acc, c) => acc + c.currentStep, 0) / (total * 4)) * 100)
      : 0;

    return { total, completed, approved, totalFundsAllocated, overallProgress };
  }, [claims]);

  // Filtered claims
  const filteredClaims = useMemo(() => {
    if (filterCategory === "all") return claims;
    return claims.filter((c) => c.category === filterCategory);
  }, [claims, filterCategory]);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Recovery Progress Tracker"
        description="Unified status dashboard for disaster financial aid, structural permits, emergency shelter grants, and utility restoration."
      />

      {/* Top Recovery Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Progress Bar Card */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">Recovery Completion</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              {metrics.overallProgress}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics.overallProgress)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Based on active aid, structural safety, & utility tickets
          </p>
        </div>

        {/* Aid Granted */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">Total Aid Approved</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            ₱{metrics.totalFundsAllocated.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Across DSWD, LGU, and emergency relief funds
          </p>
        </div>

        {/* Active Claims */}
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">Active Applications</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.total} Files
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.approved} approved • {metrics.completed} finished
          </p>
        </div>

        {/* Action Button */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-sm">Need Post-Disaster Help?</h4>
            <p className="text-xs text-blue-100 mt-1">
              Apply for shelter repair grants, structural audits, or power restore.
            </p>
          </div>
          <Button
            onClick={() => setIsApplyModalOpen(true)}
            size="sm"
            className="bg-white text-blue-700 hover:bg-blue-50 text-xs font-semibold mt-3 w-full shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            File New Recovery Application
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {["all", "Financial Aid", "Structural Safety", "Utilities", "Housing Repair"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filterCategory === cat
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {cat === "all" ? "All Applications" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredClaims.map((claim) => {
          const stepPercent = Math.round(((claim.currentStep + 1) / claim.totalSteps) * 100);

          return (
            <div
              key={claim.id}
              className="rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase">
                      {claim.category}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Ref: {claim.referenceNumber}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {claim.title}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Handled by: <strong className="text-slate-700 dark:text-slate-300">{claim.agency}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {claim.amount > 0 && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-slate-400 block font-medium">Grant Amount</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        ₱{claim.amount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_THEMES[claim.statusCode] || "bg-slate-100"}`}>
                    {claim.status}
                  </span>
                </div>
              </div>

              {/* Progress Steps Visualizer */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-500 font-medium">
                    Current Step: <strong className="text-slate-900 dark:text-white">{STEPS_MAP[claim.currentStep] || "Processing"}</strong>
                  </span>
                  <span className="text-slate-400 font-medium">{stepPercent}% completed</span>
                </div>

                {/* Step indicators */}
                <div className="grid grid-cols-5 gap-1.5">
                  {STEPS_MAP.map((stepName, sIdx) => {
                    const isDone = sIdx <= claim.currentStep;
                    const isCurrent = sIdx === claim.currentStep;

                    return (
                      <div key={stepName} className="space-y-1">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isDone
                              ? "bg-emerald-500"
                              : "bg-slate-100 dark:bg-slate-800"
                          } ${isCurrent ? "ring-2 ring-emerald-500/30 ring-offset-1" : ""}`}
                        />
                        <span className={`text-[9px] line-clamp-1 hidden sm:block ${
                          isDone ? "text-slate-700 dark:text-slate-300 font-medium" : "text-slate-400"
                        }`}>
                          {stepName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action alert box */}
              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold text-blue-900 dark:text-blue-200 block mb-0.5">
                    Next Action Required:
                  </span>
                  <span className="text-blue-800 dark:text-blue-300 leading-relaxed">
                    {claim.nextAction}
                  </span>
                </div>
                {claim.payoutVenue && (
                  <span className="hidden md:flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 shrink-0">
                    <MapPin className="w-3 h-3 text-blue-500" />
                    {claim.payoutVenue}
                  </span>
                )}
              </div>

              {/* Footer info */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Filed on {claim.dateSubmitted} • Est: {claim.estimatedCompletion}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedClaim(claim)}
                  className="text-xs h-7 px-3"
                >
                  View File Details
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DIALOG 1: FILE DETAILS MODAL */}
      {selectedClaim && (
        <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase">
                  {selectedClaim.category}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedClaim.referenceNumber}
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedClaim.title}
              </DialogTitle>
              <DialogDescription>
                Agency: {selectedClaim.agency}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Official Status:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedClaim.status}
                  </span>
                </div>
                {selectedClaim.amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Approved Aid Amount:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₱{selectedClaim.amount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Venue / Window:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedClaim.payoutVenue}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Target:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedClaim.estimatedCompletion}
                  </span>
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Application Summary & Notes:</h5>
                <p className="p-3 bg-white dark:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/60 leading-relaxed">
                  {selectedClaim.notes}
                </p>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 leading-normal">
                  All disbursements are matched against your stored PhilID or government-issued document in the Aegis Document Vault.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" onClick={() => setSelectedClaim(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG 2: APPLY FOR RECOVERY AID */}
      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <HeartHandshake className="w-5 h-5" />
              Submit Recovery Application
            </DialogTitle>
            <DialogDescription>
              Directly file an assistance request with local South Cotabato disaster recovery agencies.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateApplication} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Assistance Program / Title *
              </label>
              <Input
                required
                placeholder="e.g. DSWD Emergency Shelter Aid or Water Line Reconnection"
                value={newApp.title}
                onChange={(e) => setNewApp({ ...newApp, title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={newApp.category}
                  onChange={(e) => setNewApp({ ...newApp, category: e.target.value })}
                  className="w-full mt-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
                >
                  <option value="Financial Aid">Financial Aid / Cash Grant</option>
                  <option value="Structural Safety">Structural Inspection</option>
                  <option value="Utilities">Utility Reconnection</option>
                  <option value="Housing Repair">Building Repair Materials</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Target Agency
                </label>
                <select
                  value={newApp.agency}
                  onChange={(e) => setNewApp({ ...newApp, agency: e.target.value })}
                  className="w-full mt-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5"
                >
                  <option value="Tupi MSWDO">Tupi MSWDO</option>
                  <option value="DSWD Field Office XII">DSWD Region XII</option>
                  <option value="MDRRMO / Municipal Engineering">MDRRMO Engineers</option>
                  <option value="SOCOTECO II">SOCOTECO II Electric</option>
                  <option value="Tupi Water District">Tupi Water District</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Requested / Claim Amount (₱, if applicable)
              </label>
              <Input
                type="number"
                placeholder="e.g. 10000 (Leave 0 for utility/inspection requests)"
                value={newApp.amount}
                onChange={(e) => setNewApp({ ...newApp, amount: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Application Statement / Specific Household Needs *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Briefly state your family size, extent of home damage, or urgency of reconnection..."
                value={newApp.notes}
                onChange={(e) => setNewApp({ ...newApp, notes: e.target.value })}
                className="w-full mt-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none"
              />
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Submit Application
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
