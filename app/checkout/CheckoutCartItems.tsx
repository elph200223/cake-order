import type { CartItem } from "@/lib/cart";

type Props = {
  items: CartItem[];
  onRemove: (itemId: string) => void;
};

function formatMoney(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

export default function CheckoutCartItems({ items, onRemove }: Props) {
  return (
    <section className="bg-neutral-50 px-5 py-5">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-3">
        <div>
          <h2 className="text-base font-semibold tracking-[0.04em] text-neutral-900">
            商品資訊
          </h2>
          <p className="mt-1 text-xs leading-6 text-neutral-500">
            請先確認品項、數量與小計。
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <article key={item.id} className="bg-white/70 px-0 py-0">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-neutral-900">
                  {item.productName}
                </h3>
                <p className="mt-1 text-xs text-neutral-500">
                  基本價格 {formatMoney(item.basePrice)}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-xs text-neutral-500">
                  數量{" "}
                  <span className="font-semibold text-neutral-900">
                    {item.quantity}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="mt-2 text-xs text-red-600 transition hover:text-red-700"
                >
                  移除
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {item.options.length === 0 ? (
                <p className="text-xs text-neutral-400">無規格或加購選項</p>
              ) : (
                item.options.map((option) => (
                  <div
                    key={`${item.id}-${option.optionGroupId}-${option.optionId}`}
                    className="bg-neutral-50 px-3 py-2"
                  >
                    <p className="text-xs text-neutral-500">
                      {option.optionGroupName}
                    </p>
                    <p className="mt-1 text-sm text-neutral-800">
                      {option.optionName}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3">
              <span className="text-xs text-neutral-500">此項目小計</span>
              <span className="text-sm font-semibold text-neutral-950">
                {formatMoney(item.subtotal)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}