import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Backpack, Plus, Trash2, Pencil, AlertTriangle, CheckCircle2,
  ShieldCheck, Droplets, Pill, Wrench, FileText, Shirt, User,
  Clock, Package, Sparkles, ChevronRight, RefreshCw
} from "lucide-react";

const STORAGE_KEY = "aegis_gobag_items";
const CHECKLIST_KEY = "aegis_preparedness_checklist";

const CATEGORIES = [
  { id: "water_food", label: "Water & Food", icon: Droplets, color: "blue" },
  { id: "first_aid", label: "First Aid", icon: Pill, color: "rose" },
  { id: "tools", label: "Tools & Lights", icon: Wrench, color: "amber" },
  { id: "documents", label: "Documents", icon: FileText, color: "indigo" },
  { id: "clothing", label: "Clothing & Shelter", icon: Shirt, color: "emerald" },
  { id: "personal", label: "Personal & Hygiene", icon: User, color: "purple" },
];

const CATEGORY_COLORS = {
  blue: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200", icon: "text-blue-600", iconBg: "bg-blue-100" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", icon: "text-rose-600", iconBg: "bg-rose-100" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", icon: "text-amber-600", iconBg: "bg-amber-100" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-200", icon: "text-indigo-600", iconBg: "bg-indigo-100" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", icon: "text-emerald-600", iconBg: "bg-emerald-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200", icon: "text-purple-600", iconBg: "bg-purple-100" },
};

const DEFAULT_ITEMS = [
  { id: "1", name: "Drinking Water (3L per person)", category: "water_food", quantity: 0, needed: 3, expiryDate: "", notes: "1 liter per person per day for 3 days" },
  { id: "2", name: "Canned Goods / Ready-to-Eat Food", category: "water_food", quantity: 0, needed: 6, expiryDate: "", notes: "Non-perishable, easy-open cans" },
  { id: "3", name: "Energy Bars / Crackers", category: "water_food", quantity: 0, needed: 6, expiryDate: "", notes: "" },
  { id: "4", name: "First Aid Kit", category: "first_aid", quantity: 0, needed: 1, expiryDate: "", notes: "Bandages, antiseptic, gauze, tape" },
  { id: "5", name: "Prescription Medications", category: "first_aid", quantity: 0, needed: 1, expiryDate: "", notes: "At least 7-day supply" },
  { id: "6", name: "Pain Relievers (Paracetamol)", category: "first_aid", quantity: 0, needed: 1, expiryDate: "", notes: "" },
  { id: "7", name: "Flashlight + Extra Batteries", category: "tools", quantity: 0, needed: 2, expiryDate: "", notes: "LED flashlight recommended" },
  { id: "8", name: "Whistle", category: "tools", quantity: 0, needed: 1, expiryDate: "", notes: "To signal for help" },
  { id: "9", name: "Multi-Tool / Swiss Knife", category: "tools", quantity: 0, needed: 1, expiryDate: "", notes: "" },
  { id: "10", name: "Portable Radio (Battery/Crank)", category: "tools", quantity: 0, needed: 1, expiryDate: "", notes: "For emergency broadcasts" },
  { id: "11", name: "Government-Issued ID (Photocopy)", category: "documents", quantity: 0, needed: 1, expiryDate: "", notes: "Keep in waterproof bag" },
  { id: "12", name: "Insurance Documents (Photocopy)", category: "documents", quantity: 0, needed: 1, expiryDate: "", notes: "" },
  { id: "13", name: "Emergency Contact List (Printed)", category: "documents", quantity: 0, needed: 1, expiryDate: "", notes: "In case phone dies" },
  { id: "14", name: "Change of Clothes", category: "clothing", quantity: 0, needed: 1, expiryDate: "", notes: "Per family member" },
  { id: "15", name: "Rain Poncho / Jacket", category: "clothing", quantity: 0, needed: 1, expiryDate: "", notes: "" },
  { id: "16", name: "Blanket / Emergency Thermal Blanket", category: "clothing", quantity: 0, needed: 1, expiryDate: "", notes: "" },
  { id: "17", name: "Soap / Hand Sanitizer", category: "personal", quantity: 0, needed: 1, expiryDate: "", notes: "" },
  { id: "18", name: "Toothbrush & Toothpaste", category: "personal", quantity: 0, needed: 1, expiryDate: "", notes: "" },
  { id: "19", name: "Face Mask", category: "personal", quantity: 0, needed: 5, expiryDate: "", notes: "Dust protection" },
  { id: "20", name: "Cash (Small Bills & Coins)", category: "personal", quantity: 0, needed: 1, expiryDate: "", notes: "ATMs may be down" },
];

const PREPAREDNESS_CHECKLIST = [
  { id: "c1", text: "Identified safe spots in every room (under sturdy tables, away from windows)", category: "planning" },
  { id: "c2", text: "Created a household evacuation plan with meeting point", category: "planning" },
  { id: "c3", text: "All family members know the evacuation routes", category: "planning" },
  { id: "c4", text: "Emergency contacts are saved in phones and written down", category: "planning" },
  { id: "c5", text: "Go-bag is packed and accessible within 30 seconds", category: "readiness" },
  { id: "c6", text: "Heavy furniture and shelves are secured to walls", category: "structural" },
  { id: "c7", text: "Water heater is strapped to the wall", category: "structural" },
  { id: "c8", text: "Know how to shut off gas, water, and electricity", category: "knowledge" },
  { id: "c9", text: "Practiced Drop, Cover, and Hold On with family", category: "drills" },
  { id: "c10", text: "Have a plan for pets and livestock", category: "planning" },
  { id: "c11", text: "Important documents are backed up digitally", category: "readiness" },
  { id: "c12", text: "Neighbors and community emergency plan discussed", category: "community" },
];

function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(dateStr) {
  const days = daysUntilExpiry(dateStr);
  if (days === null) return { label: "No expiry set", color: "text-slate-400", urgent: false };
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, color: "text-rose-600", urgent: true };
  if (days <= 30) return { label: `Expires in ${days}d`, color: "text-amber-600", urgent: true };
  if (days <= 90) return { label: `Expires in ${days}d`, color: "text-yellow-600", urgent: false };
  return { label: `Expires in ${days}d`, color: "text-emerald-600", urgent: false };
}

export default function GoBag() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [checklist, setChecklist] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [form, setForm] = useState({ name: "", category: "water_food", quantity: 0, needed: 1, expiryDate: "", notes: "" });

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
        setItems(DEFAULT_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ITEMS));
      }
      const savedChecklist = localStorage.getItem(CHECKLIST_KEY);
      if (savedChecklist) setChecklist(JSON.parse(savedChecklist));
    } catch (e) {
      console.error(e);
      setItems(DEFAULT_ITEMS);
    }
  }, []);

  const saveItems = (newItems) => {
    setItems(newItems);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems)); } catch (e) { console.error(e); }
  };

  const saveChecklist = (newChecklist) => {
    setChecklist(newChecklist);
    try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(newChecklist)); } catch (e) { console.error(e); }
  };

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const packed = items.filter(i => i.quantity >= i.needed).length;
    const expiringSoon = items.filter(i => {
      const days = daysUntilExpiry(i.expiryDate);
      return days !== null && days <= 30;
    }).length;
    const missing = items.filter(i => i.quantity === 0).length;
    const bagScore = total > 0 ? Math.round((packed / total) * 100) : 0;

    const checklistTotal = PREPAREDNESS_CHECKLIST.length;
    const checklistDone = Object.values(checklist).filter(Boolean).length;
    const checklistScore = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;

    const overallScore = Math.round((bagScore * 0.6) + (checklistScore * 0.4));
    return { total, packed, expiringSoon, missing, bagScore, checklistTotal, checklistDone, checklistScore, overallScore };
  }, [items, checklist]);

  const filteredItems = activeCategory === "all"
    ? items
    : items.filter(i => i.category === activeCategory);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", category: "water_food", quantity: 0, needed: 1, expiryDate: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      needed: item.needed,
      expiryDate: item.expiryDate || "",
      notes: item.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      const updated = items.map(i => i.id === editing.id ? { ...i, ...form } : i);
      saveItems(updated);
    } else {
      const newItem = { id: Date.now().toString(), ...form };
      saveItems([...items, newItem]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id) => {
    saveItems(items.filter(i => i.id !== id));
  };

  const handleQuantityChange = (id, delta) => {
    const updated = items.map(i => {
      if (i.id === id) {
        return { ...i, quantity: Math.max(0, i.quantity + delta) };
      }
      return i;
    });
    saveItems(updated);
  };

  const handleResetBag = () => {
    saveItems(DEFAULT_ITEMS);
  };

  const toggleChecklistItem = (id) => {
    const updated = { ...checklist, [id]: !checklist[id] };
    saveChecklist(updated);
  };

  const getOverallColor = (score) => {
    if (score >= 80) return "emerald";
    if (score >= 50) return "amber";
    return "rose";
  };

  const overallColor = getOverallColor(stats.overallScore);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Emergency Go-Bag & Preparedness"
        description="Track your emergency supplies, monitor expiry dates, and assess your household's overall disaster readiness."
        icon={Backpack}
        accent="amber"
      />

      {/* Overall Preparedness Score */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-white/40 bg-white/40 backdrop-blur-xl backdrop-saturate-150 p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-5">
            <div className={`relative flex h-24 w-24 items-center justify-center rounded-full border-4 ${
              overallColor === "emerald" ? "border-emerald-200" : overallColor === "amber" ? "border-amber-200" : "border-rose-200"
            } bg-white/70 shadow-inner`}>
              <div className="text-center">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">{stats.overallScore}</span>
                <span className="text-[10px] font-semibold text-slate-400 block">/ 100</span>
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className={`h-4 w-4 ${
                  overallColor === "emerald" ? "text-emerald-500" : overallColor === "amber" ? "text-amber-500" : "text-rose-500"
                }`} />
                Preparedness Score
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {stats.overallScore >= 80 ? "Excellent! Your household is well-prepared." :
                 stats.overallScore >= 50 ? "Getting there. Some items and tasks still need attention." :
                 "Needs improvement. Complete your go-bag and checklist below."}
              </p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white/60 border border-slate-200/60 p-3 text-center backdrop-blur-md">
              <div className="text-lg font-bold text-slate-900">{stats.packed}</div>
              <div className="text-[10px] font-medium text-slate-500">Items Packed</div>
            </div>
            <div className="rounded-xl bg-white/60 border border-slate-200/60 p-3 text-center backdrop-blur-md">
              <div className="text-lg font-bold text-slate-900">{stats.missing}</div>
              <div className="text-[10px] font-medium text-slate-500">Missing Items</div>
            </div>
            <div className="rounded-xl bg-white/60 border border-slate-200/60 p-3 text-center backdrop-blur-md">
              <div className={`text-lg font-bold ${stats.expiringSoon > 0 ? "text-amber-600" : "text-slate-900"}`}>{stats.expiringSoon}</div>
              <div className="text-[10px] font-medium text-slate-500">Expiring Soon</div>
            </div>
            <div className="rounded-xl bg-white/60 border border-slate-200/60 p-3 text-center backdrop-blur-md">
              <div className="text-lg font-bold text-slate-900">{stats.checklistDone}/{stats.checklistTotal}</div>
              <div className="text-[10px] font-medium text-slate-500">Checklist Done</div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-600">Go-Bag Readiness</span>
              <span className="text-[11px] font-bold text-slate-700">{stats.bagScore}%</span>
            </div>
            <Progress value={stats.bagScore} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-600">Safety Checklist</span>
              <span className="text-[11px] font-bold text-slate-700">{stats.checklistScore}%</span>
            </div>
            <Progress value={stats.checklistScore} className="h-2" />
          </div>
        </div>
      </div>

      {/* Go-Bag Section */}
      <div className="mb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              Emergency Go-Bag Inventory
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track every item in your emergency go-bag. Tap +/- to update quantities.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetBag} className="text-xs border-white/50 bg-white/50">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset to Defaults
            </Button>
            <Button size="sm" onClick={openCreate} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1.5 bg-slate-200/50 p-1 rounded-xl backdrop-blur-md mb-5">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              activeCategory === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({items.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = items.filter(i => i.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                  activeCategory === cat.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Items List */}
        <div className="space-y-2">
          {filteredItems.map(item => {
            const cat = CATEGORIES.find(c => c.id === item.category);
            const colors = cat ? CATEGORY_COLORS[cat.color] : CATEGORY_COLORS.blue;
            const CatIcon = cat?.icon || Package;
            const isFull = item.quantity >= item.needed;
            const isEmpty = item.quantity === 0;
            const expiry = getExpiryStatus(item.expiryDate);

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                  isFull
                    ? "border-emerald-200 bg-emerald-50/50"
                    : isEmpty
                    ? "border-rose-200 bg-rose-50/30"
                    : "border-slate-200 bg-white/60"
                } backdrop-blur-md`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors.iconBg}`}>
                  <CatIcon className={`h-4 w-4 ${colors.icon}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isFull ? "text-emerald-800" : "text-slate-800"}`}>
                      {item.name}
                    </span>
                    {isFull && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {expiry.urgent && (
                      <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${expiry.color}`}>
                        <AlertTriangle className="h-3 w-3" />
                        {expiry.label}
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-slate-400 truncate">{item.notes}</p>
                  )}
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleQuantityChange(item.id, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors"
                  >
                    −
                  </button>
                  <div className="flex min-w-[3.5rem] items-center justify-center text-xs">
                    <span className={`font-bold ${isFull ? "text-emerald-700" : isEmpty ? "text-rose-600" : "text-slate-800"}`}>
                      {item.quantity}
                    </span>
                    <span className="text-slate-400 mx-0.5">/</span>
                    <span className="text-slate-500">{item.needed}</span>
                  </div>
                  <button
                    onClick={() => handleQuantityChange(item.id, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-slate-600 text-sm font-bold hover:bg-slate-100 transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(item)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <Package className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No items in this category</p>
              <p className="mt-0.5 text-xs text-slate-400">Add items to your go-bag inventory</p>
            </div>
          )}
        </div>
      </div>

      {/* Preparedness Checklist */}
      <div className="mb-8">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Household Preparedness Checklist
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete these safety tasks to improve your family's earthquake readiness.
          </p>
        </div>

        <div className="space-y-2">
          {PREPAREDNESS_CHECKLIST.map(item => {
            const isDone = !!checklist[item.id];
            return (
              <div
                key={item.id}
                onClick={() => toggleChecklistItem(item.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  isDone
                    ? "bg-emerald-50/70 border-emerald-200 text-slate-600"
                    : "bg-white/60 border-slate-200 hover:border-emerald-300 text-slate-800"
                } backdrop-blur-md`}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => {}}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                />
                <span className={`text-xs ${isDone ? "line-through text-slate-400" : "font-medium"}`}>
                  {item.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editing ? "Edit Go-Bag Item" : "Add Go-Bag Item"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editing ? "Update this item's details." : "Add a new item to your emergency go-bag inventory."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Item Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Canned sardines"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Category</Label>
              <Select value={form.category} onValueChange={val => setForm({ ...form, category: val })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Current Qty</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Needed Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.needed}
                  onChange={e => setForm({ ...form, needed: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Expiry Date (Optional)</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Notes (Optional)</Label>
              <Input
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Any helpful notes..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleSave} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
              {editing ? "Update Item" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
