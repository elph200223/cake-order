type Props = {
    itemCount: number;
    cartItemCount: number;
    totalAmount: number;
    onClear: () => void;
  };
  
  function formatMoney(price: number) {
    return `NT$ ${price.toLocaleString("zh-TW")}`;
  }
  
  export default function CheckoutSummary({
    itemCount,
    cartItemCount,
    totalAmount,
    onClear,
  }: Props) {
    return (
      <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">訂單摘要</h2>
  
        <div className="mt-4 space-y-3 border-b border-neutral-100 pb-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">商品總件數</span>
            <span className="font-medium text-neutral-900">{itemCount}</span>
          </div>
  
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">購物車項目數</span>
            <span className="font-medium text-neutral-900">{cartItemCount}</span>
          </div>
        </div>
  
        <div className="mt-4 flex items-center justify-between">
          <span className="text-base font-semibold text-neutral-900">總金額</span>
          <span className="text-xl font-bold text-neutral-950">
            {formatMoney(totalAmount)}
          </span>
        </div>
  
        <div className="mt-6 space-y-3">
          <button
            type="button"
            className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
            disabled
          >
            下一步會接顧客資料表單
          </button>
  
          <button
            type="button"
            onClick={onClear}
            className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            清空購物車
          </button>
        </div>
  
        <p className="mt-3 text-sm text-neutral-500">
          目前此區先完成購物車摘要與清空操作入口。
        </p>
      </aside>
    );
  }