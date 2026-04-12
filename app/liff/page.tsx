"use client";

import { useEffect, useState } from "react";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID ?? "";

export default function LiffPage() {
  const [status, setStatus] = useState<"loading" | "sending" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("text") ?? "";
    setText(t);

    const run = async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: LIFF_ID });

        if (!liff.isInClient()) {
          setErrorMsg("請在手機 LINE 中開啟此頁面");
          setStatus("error");
          return;
        }

        // 尚未登入 → 觸發授權流程（會自動帶回原 URL）
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        setStatus("sending");
        await liff.sendMessages([{ type: "text", text: t }]);
        setStatus("success");

        setTimeout(() => liff.closeWindow(), 1500);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        // 權限不足 → 重新觸發授權
        if (msg.includes("permission") || msg.includes("grant")) {
          const liff = (await import("@line/liff")).default;
          liff.login();
          return;
        }
        setErrorMsg(msg);
        setStatus("error");
      }
    };

    run();
  }, []);

  if (status === "loading" || status === "sending") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-[#06C755]" />
        <p className="text-sm text-neutral-500">
          {status === "loading" ? "初始化中…" : "正在傳送訂位申請…"}
        </p>
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

  // error — 顯示手動備援
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="mb-3 text-4xl">⚠️</div>
      <h1 className="text-lg font-bold text-neutral-900">無法自動傳送</h1>
      <p className="mt-2 text-sm text-neutral-500">{errorMsg}</p>
      {text && (
        <div className="mt-5 w-full max-w-sm rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left">
          <p className="mb-2 text-xs font-medium text-neutral-500">請複製以下內容貼到 LINE：</p>
          <pre className="whitespace-pre-wrap text-sm leading-6 text-neutral-800">{text}</pre>
        </div>
      )}
    </div>
  );
}
