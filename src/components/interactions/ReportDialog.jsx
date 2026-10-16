// @ts-nocheck
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, Flag, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { flagContent, FLAG_REASONS } from '@/lib/interactions';

const REASON_OPTIONS = [
  { value: FLAG_REASONS.MISINFORMATION, label: 'False Information / Rumors', desc: 'Inaccurate hazard, road, or weather claims' },
  { value: FLAG_REASONS.SPAM, label: 'Spam or Promotional', desc: 'Commercial ads, irrelevant promotions, or bot clutter' },
  { value: FLAG_REASONS.HARASSMENT, label: 'Harassment or Hostility', desc: 'Insults, abusive remarks, or threatening language' },
  { value: FLAG_REASONS.INAPPROPRIATE, label: 'Inappropriate Content', desc: 'Graphic, vulgar, or offensive community content' },
  { value: FLAG_REASONS.OTHER, label: 'Other Safety Concern', desc: 'General community guidelines violation' },
];

export default function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  targetTitle = '',
  currentUser,
}) {
  const [reason, setReason] = useState(FLAG_REASONS.MISINFORMATION);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleClose = () => {
    if (submitting) return;
    onOpenChange(false);
    // Reset state after dialog animation
    setTimeout(() => {
      setSuccess(false);
      setErrorMsg('');
      setDetails('');
      setReason(FLAG_REASONS.MISINFORMATION);
    }, 200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetType || !targetId) return;

    if (!currentUser) {
      setErrorMsg('Please sign in to report content.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await flagContent({
        targetType,
        targetId,
        reason,
        details,
        reporter: {
          id: currentUser.id,
          name: currentUser.name || currentUser.email?.split('@')[0] || 'Community Member',
          role: currentUser.role || 'resident',
        },
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl">
        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">Report Submitted</DialogTitle>
            <DialogDescription className="text-xs text-slate-600 max-w-xs mx-auto">
              Thank you for keeping Tupi safe. Our MDRRMO moderation team will review this item promptly.
            </DialogDescription>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 ring-2 ring-rose-200">
                  <Flag className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">
                    Report Content to Moderators
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    {targetTitle ? `Item: "${targetTitle.slice(0, 40)}..."` : 'Help keep community feeds credible and safe.'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Reason Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Why are you reporting this?
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {REASON_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      reason === opt.value
                        ? 'border-blue-500 bg-blue-50/70 shadow-sm'
                        : 'border-slate-200 hover:bg-slate-50/80 bg-white/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      value={opt.value}
                      checked={reason === opt.value}
                      onChange={() => setReason(opt.value)}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{opt.label}</p>
                      <p className="text-[11px] text-slate-500 leading-tight">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Optional Details */}
            <div className="space-y-1.5">
              <label htmlFor="report-details" className="text-xs font-semibold text-slate-700">
                Additional context (optional)
              </label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Briefly describe what makes this misleading, unsafe, or inappropriate..."
                rows={2}
                maxLength={500}
                className="text-xs resize-none bg-slate-50/60 border-slate-200 focus:bg-white"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={submitting}
                className="rounded-xl border-slate-200 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs shadow-md shadow-rose-600/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="mr-1.5 h-3.5 w-3.5" />
                    Submit Report
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
