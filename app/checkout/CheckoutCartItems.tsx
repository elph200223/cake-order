import type { CartItem } from "@/lib/cart";

type Props = {
  items: CartItem[];
  onRemove: (itemId: string) => void;
};

function formatMoney(price: number) {
  return `NT$ ${price.toLocaleString("zh-TW")}`;
}

function formatPriceDelta(price: number) {
  if (price === 0) {
    return "不加價";
  }

  const sign = price > 0 ? "+" : "-";
  return `${sign}NT$ ${Math.abs(price).toLocaleString("zh-TW")}`;
}

export default function CheckoutCartItems({ items, onRemove }: Props) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-neutral-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                {item.productName}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                基本價格 {formatMoney(item.basePrice)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-neutral-600">
                數量 <span className="font-semibold text-neutral-900">{item.quantity}</span>
              </div>

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                移除
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {item.options.length === 0 ? (
              <p className="text-sm text-neutral-400">無加購或規格選項</p>
            ) : (
              item.options.map((option) => (
                <div
                  key={`${item.id}-${option.optionGroupId}-${option.optionId}`}
                  className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {option.optionGroupName}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">{option.optionName}</p>
                  </div>

                  <div className="ml-4 shrink-0 text-sm font-medium text-neutral-700">
                    {formatPriceDelta(option.priceDelta)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4">
            <span className="text-sm text-neutral-500">此項目小計</span>
            <span className="text-base font-semibold text-neutral-950">
              {formatMoney(item.subtotal)}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}