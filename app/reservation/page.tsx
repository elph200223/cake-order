import { ReservationForm } from "./ReservationForm";

export default function ReservationPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">線上訂位</h1>
        <p className="mt-2 text-sm text-neutral-500">
          填寫以下資料後，系統將透過 LINE 與您確認訂位。
        </p>
      </div>
      <ReservationForm />
    </main>
  );
}
