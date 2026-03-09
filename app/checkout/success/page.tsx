import Link from "next/link";

type Props = {
  searchParams: Promise<{
    orderNo?: string;
  }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { orderNo } = await searchParams;
  const safeOrderNo = orderNo?.trim() || "";

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <section className="relative overflow-hidden rounded-[36px] bg-[#f8f6f2] px-8 py-14 sm:px-14">
        <div className="absolute left-0 top-0 h-32 w-32 -translate-x-8 -translate-y-8 rounded-full bg-white/60 blur-2xl" />
        <div className="absolute bottom-0 right-0 h-40 w-40 translate-x-10 translate-y-10 rounded-full bg-[#efe9df] blur-3xl" />

        <div className="relative text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white/80 text-[26px] text-[#7d8f7a] shadow-sm">
            ✓
          </div>

          <p className="mt-8 text-[13px] tracking-[0.28em] text-[#a39f96]">
            THANK YOU
          </p>

          <h1 className="mt-4 text-3xl font-medium tracking-[0.08em] text-[#5f5a52] sm:text-4xl">
            訂單已成立
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-sm leading-8 text-[#8a847b] sm:text-base">
            我們已收到你的訂單資訊。
            <br className="hidden sm:block" />
            請保留以下訂單編號，之後可搭配手機號碼查詢訂單狀態。
          </p>
        </div>

        <div className="relative mx-auto mt-12 max-w-xl rounded-[28px] border border-white/80 bg-white/75 px-6 py-8 text-center shadow-[0_10px_30px_rgba(120,110,90,0.08)] backdrop-blur-sm">
          <div className="text-sm tracking-[0.2em] text-[#b0aaa0]">ORDER NO.</div>
          <div className="mt-4 break-all text-2xl font-medium tracking-[0.16em] text-[#5f5a52] sm:text-3xl">
            {safeOrderNo || "—"}
          </div>
        </div>

        <div className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/cakes"
            className="inline-flex min-w-[180px] items-center justify-center rounded-full border border-[#d9d1c5] bg-white/80 px-6 py-3 text-sm font-medium text-[#6f685f] transition hover:bg-white"
          >
            繼續選購
          </Link>

          <Link
            href={
              safeOrderNo
                ? `/orders?orderNo=${encodeURIComponent(safeOrderNo)}`
                : "/orders"
            }
            className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-[#d8d0c3] px-6 py-3 text-sm font-medium text-[#5f584f] transition hover:bg-[#cfc6b8]"
          >
            查詢訂單
          </Link>
        </div>

        <p className="relative mt-8 text-center text-xs tracking-[0.08em] text-[#aaa39a] sm:text-sm">
          查詢時請搭配下單手機號碼
        </p>
      </section>
    </main>
  );
}