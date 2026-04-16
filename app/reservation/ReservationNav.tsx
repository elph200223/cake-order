"use client";

import Link from "next/link";

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }} aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.5 20v-5.5h5V20" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }} aria-hidden="true">
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }} aria-hidden="true">
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
      <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 7H6.2" />
    </svg>
  );
}

const iconBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  border: "1px solid #ddd4c8",
  background: "#faf7f2",
  color: "#8d877f",
  cursor: "pointer",
  textDecoration: "none",
};

export default function ReservationNav() {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      <button
        type="button"
        onClick={() => window.history.back()}
        style={iconBtn}
        aria-label="回上一頁"
      >
        <BackIcon />
      </button>
      <Link href="/" aria-label="回首頁" style={iconBtn}>
        <HomeIcon />
      </Link>
      <Link href="/checkout" aria-label="前往購物車" style={iconBtn}>
        <CartIcon />
      </Link>
    </div>
  );
}
