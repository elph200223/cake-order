"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReservationActionButtons({
  reservationId,
  status,
  hasLineUser,
}: {
  reservationId: number;
  status: string;
  hasLineUser: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"confirm" | "reject" | null>(null);

  if (status !== "PENDING") return null;

  async function handleAction(action: "confirm" | "reject") {
    setLoading(action);
    try {
      await fetch(`/api/admin/reservations/${reservationId}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleAction("confirm")}
        disabled={loading !== null}
        title={hasLineUser ? "傳送確認訊息給客人" : "客人尚未綁定 LINE，僅更新狀態"}
        className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50"
      >
        {loading === "confirm" ? "..." : "確認"}
      </button>
      <button
        onClick={() => handleAction("reject")}
        disabled={loading !== null}
        title={hasLineUser ? "傳送拒絕訊息給客人" : "客人尚未綁定 LINE，僅更新狀態"}
        className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50"
      >
        {loading === "reject" ? "..." : "拒絕"}
      </button>
    </div>
  );
}
