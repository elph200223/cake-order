import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      phone: true,
      name: true,
      note: true,
      createdAt: true,
      _count: { select: { orders: { where: { status: "PAID" } }, reservations: true } },
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-neutral-800 mb-6">會員管理</h1>

      <div className="overflow-x-auto rounded border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">姓名</th>
              <th className="px-4 py-3 font-medium">電話</th>
              <th className="px-4 py-3 font-medium text-center">訂單</th>
              <th className="px-4 py-3 font-medium text-center">訂位</th>
              <th className="px-4 py-3 font-medium">備注</th>
              <th className="px-4 py-3 font-medium">首次紀錄</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {customers.map((c) => {
              const total = c._count.orders + c._count.reservations;
              const isMember = total >= 2;
              return (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="font-medium text-neutral-800 hover:text-amber-700">
                      {c.name || "—"}
                    </Link>
                    {isMember && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">會員</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 tabular-nums">{c.phone}</td>
                  <td className="px-4 py-3 text-center text-neutral-600">{c._count.orders}</td>
                  <td className="px-4 py-3 text-center text-neutral-600">{c._count.reservations}</td>
                  <td className="px-4 py-3 text-neutral-500 max-w-xs truncate">{c.note || "—"}</td>
                  <td className="px-4 py-3 text-neutral-400 tabular-nums">
                    {new Date(c.createdAt).toLocaleDateString("zh-TW")}
                  </td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">尚無客人資料</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
