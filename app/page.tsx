import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const actionItems = [
  { label: "訂蛋糕", href: "/cakes", enabled: true },
  { label: "訂咖啡", href: "/coffee", enabled: true },
  { label: "查詢訂單", href: "/orders", enabled: true },
  { label: "訂位（尚未開放）", href: "", enabled: false },
];

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.4" cy="6.6" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="currentColor"
    >
      <path d="M20.03 10.12c0-4.22-3.87-7.66-8.63-7.66s-8.63 3.44-8.63 7.66c0 3.79 3.07 6.96 7.22 7.56.28.06.66.19.76.43.09.22.06.56.03.78l-.12.73c-.04.22-.18.86.75.47.94-.39 5.06-2.98 6.9-5.1 1.27-1.39 1.72-2.8 1.72-4.87ZM8.17 12.97a.6.6 0 0 1-.6.6H5.6a.6.6 0 0 1-.6-.6V8.85a.6.6 0 1 1 1.2 0v3.52h1.37a.6.6 0 0 1 .6.6Zm2.34 0a.6.6 0 0 1-1.2 0V8.85a.6.6 0 1 1 1.2 0v4.12Zm4.67 0a.6.6 0 0 1-.51-.28l-1.98-2.95v3.23a.6.6 0 0 1-1.2 0V8.85a.6.6 0 0 1 1.11-.33l1.98 2.95V8.85a.6.6 0 1 1 1.2 0v4.12a.6.6 0 0 1-.6.6Zm3.81-3.52h-1.37v1h1.37a.6.6 0 0 1 0 1.2h-1.37v1h1.37a.6.6 0 0 1 0 1.2h-1.97a.6.6 0 0 1-.6-.6V8.85a.6.6 0 0 1 .6-.6h1.97a.6.6 0 0 1 0 1.2Z" />
    </svg>
  );
}

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
                    <div className="text-stone-500">社群</div>
                    <div className="mt-1 flex items-center gap-3">
                      <a
                        href="https://www.instagram.com/nostalgia_coffeelovee?igsh=MXNtMXdrZWI0ZDY1cg%3D%3D&utm_source=qr"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Instagram"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
                      >
                        <InstagramIcon />
                      </a>

                      <a
                        href="https://lin.ee/FDXPdMy"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="LINE"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
                      >
                        <LineIcon />
                      </a>
                    </div>
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