import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const actionItems = [
  { label: "訂蛋糕", href: "/cakes", enabled: true },
  { label: "訂咖啡豆", href: "", enabled: false },
  { label: "查詢訂單", href: "/orders", enabled: true },
  { label: "訂位", href: "", enabled: false },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const heroImage = await prisma.siteImage.findUnique({
    where: { slot: "HOME_HERO" },
  });

  const heroUrl = heroImage?.isActive ? heroImage.url : "";
  const heroAlt = heroImage?.alt?.trim() || "首頁主圖";

  return (
    <main className="min-h-screen bg-stone-50 text-stone-800">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="border-b border-stone-200 pb-5">
          <p className="text-[11px] tracking-[0.28em] text-stone-500">
            NOSTALGIA COFFEE ROASTERY
          </p>
          <h1
            className="mt-2 text-[24px] font-medium tracking-[0.08em] text-stone-800 sm:text-[30px]"
            style={{
              fontFamily:
                '"Noto Serif TC","Iowan Old Style","Palatino Linotype","Times New Roman",serif',
            }}
          >
            眷鳥咖啡
          </h1>
        </header>

        <section className="grid flex-1 gap-8 py-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch lg:py-10">
          <div className="overflow-hidden bg-stone-200">
            <div className="relative aspect-[4/5] h-full min-h-[420px] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[620px]">
              {heroUrl ? (
                <Image
                  src={heroUrl}
                  alt={heroAlt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm tracking-[0.12em] text-stone-500">
                  首頁圖片區
                </div>
              )}
            </div>
          </div>

          <aside className="flex h-full flex-col bg-stone-100 px-6 py-7">
            <div className="grid gap-3">
              {actionItems.map((item, index) => {
                const toneClass =
                  index % 2 === 0
                    ? "bg-stone-400 text-white hover:bg-stone-500 hover:text-white"
                    : "bg-stone-200 text-stone-700 hover:bg-stone-300 hover:text-stone-800";

                const staticToneClass =
                  index % 2 === 0
                    ? "bg-stone-400 text-white"
                    : "bg-stone-200 text-stone-700";

                return item.enabled ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`inline-flex min-h-[58px] items-center justify-center px-5 py-4 text-[14px] tracking-[0.14em] transition ${toneClass}`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <div
                    key={item.label}
                    className={`inline-flex min-h-[58px] items-center justify-center px-5 py-4 text-[14px] tracking-[0.14em] ${staticToneClass}`}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>

            <div className="mt-auto pt-10">
              <div className="border-t border-stone-200 pt-5">
                <p className="text-[11px] tracking-[0.22em] text-stone-500">
                  STORE INFO
                </p>

                <div className="mt-4 space-y-4 text-[14px] leading-7 text-stone-700">
                  <div>
                    <div className="text-stone-500">地址</div>
                    <div>高雄市前金區成功一路292-1號</div>
                  </div>

                  <div>
                    <div className="text-stone-500">電話</div>
                    <div>07-2212021</div>
                  </div>

                  <div>
                    <div className="text-stone-500">Instagram</div>
                    <div className="text-stone-400">請放入 IG 連結</div>
                  </div>

                  <div>
                    <div className="text-stone-500">官方 LINE</div>
                    <div className="text-stone-400">請放入 LINE 連結</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}