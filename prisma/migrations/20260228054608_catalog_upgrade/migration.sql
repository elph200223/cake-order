/*
  Warnings:

  - Added the required column `updatedAt` to the `Option` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `OptionGroup` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Option" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "optionGroupId" INTEGER NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Option_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "OptionGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Option" ("id", "name", "optionGroupId", "priceDelta") SELECT "id", "name", "optionGroupId", "priceDelta" FROM "Option";
DROP TABLE "Option";
ALTER TABLE "new_Option" RENAME TO "Option";
CREATE INDEX "Option_optionGroupId_idx" ON "Option"("optionGroupId");
CREATE TABLE "new_OptionGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_OptionGroup" ("id", "maxSelect", "minSelect", "name", "required") SELECT "id", "maxSelect", "minSelect", "name", "required" FROM "OptionGroup";
DROP TABLE "OptionGroup";
ALTER TABLE "new_OptionGroup" RENAME TO "OptionGroup";
CREATE TABLE "new_ProductOptionGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "optionGroupId" INTEGER NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductOptionGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductOptionGroup_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "OptionGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProductOptionGroup" ("id", "optionGroupId", "productId") SELECT "id", "optionGroupId", "productId" FROM "ProductOptionGroup";
DROP TABLE "ProductOptionGroup";
ALTER TABLE "new_ProductOptionGroup" RENAME TO "ProductOptionGroup";
CREATE INDEX "ProductOptionGroup_optionGroupId_idx" ON "ProductOptionGroup"("optionGroupId");
CREATE UNIQUE INDEX "ProductOptionGroup_productId_optionGroupId_key" ON "ProductOptionGroup"("productId", "optionGroupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
