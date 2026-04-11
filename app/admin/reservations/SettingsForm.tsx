"use client";

import { useState } from "react";

type Setting = {
  confirmMessage: string;
  rejectMessage: string;
};

export function SettingsForm({ initial }: { initial: Setting }) {
  const [confirmMessage, setConfirmMessage] = useState(initial.confirmMessage);
  const [rejectMessage, setRejectMessage] = useState(initial.rejectMessage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/reservations/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmMessage, rejectMessage }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-800">
          確認訂位時自動傳送的文字
        </label>
        <textarea
          rows={3}
          value={confirmMessage}
          onChange={(e) => setConfirmMessage(e.target.value)}
          className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-800">
          拒絕訂位時自動傳送的文字
        </label>
        <textarea
          rows={3}
          value={rejectMessage}
          onChange={(e) => setRejectMessage(e.target.value)}
          className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-neutral-500"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "儲存中…" : "儲存"}
        </button>
        {saved && <span className="text-sm text-green-600">已儲存 ✓</span>}
      </div>
    </div>
  );
}
