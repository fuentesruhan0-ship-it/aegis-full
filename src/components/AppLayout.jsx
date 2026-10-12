import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  admin: "rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100/80 backdrop-blur-xl text-slate-700 shadow-[2px_2px_4px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.8)]",
  resident: "rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100/80 backdrop-blur-xl text-blue-700 shadow-[2px_2px_4px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.8)]",
  student: "rounded-full px-2 py-0.5 text-[10px] font-semibold bg-indigo-100/80 backdrop-blur-xl text-indigo-700 shadow-[2px_2px_4px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.8)]",
  lgu: "rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100/80 backdrop-blur-xl text-amber-700 shadow-[2px_2px_4px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.8)]",
  drrmo: "rounded-full px-2 py-0.5 text-[10px] font-semibold bg-orange-100/80 backdrop-blur-xl text-orange-700 shadow-[2px_2px_4px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.8)]",
  volunteer: "rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100/80 backdrop-blur-xl text-emerald-700 shadow-[2px_2px_4px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.8)]",
  responder: "rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-100/80 backdrop-blur-xl text-red-700 shadow-[2px_2px_4px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.8)]",
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
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const role = user?.role || "resident";
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  const handleLogout = async () => {
    setLogoutDialogOpen(false);
    await logout(false);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo - Enhanced with Clay Shield */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-[8px_8px_16px_rgba(0,0,0,0.3),-4px_-4px_12px_rgba(59,130,246,0.3)]">
          <Shield className="h-6 w-6 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">AEGIS</h1>
          <p className="text-[11px] font-medium uppercase tracking-wider text-blue-300">
            Earthquake Safety
          </p>
        </div>
      </div>

      {/* Nav - Premium Glass Navigation */}
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
                    item.urgent
                      ? cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                          isActive
                            ? "text-white font-semibold bg-gradient-to-r from-rose-600/20 to-rose-500/10 backdrop-blur-xl border-l-4 border-rose-400 shadow-[4px_4px_12px_rgba(244,63,94,0.2),-2px_-2px_8px_rgba(255,255,255,0.05)] active:scale-98"
                            : "text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 hover:translate-x-1 active:scale-98"
                        )
                      : cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                          isActive
                            ? "text-white font-semibold bg-gradient-to-r from-blue-600/20 to-blue-500/10 backdrop-blur-xl border-l-4 border-blue-400 shadow-[4px_4px_12px_rgba(0,0,0,0.12),-2px_-2px_8px_rgba(255,255,255,0.05)] active:scale-98"
                            : "text-slate-400 hover:bg-white/10 hover:text-white hover:translate-x-1 active:scale-98"
                        )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300",
                          item.urgent
                            ? isActive
                              ? "bg-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                              : "bg-white/5 group-hover:bg-rose-500/10"
                            : isActive
                            ? "bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                            : "bg-white/5 group-hover:bg-white/10"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            item.urgent && (isActive ? "text-rose-400" : "text-rose-400")
                          )}
                        />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      {item.urgent && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-[2px_2px_6px_rgba(0,0,0,0.2),-1px_-1px_4px_rgba(244,63,94,0.2)]",
                            isActive
                              ? "bg-rose-500/30 text-rose-200"
                              : "bg-rose-500/20 text-rose-300"
                          )}
                        >
                          SOS
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User card - Enhanced Glass Profile */}
      <div className="border-t border-white/10 p-3">
        <div className="rounded-xl bg-slate-800/40 backdrop-blur-xl border border-white/5 p-3 shadow-[4px_4px_12px_rgba(0,0,0,0.2),-2px_-2px_8px_rgba(255,255,255,0.02)]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white shadow-[4px_4px_8px_rgba(0,0,0,0.2),-2px_-2px_6px_rgba(59,130,246,0.2)]">
              {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white" title={user?.full_name || user?.email}>
                {user?.full_name || user?.email}
              </p>
              <span className={cn(ROLE_COLORS[role] || ROLE_COLORS.resident)}>
                {ROLE_LABELS[role] || role}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLogoutDialogOpen(true)}
            className="mt-2 w-full justify-start text-slate-400 hover:bg-white/5 hover:text-white rounded-lg transition-all duration-200"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50/30 via-white to-indigo-50/30 relative">
      {/* Radial gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-100/20 via-transparent to-transparent pointer-events-none" />

      {/* Desktop sidebar - Enhanced Navy Gradient */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-2xl backdrop-saturate-150 border-r border-white/10 shadow-2xl shadow-slate-950/20 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer - Enhanced */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-2xl shadow-2xl animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white z-10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64 relative z-10">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/40 bg-gradient-to-b from-white/90 to-white/80 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 lg:hidden shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span className="font-bold tracking-tight text-slate-900">AEGIS</span>
          </div>
          <NavLink
            to="/sos"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-600 text-white shadow-md shadow-rose-600/30 active:scale-95 transition-transform"
          >
            <Siren className="h-4 w-4" />
          </NavLink>
        </header>

        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30">
                <LogOut className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900">Sign Out</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600">
              Are you sure you want to sign out of your account? You'll need to log in again to access your emergency contacts and safety features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setLogoutDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Yes, Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
