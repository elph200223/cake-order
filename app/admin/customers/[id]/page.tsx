"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type OrderRecord = {
  id: number;
  orderNo: string;
  pickupDate: string;
  pickupTime: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: { name: string; quantity: number; price: number }[];
};

type ReservationRecord = {
  id: number;
  requestDate: string;
  requestTime: string;
  adults: number;
  children: number;
  note: string;
  status: string;
  createdAt: string;
};

type Customer = {
  id: number;
  phone: string;
  name: string;
  note: string;
  createdAt: string;
  orders: OrderRecord[];
  reservations: ReservationRecord[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "待付款",
  PAID: "已付款",
  CANCELLED: "已取消",
  PENDING: "待審核",
  CONFIRMED: "已確認",
  REJECTED: "已拒絕",
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/customers/${id}`)
      .then((r) => r.json())
      .then((d: { ok: boolean; customer?: Customer }) => {
        if (d.ok && d.customer) {
          setCustomer(d.customer);
          setNote(d.customer.note);
        }
      });
  }, [id]);

  const saveNote = async () => {
    setSaving(true);
    await fetch(`/api/admin/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!customer) return <div className="p-6 text-neutral-400">載入中…</div>;

  const total = customer.orders.length + customer.reservations.length;
  const isMember = total >= 2;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/admin/customers" className="text-sm text-neutral-400 hover:text-neutral-600 mb-4 inline-block">
        ← 返回會員列表
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-neutral-800">{customer.name || "（未命名）"}</h1>
        {isMember && (
          <span className="text-sm bg-amber-100 text-amber-700 px-2 py-0.5 rounded">會員</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="bg-neutral-50 rounded p-4">
          <p className="text-neutral-400 mb-1">電話</p>
          <p className="font-medium text-neutral-800">{customer.phone}</p>
        </div>
        <div className="bg-neutral-50 rounded p-4">
          <p className="text-neutral-400 mb-1">總消費次數</p>
          <p className="font-medium text-neutral-800">{customer.orders.length} 筆訂單 / {customer.reservations.length} 筆訂位</p>
        </div>
      </div>

      {/* 備注 */}
      <div className="mb-8">
        <label className="block text-sm text-neutral-500 mb-1">店家備注</label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border border-neutral-200 rounded px-3 py-2 text-sm text-neutral-800 resize-none focus:outline-none focus:border-amber-400"
          placeholder="例：對堅果過敏、常訂下午場…"
        />
        <button
          onClick={saveNote}
          disabled={saving}
          className="mt-2 px-4 py-1.5 text-sm bg-amber-700 text-white rounded hover:bg-amber-800 disabled:opacity-50"
        >
          {saved ? "已儲存 ✓" : saving ? "儲存中…" : "儲存備注"}
        </button>
      </div>

      {/* 訂單紀錄 */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-neutral-700 mb-3">訂單紀錄（{customer.orders.length}）</h2>
        {customer.orders.length === 0 ? (
          <p className="text-neutral-400 text-sm">無訂單紀錄</p>
        ) : (
          <div className="space-y-3">
            {customer.orders.map((o) => (
              <div key={o.id} className="border border-neutral-200 rounded p-4 text-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium text-neutral-800">{o.orderNo}</span>
                    <span className="ml-2 text-neutral-400">{o.pickupDate} {o.pickupTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-600">NT$ {o.totalAmount.toLocaleString()}</span>
                    <span className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </div>
                </div>
                <div className="text-neutral-500 space-y-0.5">
                  {o.items.map((item, i) => (
                    <div key={i}>・{item.name} × {item.quantity}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 訂位紀錄 */}
      <section>
        <h2 className="text-base font-semibold text-neutral-700 mb-3">訂位紀錄（{customer.reservations.length}）</h2>
        {customer.reservations.length === 0 ? (
          <p className="text-neutral-400 text-sm">無訂位紀錄</p>
        ) : (
          <div className="space-y-3">
            {customer.reservations.map((r) => (
              <div key={r.id} className="border border-neutral-200 rounded p-4 text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-neutral-800">{r.requestDate} {r.requestTime}</span>
                    <span className="ml-2 text-neutral-500">
                      {r.adults} 大人{r.children > 0 ? ` / ${r.children} 小孩` : ""}
                    </span>
                  </div>
                  <span className="text-xs bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                {r.note && <p className="mt-1 text-neutral-400">{r.note}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
