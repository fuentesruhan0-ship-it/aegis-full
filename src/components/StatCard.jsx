import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, sublabel, accent }) {
  const accents = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <div className="rounded-2xl border border-white/40 bg-white/55 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-xl backdrop-saturate-150 transition-all hover:bg-white/70 hover:shadow-xl">
      <div className="flex items-center justify-between">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl ring-1", accents[accent] || accents.slate)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-600">{label}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}