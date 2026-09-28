import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Shield, LayoutDashboard, Siren, Home, Users, Phone, Bot,
  AlertTriangle, Megaphone, UserCircle, Menu, X, LogOut, ChevronRight, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS = {
  admin: "Administrator",
  resident: "Resident",
  student: "Student",
  lgu: "LGU Staff",
  drrmo: "DRRMO Staff",
  volunteer: "Volunteer",
  responder: "Emergency Responder",
};

const ROLE_COLORS = {
  admin: "bg-slate-100 text-slate-700",
  resident: "bg-blue-50 text-blue-700",
  student: "bg-indigo-50 text-indigo-700",
  lgu: "bg-amber-50 text-amber-700",
  drrmo: "bg-orange-50 text-orange-700",
  volunteer: "bg-emerald-50 text-emerald-700",
  responder: "bg-red-50 text-red-700",
};

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: null },
  { to: "/sos", label: "Emergency SOS", icon: Siren, roles: null, urgent: true },
  { to: "/household", label: "My Household", icon: Home, roles: ["resident", "student", "admin"] },
  { to: "/contacts", label: "Emergency Contacts", icon: Phone, roles: ["resident", "student", "admin"] },
  { to: "/assistant", label: "AI Assistant", icon: Bot, roles: null },
  { to: "/map", label: "Community Map", icon: MapPin, roles: null },
  { to: "/hazards", label: "Hazard Reports", icon: AlertTriangle, roles: null },
  { to: "/announcements", label: "Announcements", icon: Megaphone, roles: null },
  { to: "/profile", label: "Profile & Settings", icon: UserCircle, roles: null },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role || "resident";
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  const handleLogout = () => {
    logout(false);
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-blue-900/40">
          <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">AEGIS</h1>
          <p className="text-[11px] font-medium uppercase tracking-wider text-sky-300/80">
            Earthquake Safety
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Menu
        </p>
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-slate-400 hover:bg-white/5 hover:text-white",
                      item.urgent && !isActive && "text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                    )
                  }
                >
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", item.urgent && "text-rose-400")} />
                  <span className="flex-1">{item.label}</span>
                  {item.urgent && (
                    <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-300">
                      SOS
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User card */}
      <div className="border-t border-white/10 p-3">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-sm font-semibold text-white">
              {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user?.full_name || user?.email}
              </p>
              <span
                className={cn(
                  "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  ROLE_COLORS[role] || ROLE_COLORS.resident
                )}
              >
                {ROLE_LABELS[role] || role}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="mt-2 w-full justify-start text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-150 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-slate-900/60 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/30 bg-white/50 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="font-bold tracking-tight text-slate-900">AEGIS</span>
          </div>
          <NavLink
            to="/sos"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white shadow-md shadow-rose-600/30"
          >
            <Siren className="h-4 w-4" />
          </NavLink>
        </header>

        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}