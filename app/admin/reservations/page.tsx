import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "./SettingsForm";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待確認",
  CONFIRMED: "已確認",
  REJECTED: "已拒絕",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

const DEFAULTS = {
  confirmMessage: "您好！您的訂位已確認，期待您的到來！如有任何問題歡迎隨時詢問 🙏",
  rejectMessage: "您好！非常抱歉，您所希望的時段目前已滿，如有需要請再與我們聯繫，謝謝您的理解 🙏",
};

export default async function AdminReservationsPage() {
  const [reservations, setting] = await Promise.all([
    prisma.reservation.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.reservationSetting.findFirst(),
  ]);

  const initialSetting = {
    confirmMessage: setting?.confirmMessage ?? DEFAULTS.confirmMessage,
    rejectMessage: setting?.rejectMessage ?? DEFAULTS.rejectMessage,
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <Link href="/admin" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
          ← 回後台首頁
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950">訂位管理</h1>
      </div>

      {/* 自動回覆文字設定 */}
      <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-neutral-900">自動回覆文字設定</h2>
        <SettingsForm initial={initialSetting} />
      </section>

      {/* 訂位記錄 */}
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          共 {reservations.length} 筆訂位記錄
        </div>

        {reservations.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-400">目前尚無訂位記錄</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-neutral-50">
                <tr className="text-left">
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">姓名</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">電話</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">人數</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">希望時間</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">備註</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">LINE 綁定</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">狀態</th>
                  <th className="border-b border-neutral-200 px-4 py-3 font-semibold text-neutral-700">建立時間</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="border-b border-neutral-100 px-4 py-3 font-medium text-neutral-900">{r.customerName}</td>
                    <td className="border-b border-neutral-100 px-4 py-3 text-neutral-700">{r.phone}</td>
                    <td className="border-b border-neutral-100 px-4 py-3 text-neutral-700">
                      {r.adults} 大{r.children > 0 ? ` / ${r.children} 小` : ""}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-3 text-neutral-700 whitespace-nowrap">
                      {r.requestDate} {r.requestTime}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-3 text-neutral-500">
                      {r.note || "—"}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-3">
                      {r.lineUserId
                        ? <span className="text-green-600">已綁定</span>
                        : <span className="text-neutral-400">未綁定</span>}
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="border-b border-neutral-100 px-4 py-3 text-neutral-400 whitespace-nowrap">
                      {r.createdAt.toLocaleDateString("zh-TW")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
