// @ts-nocheck
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/PageHeader";
import {
  Siren, MapPin, Phone, Users, ShieldCheck, X, Loader2, AlertCircle, CheckCircle2,
  AlertTriangle, Radio, Plus, Flame, Shield, HeartPulse,
  Megaphone, Send, Share2, Copy, MessageSquare, PhoneCall, Check
} from "lucide-react";
import {
  sendSOSAlert,
  resolveSOSAlert,
  cancelSOSAlert,
  getDeliveryResults,
  fetchEmergencyContacts,
  getSMSDispatchUrl,
  formatDialablePhone,
  launchDirectPhoneCall
} from "@/lib/sosDispatch";

// Official Emergency Hotlines for Tupi, South Cotabato & National Hotlines
const EMERGENCY_HOTLINES = [
  {
    id: "national-911",
    name: "National Emergency Hotline",
    org: "Philippine National Emergency 911",
    category: "police",
    number: "911",
    phoneUrl: "tel:911",
    smsUrl: "sms:911",
    badge: "24/7 National Dispatch",
    badgeColor: "bg-red-100 text-red-700 ring-red-200",
    description: "Instant dispatch for Police, Fire, Ambulance & Search/Rescue emergencies across the Philippines.",
    icon: Siren,
    color: "from-red-600 to-rose-700",
    borderColor: "border-red-200",
  },
  {
    id: "pnp-tupi",
    name: "PNP Tupi Municipal Police Station",
    org: "Philippine National Police - Tupi",
    category: "police",
    number: "0998-598-6734",
    landline: "(083) 226-2111",
    phoneUrl: "tel:09985986734",
    smsUrl: "sms:09985986734?body=EMERGENCY%20POLICE%20ASSISTANCE%20NEEDED",
    badge: "Police 24/7",
    badgeColor: "bg-blue-100 text-blue-700 ring-blue-200",
    description: "Direct emergency line to PNP Tupi mobile patrols, desk officers, and crime response units.",
    icon: Shield,
    color: "from-blue-600 to-indigo-700",
    borderColor: "border-blue-200",
  },
  {
    id: "bfp-tupi",
    name: "BFP Tupi Fire Station",
    org: "Bureau of Fire Protection - Tupi",
    category: "fire",
    number: "0930-245-8899",
    landline: "(083) 226-2112",
    phoneUrl: "tel:09302458899",
    smsUrl: "sms:09302458899?body=EMERGENCY%20FIRE%20OR%20RESCUE%20ASSISTANCE%20NEEDED",
    badge: "Fire & Rescue 24/7",
    badgeColor: "bg-amber-100 text-amber-800 ring-amber-200",
    description: "Fire suppression, building collapse extrication, and HAZMAT emergency operations.",
    icon: Flame,
    color: "from-amber-600 to-orange-700",
    borderColor: "border-amber-200",
  },
  {
    id: "mdrrmo-tupi",
    name: "MDRRMO Tupi Operations Center & Rescue",
    org: "Municipal Disaster Risk Reduction & Management",
    category: "disaster",
    number: "0917-882-8874",
    landline: "(083) 226-2113",
    phoneUrl: "tel:09178828874",
    smsUrl: "sms:09178828874?body=EMERGENCY%20MDRRMO%20RESCUE%20ASSISTANCE%20NEEDED",
    badge: "Disaster Rescue 24/7",
    badgeColor: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    description: "Municipal 24/7 EOC, search & rescue teams, incident command, and community evacuation dispatch.",
    icon: Radio,
    color: "from-emerald-600 to-teal-700",
    borderColor: "border-emerald-200",
  },
  {
    id: "rhu-ambulance",
    name: "Tupi Municipal Health Office / Ambulance",
    org: "Rural Health Unit Emergency Medical Services",
    category: "medical",
    number: "0949-123-4567",
    landline: "(083) 226-2114",
    phoneUrl: "tel:09491234567",
    smsUrl: "sms:09491234567?body=EMERGENCY%20AMBULANCE%20NEEDED",
    badge: "Medical & Ambulance",
    badgeColor: "bg-rose-100 text-rose-800 ring-rose-200",
    description: "Emergency patient transport, mobile trauma care, and municipal medical triage teams.",
    icon: HeartPulse,
    color: "from-rose-600 to-pink-700",
    borderColor: "border-rose-200",
  },
  {
    id: "red-cross",
    name: "Philippine Red Cross - South Cotabato",
    org: "South Cotabato Chapter Humanitarian Operations",
    category: "medical",
    number: "143",
    landline: "(083) 228-2300",
    phoneUrl: "tel:143",
    smsUrl: "sms:143?body=EMERGENCY%20RED%20CROSS%20ASSISTANCE",
    badge: "First Aid & Blood Services",
    badgeColor: "bg-red-100 text-red-800 ring-red-200",
    description: "Disaster relief, mobile clinic aid, emergency blood supply, and psychological first aid.",
    icon: AlertCircle,
    color: "from-red-600 to-rose-700",
    borderColor: "border-red-200",
  },
  {
    id: "ndrrmc-national",
    name: "NDRRMC Operations Center",
    org: "Office of Civil Defense National Center",
    category: "disaster",
    number: "(02) 8911-1406",
    landline: "(02) 8911-5061",
    phoneUrl: "tel:0289111406",
    smsUrl: "sms:0289111406?body=EMERGENCY%20NDRRMC%20ALERT",
    badge: "National Disaster Office",
    badgeColor: "bg-purple-100 text-purple-800 ring-purple-200",
    description: "National seismic alerts, major earthquake situation monitoring, and inter-regional defense aid.",
    icon: Megaphone,
    color: "from-purple-600 to-indigo-800",
    borderColor: "border-purple-200",
  }
];

export default function SOS() {
  const { user, updateUser } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeSos, setActiveSos] = useState(null);
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deliveryList, setDeliveryList] = useState([]);
  const [settingUpHousehold, setSettingUpHousehold] = useState(false);
  const [hotlineFilter, setHotlineFilter] = useState("all");
  const [copiedId, setCopiedId] = useState(null);
  const [lastDispatchedSmsUrl, setLastDispatchedSmsUrl] = useState(null);

  // Load contacts and active SOS status
  const loadData = useCallback(async () => {
    try {
      // Fetch emergency contacts for this user (household or personal)
      const contactList = await fetchEmergencyContacts(user?.household_id, user?.id);
      setContacts(contactList || []);

      if (user?.household_id) {
        const [hh, sosList] = await Promise.all([
          base44.entities.Household.get(user.household_id).catch(() => null),
          base44.entities.SOSAlert.filter(
            { household_id: user.household_id, status: "active" },
            "-created_date",
            1
          ).catch(() => []),
        ]);
        setHousehold(hh);
        const active = sosList?.[0] || null;
        setActiveSos(active);
        if (active) {
          setDeliveryList(getDeliveryResults(active.id));
        }
      } else {
        // Check if there is an active SOS by this user
        try {
          const userSos = await base44.entities.SOSAlert.filter(
            { status: "active" },
            "-created_date",
            10
          ).catch(() => []);
          const mySos = userSos.find(
            s => String(s.created_by_id) === String(user?.id) || String(s.sender_id) === String(user?.id)
          );
          if (mySos) {
            setActiveSos(mySos);
            setDeliveryList(getDeliveryResults(mySos.id));
          }
        } catch { /* non-critical */ }
      }
    } catch (e) {
      console.error("SOS loadData error:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.household_id, user?.id]);

  useEffect(() => {
    loadData();
    // Subscribe to SOS alert updates
    const unsub = base44.entities.SOSAlert.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, [loadData]);

  // Quick 1-click personal household setup if missing
  const handleQuickSetupHousehold = async () => {
    setSettingUpHousehold(true);
    try {
      const defaultName = `${user?.full_name || user?.name || "Personal"}'s Household`;
      const createdHh = await base44.entities.Household.create({
        name: defaultName,
        address: "Home Location",
        evacuation_meeting_point: "Designated Community Open Space",
        member_user_ids: [user?.id],
      });
      await base44.auth.updateMe({ household_id: createdHh.id });
      if (updateUser) {
        updateUser({ ...user, household_id: createdHh.id });
      }
      setHousehold(createdHh);
      await loadData();
    } catch (err) {
      alert("Failed to initialize household: " + err.message);
    } finally {
      setSettingUpHousehold(false);
    }
  };

  // Trigger Native SOS & Dispatch Phone Notifications to All Recipients
  const handleSendSOS = async (callTarget = 'recipient') => {
    setSending(true);
    try {
      const { alert, deliveryResults, alertMessage, smsUrl, gps } = await sendSOSAlert({
        user,
        householdId: user?.household_id || 'unassigned',
        customMessage: customMessage.trim() || undefined,
      });

      setActiveSos(alert);
      setDeliveryList(deliveryResults || []);
      setConfirmOpen(false);
      setCustomMessage("");
      setLastDispatchedSmsUrl(smsUrl);

      // Launch immediate phone call directly without errors
      if (callTarget === 'recipient' && contacts.length > 0 && contacts[0]?.phone) {
        launchDirectPhoneCall(contacts[0].phone);
      } else if (callTarget === '911') {
        launchDirectPhoneCall('911');
      } else if (callTarget === 'sms' && smsUrl && smsUrl !== '#') {
        try {
          window.location.href = smsUrl;
        } catch (err) {
          console.warn("Could not auto-open SMS URL:", err);
        }
      }
    } catch (e) {
      console.error("SOS dispatch failed:", e);
      alert("Failed to send SOS: " + e.message + ". Please dial 911 directly!");
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    if (!activeSos) return;
    setActionLoading(true);
    try {
      await resolveSOSAlert({ alertId: activeSos.id, user, reason: "User tapped I'm safe now" });
      setActiveSos(null);
      setDeliveryList([]);
      setLastDispatchedSmsUrl(null);
    } catch (e) {
      console.error("Resolve SOS failed:", e);
      alert("Failed to update status: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeSos) return;
    if (!confirm("Are you sure you want to cancel this SOS alert (report false alarm)?")) return;
    setActionLoading(true);
    try {
      await cancelSOSAlert({ alertId: activeSos.id, user, reason: "Cancelled by user as false alarm" });
      setActiveSos(null);
      setDeliveryList([]);
      setLastDispatchedSmsUrl(null);
    } catch (e) {
      console.error("Cancel SOS failed:", e);
      alert("Failed to cancel alert: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Native Web Share to phone contacts
  const handleShareToPhoneApps = async () => {
    if (!activeSos) return;
    const shareText = `🚨 EMERGENCY SOS ALERT! ${user?.full_name || 'Resident'} needs urgent assistance! Location: ${activeSos.location_label || 'Tupi'}. GPS: ${activeSos.location_lat?.toFixed(5)}, ${activeSos.location_lng?.toFixed(5)}. Live Map: https://maps.google.com/?q=${activeSos.location_lat},${activeSos.location_lng}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "🚨 AEGIS Emergency SOS Alert",
          text: shareText,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    } else {
      navigator.clipboard?.writeText(shareText);
      alert("Emergency distress message copied to clipboard! You can paste and send it to your contacts.");
    }
  };

  // Generate dynamic SMS link for all contacts
  const masterSmsUrl = useMemo(() => {
    if (!contacts || contacts.length === 0) return '#';
    const phones = contacts.map(c => c.phone).filter(Boolean);
    const text = activeSos 
      ? `🚨 EMERGENCY SOS! ${user?.full_name || 'Resident'} needs immediate help! Location: ${activeSos.location_label || 'Current location'}. GPS: ${activeSos.location_lat?.toFixed(5)}, ${activeSos.location_lng?.toFixed(5)}. Map: https://maps.google.com/?q=${activeSos.location_lat},${activeSos.location_lng}`
      : `🚨 EMERGENCY SOS! ${user?.full_name || 'Resident'} has activated an AEGIS emergency beacon and requires immediate help!`;
    return getSMSDispatchUrl(phones, text);
  }, [contacts, activeSos, user]);

  // Filtered emergency hotlines
  const filteredHotlines = useMemo(() => {
    if (hotlineFilter === "all") return EMERGENCY_HOTLINES;
    return EMERGENCY_HOTLINES.filter(h => h.category === hotlineFilter);
  }, [hotlineFilter]);

  const hasHousehold = !!user?.household_id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <PageHeader
        title="Emergency SOS"
        description="Instant broadcast to your household, emergency contacts, and community responders"
        icon={Siren}
        accent="rose"
      />

      {!hasHousehold && !loading && !activeSos && (
        <div className="rounded-3xl border border-white/50 bg-white/60 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Set Up Household Dispatch</h4>
                <p className="text-xs text-slate-600">Connect your contacts for complete multi-channel emergency routing.</p>
              </div>
            </div>
            <Button
              onClick={handleQuickSetupHousehold}
              disabled={settingUpHousehold}
              className="bg-blue-600 hover:bg-blue-700 text-xs font-bold shrink-0"
            >
              {settingUpHousehold ? (
                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Setting up...</>
              ) : (
                <><Plus className="mr-1.5 h-3.5 w-3.5" />Initialize Household</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ACTIVE SOS BEACON STATE */}
      {activeSos ? (
        <div className="overflow-hidden rounded-3xl border-2 border-rose-400/80 bg-rose-50/70 shadow-2xl backdrop-blur-xl">
          <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 px-6 py-6 text-center text-white shadow-inner">
            <div className="mx-auto mb-3 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-white/20 ring-8 ring-white/10 backdrop-blur-md">
              <Siren className="h-10 w-10 text-white" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
              <Radio className="h-3.5 w-3.5 animate-spin" /> Active Emergency Beacon
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">SOS Beacon Broadcasting Live</h2>
            <p className="mt-1 text-sm text-rose-100 max-w-md mx-auto">
              Your live location is active on the Community Map and all saved phone numbers have been queued for notification.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Phone Dispatch Direct Trigger Banner */}
            {contacts.length > 0 && (
              <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                      <PhoneCall className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        📱 Phone Notification Ready for {contacts.length} Contact(s)
                      </h4>
                      <p className="text-xs text-emerald-800">
                        Tap below to immediately launch your phone's messaging app with GPS coordinates pre-filled.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <a
                      href={masterSmsUrl}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Dispatch SMS Now
                    </a>
                    <Button
                      onClick={handleShareToPhoneApps}
                      variant="outline"
                      className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold py-2.5"
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1" />
                      Share to Phone Apps
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Location card */}
            <div className="flex items-start gap-3.5 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Captured Location</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    activeSos.location_lat ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {activeSos.location_lat ? "GPS Verified" : "Location Pending"}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{activeSos.location_label || "Location unavailable"}</p>
                {activeSos.location_lat && (
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    Coordinates: {activeSos.location_lat?.toFixed(5)}, {activeSos.location_lng?.toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            {/* Custom Message Card */}
            {activeSos.message && (
              <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Distress Message</p>
                <p className="mt-1 text-sm font-medium text-slate-800 italic">"{activeSos.message}"</p>
              </div>
            )}

            {/* Contact Delivery & Direct Phone Action Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Recipient Phone Dispatch ({contacts.length})
                </p>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Direct Dial & SMS Ready
                </span>
              </div>

              {contacts.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-800">
                  <AlertTriangle className="mr-1.5 inline h-4 w-4" />
                  No specific personal contacts were registered. Beacon is published to AEGIS Community Map and logged to emergency incident registry.
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {contacts.map((c) => {
                    const cleanPhone = formatDialablePhone(c.phone);
                    const alertMsg = `🚨 EMERGENCY SOS! ${user?.full_name || 'Resident'} needs immediate help! Location: ${activeSos?.location_label || 'Current Location'}. GPS: ${activeSos?.location_lat?.toFixed(5)}, ${activeSos?.location_lng?.toFixed(5)}. Map: https://maps.google.com/?q=${activeSos?.location_lat},${activeSos?.location_lng}`;
                    const contactSms = cleanPhone ? getSMSDispatchUrl(cleanPhone, alertMsg) : '#';

                    return (
                      <li
                        key={c.id}
                        className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur-xl transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                              {c.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{c.name}</p>
                              <p className="text-xs text-slate-600 font-mono flex items-center gap-1">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {c.phone} · <span className="font-sans text-slate-500">{c.relationship || "Contact"}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {cleanPhone && (
                              <>
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
                                  title="Open in Phone app dialer"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                  Call
                                </a>
                                <a
                                  href={contactSms}
                                  className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                                  title="Open in Phone SMS app with distress GPS text"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  SMS
                                </a>
                              </>
                            )}
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                              {c.priority || "contact"}
                            </span>
                          </div>
                        </div>

                        {/* Channel Delivery Status Breakdown */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>In-App Beacon: <strong>Live on Map & Queued</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Phone Notification: <strong>Dispatched to {c.phone}</strong></span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Primary Recipient Quick-Call Shortcut Banner */}
            {contacts.length > 0 && contacts[0]?.phone && (
              <div className="rounded-2xl bg-blue-50/90 border border-blue-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 block">Primary Emergency Contact Recipient</span>
                    <p className="text-sm font-bold text-blue-950">{contacts[0].name} ({contacts[0].relationship || "Contact"})</p>
                    <p className="text-xs font-mono text-blue-700">{contacts[0].phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={`tel:${formatDialablePhone(contacts[0].phone)}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                    title={`Call ${contacts[0].name} directly`}
                  >
                    <Phone className="h-4 w-4" />
                    Call {contacts[0].name}
                  </a>
                  <a
                    href={getSMSDispatchUrl(contacts[0].phone, `EMERGENCY SOS: I need help at ${activeSos?.location_label || "current location"}. View: https://maps.google.com/?q=${activeSos?.location_lat || ""},${activeSos?.location_lng || ""}`)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
                    title={`Send emergency SMS to ${contacts[0].name}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    SMS
                  </a>
                </div>
              </div>
            )}

            {/* Resolve & Direct Dial Actions */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                variant="success"
                onClick={handleResolve}
                disabled={actionLoading}
                className="flex-1 py-6 text-sm font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {actionLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
                ) : (
                  <><ShieldCheck className="mr-2 h-5 w-5" />I'm safe now (Resolve)</>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 py-6 text-sm font-semibold border-rose-300 text-rose-700 hover:bg-rose-100"
              >
                <X className="mr-2 h-4 w-4" />Cancel / False Alarm
              </Button>

              <a href="tel:911" className="flex-1">
                <Button variant="destructive" className="w-full py-6 text-sm font-bold shadow-md bg-rose-700 hover:bg-rose-800">
                  <Phone className="mr-2 h-5 w-5" />Call 911 Directly
                </Button>
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* IDLE SOS STATE */
        <div className="flex flex-col items-center py-4">
          <p className="mb-6 max-w-md text-center text-sm font-medium text-slate-600">
            Press the SOS beacon below to alert your emergency contacts on their phone with your live GPS location and broadcast an emergency signal to the community map.
          </p>

          {/* Pulsing SOS Button */}
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={loading}
            className="group relative flex h-60 w-60 items-center justify-center rounded-full bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 shadow-2xl shadow-rose-600/40 transition-all duration-300 hover:scale-105 hover:shadow-rose-600/60 active:scale-95 disabled:opacity-50 border-4 border-white/30 backdrop-blur-xl"
            aria-label="Activate Emergency SOS"
          >
            {/* Pulsing ring */}
            <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/30" />
            <span className="absolute inset-3 rounded-full bg-rose-600/90 ring-4 ring-white/20 backdrop-blur-md shadow-inner" />

            <span className="relative flex flex-col items-center z-10 text-white">
              <Siren className="h-16 w-16 drop-shadow-lg" strokeWidth={2.5} />
              <span className="mt-2 text-3xl font-black tracking-wider drop-shadow-md">SOS</span>
              <span className="mt-1 text-xs font-bold uppercase tracking-widest text-rose-100">
                Tap to Alert
              </span>
            </span>
          </button>

          {/* Recipients Warning if empty */}
          {contacts.length === 0 && !loading && (
            <div className="mt-8 flex items-center gap-3 rounded-2xl bg-amber-50/80 border border-amber-300/60 px-5 py-3.5 text-xs text-amber-800 shadow-md backdrop-blur-md max-w-md">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">No emergency contacts yet</p>
                <p className="mt-0.5 text-amber-700">Add emergency contacts so they are instantly dispatched when you tap SOS.</p>
                <a href="/contacts" className="mt-1.5 inline-block font-bold text-blue-700 hover:underline">
                  + Add emergency contacts →
                </a>
              </div>
            </div>
          )}

          {/* Emergency Recipients Summary Card */}
          <div className="mt-8 w-full max-w-xl rounded-2xl border border-white/60 bg-white/70 p-5 shadow-lg backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-4 w-4 text-slate-500" />
                Emergency Recipients ({contacts.length})
              </h3>
              <a href="/contacts" className="text-xs font-semibold text-blue-600 hover:underline">
                Manage
              </a>
            </div>

            {contacts.length === 0 ? (
              <p className="text-xs text-slate-400">No personal contacts registered yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {contacts.map((c) => {
                  const cleanPhone = formatDialablePhone(c.phone);
                  const quickMsg = `EMERGENCY ALERT: This is an emergency safety check-in from ${user?.full_name || 'Resident'} via AEGIS.`;

                  return (
                    <li
                      key={c.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Phone className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900">{c.name}</span>
                          <span className="text-slate-400 ml-1.5">· {c.relationship || "contact"}</span>
                          <p className="font-mono text-[11px] text-slate-500">{c.phone}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {cleanPhone && (
                          <>
                            <a
                              href={`tel:${cleanPhone}`}
                              className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-bold transition-all"
                              title="Directly launch phone call"
                            >
                              <Phone className="h-3 w-3" />
                              Call
                            </a>
                            <a
                              href={getSMSDispatchUrl(cleanPhone, quickMsg)}
                              className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold transition-all"
                              title="Directly launch SMS on phone"
                            >
                              <MessageSquare className="h-3 w-3" />
                              SMS
                            </a>
                          </>
                        )}
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {c.priority}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* OFFICIAL EMERGENCY HOTLINES DIRECTORY */}
      <section className="mt-8 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600 font-bold">
                <Siren className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Official Emergency Hotlines</h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Tap any number below to directly open your phone's contact and calling app.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200 text-xs">
            {[
              { id: "all", label: "All Hotlines" },
              { id: "police", label: "Police (911)" },
              { id: "fire", label: "Fire & Rescue" },
              { id: "medical", label: "Medical / Ambulance" },
              { id: "disaster", label: "MDRRMO / Disaster" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setHotlineFilter(tab.id)}
                className={`py-1.5 px-3 rounded-xl font-semibold transition-all ${
                  hotlineFilter === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hotlines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHotlines.map((hotline) => {
            const IconComponent = hotline.icon;
            const isCopied = copiedId === hotline.id;

            return (
              <div
                key={hotline.id}
                className={`relative flex flex-col justify-between rounded-2xl border ${hotline.borderColor} bg-white p-4 shadow-sm hover:shadow-md transition-all`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${hotline.color} text-white shadow-sm`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{hotline.name}</h4>
                        <p className="text-[11px] text-slate-500">{hotline.org}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${hotline.badgeColor}`}>
                      {hotline.badge}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {hotline.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Primary Hotline</span>
                      <span className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                        {hotline.number}
                      </span>
                    </div>
                    {hotline.landline && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Landline</span>
                        <a
                          href={`tel:${hotline.landline.replace(/[^\d+]/g, '')}`}
                          className="text-xs font-semibold text-slate-700 hover:text-blue-600 hover:underline font-mono inline-flex items-center gap-1"
                          title={`Call landline ${hotline.landline}`}
                        >
                          <Phone className="h-2.5 w-2.5 text-slate-400" />
                          {hotline.landline}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Action Buttons: Connects straight to phone app */}
                <div className="mt-4 flex items-center gap-2 pt-2 border-t border-slate-100">
                  <a
                    href={hotline.phoneUrl}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 active:scale-95 transition-all"
                    title="Directly launch call in your phone's dialer"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call {hotline.number}
                  </a>

                  {hotline.smsUrl && (
                    <a
                      href={hotline.smsUrl}
                      className="inline-flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all"
                      title="Send SMS message from your phone"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      SMS
                    </a>
                  )}

                  <button
                    onClick={() => handleCopy(hotline.id, hotline.number)}
                    className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition-all"
                    title="Copy number to clipboard"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CONFIRMATION DIALOG */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[95vw] sm:max-w-lg glass-frosted border-white/50 shadow-2xl p-6 sm:p-7">
          <DialogHeader className="sm:text-center flex flex-col items-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-lg shadow-rose-500/30 text-white">
              <Siren className="h-7 w-7" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-slate-900">
              Activate Emergency SOS?
            </DialogTitle>
            <DialogDescription className="text-center text-slate-600 text-xs">
              This will capture your real-time GPS location, notify your {contacts.length} saved emergency recipient(s) on their phone, and broadcast a live beacon on the Community Map.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 w-full">
            {/* Recipients Preview */}
            <div className="rounded-xl bg-blue-50/80 border border-blue-200 p-3">
              <p className="text-xs font-bold text-blue-900 flex items-center gap-1 mb-1.5">
                <Users className="h-3.5 w-3.5 text-blue-700" />
                Phone Notifications Will Be Sent To:
              </p>
              {contacts.length === 0 ? (
                <p className="text-[11px] text-blue-700 italic">
                  No personal contacts saved. The alert will still be broadcast to the community map and emergency responders.
                </p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {contacts.map((c) => (
                    <li key={c.id} className="flex items-center justify-between text-blue-900 font-medium">
                      <span>• {c.name}</span>
                      <span className="font-mono text-[11px] text-blue-700">{c.phone || "No phone"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Emergency Situation Note (Optional):
              </label>
              <Textarea
                placeholder="Describe your situation (e.g., trapped, injured, building cracked)..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={2}
                className="text-xs bg-white/80 w-full"
              />
            </div>

            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[11px] text-rose-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                Emergency Delivery Notice:
              </p>
              <p>• Clicking confirm will generate an instant phone dispatch and live community beacon.</p>
              <p>• For immediate life-saving rescue, you can also dial <strong>911</strong> directly.</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-col sm:space-x-0 gap-2.5 pt-2 w-full">
            {contacts.length > 0 && contacts[0]?.phone && (
              <Button
                variant="default"
                onClick={() => handleSendSOS('recipient')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md font-bold py-5 text-sm active:scale-95"
                disabled={sending}
              >
                {sending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating & Calling...</>
                ) : (
                  <><Phone className="mr-2 h-4 w-4" />Trigger SOS & Call {contacts[0].name} Directly</>
                )}
              </Button>
            )}

            <div className="flex gap-2 w-full">
              <Button
                variant="destructive"
                onClick={() => handleSendSOS('broadcast')}
                className="flex-1 bg-rose-600 hover:bg-rose-700 shadow-md font-bold py-5 text-xs active:scale-95"
                disabled={sending}
              >
                {sending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating...</>
                ) : (
                  <><Siren className="mr-1.5 h-4 w-4" />Broadcast Alert Only</>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="py-5 text-xs px-4"
                disabled={sending}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
