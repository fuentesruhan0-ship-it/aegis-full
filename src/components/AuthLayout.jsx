// @ts-nocheck
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Back to Landing link */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          to="/landing"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-white/60 backdrop-blur-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing</span>
        </Link>
        <Link to="/landing" className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors">
          <img src="/logo.png" alt="AEGIS Logo" className="w-6 h-6 object-contain" />
          <span>AEGIS</span>
        </Link>
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-950 shadow-xl shadow-cyan-500/20 mb-4 p-2.5 border border-cyan-500/30">
            <img src="/logo.png" alt="AEGIS Logo" className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-slate-500 text-sm mt-1.5">{subtitle}</p>}
        </div>
        <div className="rounded-3xl border border-white/60 bg-white/70 shadow-xl shadow-slate-900/10 backdrop-blur-2xl backdrop-saturate-150 p-6 sm:p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-slate-500 mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}