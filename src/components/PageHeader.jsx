import React from "react";
import { cn } from "@/lib/utils";

export default function PageHeader({ title, description, icon: Icon, actions, accent }) {
  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm",
                accent === "rose" && "bg-rose-100 text-rose-600",
                accent === "amber" && "bg-amber-100 text-amber-600",
                accent === "emerald" && "bg-emerald-100 text-emerald-600",
                (!accent || accent === "blue") && "bg-blue-100 text-blue-600"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}