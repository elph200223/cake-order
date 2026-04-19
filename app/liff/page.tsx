"use client";

import { useEffect, useRef, useState } from "react";
import type { Liff } from "@line/liff";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
const OA_URL = "https://line.me/R/ti/p/@482fsits";

type Status = "loading" | "need-friend" | "success" | "error";

export default function LiffPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const statusRef = useRef<Status>("loading");
  const liffRef = useRef<Liff | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("rid") ?? "";

    const updateStatus = (s: Status) => {
      statusRef.current = s;
      setStatus(s);
    };

    const checkFriendshipAndBind = async () => {
      try {
        if (!liffRef.current) {
          const liff = (await import("@line/liff")).default;
          await liff.init({ liffId: LIFF_ID });
          liffRef.current = liff;
        }

        const liff = liffRef.current;

        if (!liff.isInClient()) {
          setErrorMsg("請在手機 LINE 中開啟此頁面");
          updateStatus("error");
          return;
        }

        const { friendFlag } = await liff.getFriendship();
        if (!friendFlag) {
          updateStatus("need-friend");
          return;
        }

        const profile = await liff.getProfile();
        const lineUserId = profile.userId;

        const res = await fetch("/api/reservations/bind-line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rid: Number(rid), lineUserId }),
        });

        const data = (await res.json()) as { ok: boolean; error?: string };

        if (!data.ok) {
          throw new Error(data.error ?? "綁定失敗");
        }

        updateStatus("success");

        // 先 openWindow 導向 OA 對話框，再 closeWindow 關閉 LIFF
        setTimeout(() => {
          liff.openWindow({ url: OA_URL, external: false });
          liff.closeWindow();
        }, 1000);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErrorMsg(msg);
        updateStatus("error");
      }
    };

    checkFriendshipAndBind();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && statusRef.current === "need-friend") {
        checkFriendshipAndBind();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-[#06C755]" />
        <p className="text-sm text-neutral-500">處理中…</p>
      </div>
    );
  }

  if (status === "need-friend") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <div className="mb-3 text-5xl">💬</div>
        <h1 className="text-lg font-bold text-neutral-900">還差一步！</h1>
        <p className="mt-3 text-sm text-neutral-500">
          為了讓我們能傳送訂位確認訊息給您，請先將『眷鳥咖啡商行』加為 LINE 好友。
          <br />
          加好友完成後會自動送出訂位並帶您到對話框。
        </p>
        <button
          className="mt-6 rounded-full bg-[#06C755] px-8 py-3 text-sm font-bold text-white"
          onClick={() => {
            if (liffRef.current) liffRef.current.openWindow({ url: OA_URL, external: false });
          }}
        >
          加入好友
        </button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <div className="mb-3 text-5xl">✅</div>
        <h1 className="text-lg font-bold text-neutral-900">訂位申請已送出</h1>
        <p className="mt-2 text-sm text-neutral-500">即將為您開啟 LINE 對話框，請查看確認訊息…</p>
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
