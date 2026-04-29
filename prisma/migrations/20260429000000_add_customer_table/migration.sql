CREATE TABLE "Customer" (
  "id"        SERIAL PRIMARY KEY,
  "phone"     TEXT NOT NULL,
  "name"      TEXT NOT NULL DEFAULT '',
  "note"      TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

ALTER TABLE "Reservation" ADD COLUMN "customerId" INTEGER;
ALTER TABLE "Order"       ADD COLUMN "customerId" INTEGER;

ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
