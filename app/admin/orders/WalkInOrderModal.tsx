"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const PICKUP_TIMES = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

type LineItem = {
  name: string;
  price: string;
  quantity: string;
};

function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function emptyItem(): LineItem {
  return { name: "", price: "", quantity: "1" };
}

export function WalkInOrderButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
      >
        + 新增現場訂單
      </button>
      {open && <WalkInOrderModal onClose={() => setOpen(false)} />}
    </>
  );
}

function WalkInOrderModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupDate, setPickupDate] = useState(todayString());
  const [pickupTime, setPickupTime] = useState("14:00");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalAmount = items.reduce((sum, item) => {
    const price = parseInt(item.price, 10) || 0;
    const qty = parseInt(item.quantity, 10) || 0;
    return sum + price * qty;
  }, 0);

  const updateItem = useCallback(
    (index: number, field: keyof LineItem, value: string) => {
      setItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyItem()]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsedItems = items.map((item) => ({
      name: item.name.trim(),
      price: parseInt(item.price, 10) || 0,
      quantity: parseInt(item.quantity, 10) || 0,
    }));

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/orders/create-walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          pickupDate,
          pickupTime,
          note,
          items: parsedItems,
        }),
      });

      const data = (await res.json()) as { ok: boolean; error?: string; order?: { orderNo: string } };

      if (!data.ok) {
        setError(data.error ?? "建立失敗");
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("網路錯誤，請再試一次");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-bold text-neutral-900">新增現場訂單</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                姓名 *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                電話 *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                取貨日期 *
              </label>
              <input
                type="date"
                required
                min={todayString()}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                取貨時間 *
              </label>
              <select
                required
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
              >
                {PICKUP_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              備註
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">品項 *</span>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-neutral-500 hover:text-neutral-900"
              >
                + 新增品項
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="品項名稱"
                    required
                    value={item.name}
                    onChange={(e) => updateItem(index, "name", e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                  />
                  <input
                    type="number"
                    placeholder="單價"
                    required
                    min={0}
                    value={item.price}
                    onChange={(e) => updateItem(index, "price", e.target.value)}
                    className="w-24 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                  />
                  <input
                    type="number"
                    placeholder="數量"
                    required
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    className="w-16 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 text-right text-sm font-semibold text-neutral-900">
              合計：NT$ {totalAmount.toLocaleString()}
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {submitting ? "建立中…" : "建立訂單（已付款）"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
