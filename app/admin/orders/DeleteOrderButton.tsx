"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteOrderButton({
  orderId,
  orderNo,
}: {
  orderId: number;
  orderNo: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean };
      if (data.ok) {
        router.refresh();
      }
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "刪除中…" : "確認刪除"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="rounded px-2 py-0.5 text-xs text-neutral-400 hover:text-neutral-700"
        >
          取消
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`刪除 ${orderNo}`}
      className="rounded px-2 py-0.5 text-xs text-neutral-400 hover:text-red-500"
    >
      刪除
    </button>
  );
}
