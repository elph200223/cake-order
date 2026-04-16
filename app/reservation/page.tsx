import { ReservationForm } from "./ReservationForm";
import ReservationNav from "./ReservationNav";

const SERIF =
  '"Noto Serif TC","Iowan Old Style","Palatino Linotype","Times New Roman",serif';

export default function ReservationPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f4ef",
        padding: "52px 20px 80px",
        color: "#4d4a46",
        fontFamily: SERIF,
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.22em",
            color: "#9a948b",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          NOSTALGIA COFFEE ROASTERY
        </div>

        <ReservationNav />

        <ReservationForm />
      </div>
    </div>
  );
}
