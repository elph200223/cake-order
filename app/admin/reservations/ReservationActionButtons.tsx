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
  const [loading, setLoading] = useState<"confirm" | "reject" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  async function handleDelete() {
    setLoading("delete");
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}/reply`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.location.reload();
    } catch (e) {
      alert(`刪除失敗，請再試一次。\n${e instanceof Error ? e.message : ""}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {status === "CONFIRMED" && (
        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">已確認</span>
      )}
      {status === "REJECTED" && (
        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">已拒絕</span>
      )}
      {status === "PENDING" && (
        <>
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
        </>
      )}
      {confirmDelete ? (
        <>
          <button
            onClick={handleDelete}
            disabled={loading !== null}
            className="rounded px-2 py-1 text-xs font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
          >
            {loading === "delete" ? "..." : "確認刪除"}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            disabled={loading !== null}
            className="rounded px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50"
          >
            取消
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          disabled={loading !== null}
          className="rounded px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50"
        >
          刪除
        </button>
      )}
    </div>
  );
}
