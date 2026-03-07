-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNo" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pickupDate" TEXT NOT NULL,
    "pickupTime" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "totalAmount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Order" (
    "id",
    "orderNo",
    "customer",
    "phone",
    "pickupDate",
    "pickupTime",
    "note",
    "status",
    "totalAmount",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "orderNo",
    "customer",
    "phone",
    '',
    '',
    '',
    "status",
    "totalAmount",
    "createdAt",
    "updatedAt"
FROM "Order";

DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";

CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
