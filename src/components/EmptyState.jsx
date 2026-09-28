import React from "react";

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/40 bg-white/55 px-6 py-16 text-center backdrop-blur-xl backdrop-saturate-150">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}