import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2, Smile } from "lucide-react";

// Saves the photo on the user's profile AND on their map marker so everyone sees it.
async function syncAvatar(userId, url) {
  // Update user profile
  await base44.auth.updateMe({ avatar_url: url });
  
  // Update map marker if exists
  try {
    const mine = await base44.entities.UserLocation.filter({ created_by_id: userId });
    if (mine && mine.length > 0) {
      await base44.entities.UserLocation.update(mine[0].id, { 
        avatar_url: url,
        emoji: url ? null : '🧍' // Clear emoji when photo is set
      });
    }
  } catch (e) {
    console.log('No location marker to update yet');
  }
}

export default function ProfilePhotoCard({ user }) {
  const [url, setUrl] = useState(user?.avatar_url || null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await syncAvatar(user.id, file_url);
      setUrl(file_url);
      // Reload to show updated photo everywhere
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      alert("Failed to upload photo: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await syncAvatar(user.id, null);
      setUrl(null);
      // Reload to show updated avatar everywhere
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      alert("Failed to remove photo: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const initial = (user?.full_name || user?.email || "U")[0].toUpperCase();

  return (
    <div className="mb-6 rounded-2xl glass-cinematic p-6">
      <h2 className="mb-1 text-base font-semibold text-slate-900">Profile photo</h2>
      <p className="mb-4 text-xs text-slate-500">
        This photo is your icon on the Community Map — everyone can see it. 
        {url && <span className="block mt-1 text-blue-600">💡 You can also change to an emoji on the Community Map page.</span>}
      </p>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full ring-4 ring-white/80 shadow-lg">
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white">{initial}</div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={upload} />
          <Button onClick={() => inputRef.current?.click()} disabled={busy} className="bg-blue-600 hover:bg-blue-700">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            {url ? "Change photo" : "Upload photo"}
          </Button>
          {url && (
            <Button variant="outline" onClick={remove} disabled={busy} className="bg-white/50 text-rose-600">
              <Trash2 className="mr-2 h-4 w-4" />Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}