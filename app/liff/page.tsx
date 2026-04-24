"use client";

import { useEffect, useRef, useState } from "react";
import type { Liff } from "@line/liff";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";
const OA_CHAT_URL = "https://line.me/R/oaMessage/%40482fsits/?";
const OA_ADD_FRIEND_URL = "https://line.me/R/ti/p/@482fsits";

type Status = "loading" | "need-friend" | "success" | "error";

export default function LiffPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const liffRef = useRef<Liff | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("rid") ?? "";
    const debug = params.get("debug");

    // debug 模式（僅 development）
    if (process.env.NODE_ENV === "development" && debug) {
      if (debug === "notfriend") {
        setStatus("need-friend");
        return;
      }
      if (debug === "error") {
        setErrorMsg("測試錯誤");
        setStatus("error");
        return;
      }
      if (debug === "success") {
        setStatus("success");
        setTimeout(() => {
          console.log("[debug] would openWindow OA_CHAT_URL then closeWindow");
        }, 1000);
        return;
      }
    }

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
          setStatus("error");
          return;
        }

        // 先拿 userId（無論是否好友都能取得）
        const profile = await liff.getProfile();
        const lineUserId = profile.userId;

        const { friendFlag } = await liff.getFriendship();

        const res = await fetch("/api/reservations/bind-line", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rid: Number(rid), lineUserId, isFriend: friendFlag }),
        });

        const data = (await res.json()) as { ok: boolean; error?: string };

        if (!data.ok) {
          throw new Error(data.error ?? "綁定失敗");
        }

        if (friendFlag) {
          setStatus("success");
          // 先 openWindow 導向 OA 對話框，再 closeWindow 關閉 LIFF
          setTimeout(() => {
            liff.openWindow({ url: OA_CHAT_URL, external: false });
            liff.closeWindow();
          }, 1000);
        } else {
          setStatus("need-friend");
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setErrorMsg(msg);
        setStatus("error");
      }
    };

    checkFriendshipAndBind();
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
          為了讓我們能傳送訂位確認訊息，請將『眷鳥咖啡商行』加為 LINE 好友，加入後訂位資料會自動送達您的對話框。
        </p>
        <button
          className="mt-6 rounded-full bg-[#06C755] px-8 py-3 text-sm font-bold text-white"
          onClick={() => {
            if (liffRef.current) {
              liffRef.current.openWindow({ url: OA_ADD_FRIEND_URL, external: false });
            }
          }}
        >
          加入好友
        </button>
        <p className="mt-3 text-xs text-neutral-400">加好友後訂位即自動完成，您可直接在對話框查看訊息。</p>
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

  // 若是「需在 LINE 開啟」的錯誤，提供一鍵跳轉按鈕
  const isNotInClient = errorMsg === "請在手機 LINE 中開啟此頁面";

  if (isNotInClient) {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    const rid = params.get("rid") ?? "";
    const liffUrl = `https://liff.line.me/${LIFF_ID}${rid ? `?rid=${rid}` : ""}`;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <div className="mb-3 text-5xl">📱</div>
        <h1 className="text-lg font-bold text-neutral-900">請用 LINE 開啟</h1>
        <p className="mt-3 text-sm text-neutral-500">
          此頁面需要在 LINE app 中開啟，<br />
          請點下方按鈕繼續完成訂位。
        </p>
        <a
          href={liffUrl}
          className="mt-6 inline-block rounded-full bg-[#06C755] px-8 py-3 text-sm font-bold text-white"
        >
          用 LINE 開啟
        </a>
        <p className="mt-4 text-xs text-neutral-400">
          點擊後請選擇「在 LINE 中開啟」
        </p>
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
