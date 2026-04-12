"use client";

import { useEffect, useState } from "react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

export default function LiffPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("rid") ?? "";

    const run = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: LIFF_ID });

        if (!liff.isInClient()) {
          setErrorMsg("請在手機 LINE 中開啟此頁面");
          setStatus("error");
          return;
        }

        // 取得 LINE userId
        const profile = await liff.getProfile();
        const lineUserId = profile.userId;

        // 綁定 userId 到訂位，server 會推送確認訊息
        const res = await fetch("/api/reservations/bind-line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rid: Number(rid), lineUserId }),
        });

        if (!res.ok) throw new Error("綁定失敗");

        setStatus("success");
        setTimeout(() => liff.closeWindow(), 2000);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErrorMsg(msg);
        setStatus("error");
      }
    };

    run();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-[#06C755]" />
        <p className="text-sm text-neutral-500">處理中…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <div className="mb-3 text-5xl">✅</div>
        <h1 className="text-lg font-bold text-neutral-900">訂位申請已送出！</h1>
        <p className="mt-2 text-sm text-neutral-500">我們會盡快確認並用 LINE 回覆您。</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="mb-3 text-4xl">⚠️</div>
      <h1 className="text-lg font-bold text-neutral-900">發生錯誤</h1>
      <p className="mt-2 text-sm text-neutral-500">{errorMsg}</p>
    </div>
  );
}
