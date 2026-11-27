-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Setting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "restaurantName" TEXT NOT NULL DEFAULT 'Burger House',
    "logoUrl" TEXT,
    "duitnowQrUrl" TEXT,
    "duitnowQrIsDemo" BOOLEAN NOT NULL DEFAULT true,
    "paymentNote" TEXT,
    "queueResetHour" INTEGER NOT NULL DEFAULT 4,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
    "maxPreparing" INTEGER NOT NULL DEFAULT 1,
    "onlineBankingMode" TEXT NOT NULL DEFAULT 'DEMO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Setting" ("createdAt", "duitnowQrUrl", "id", "logoUrl", "maxPreparing", "onlineBankingMode", "paymentNote", "queueResetHour", "restaurantName", "timezone", "updatedAt") SELECT "createdAt", "duitnowQrUrl", "id", "logoUrl", "maxPreparing", "onlineBankingMode", "paymentNote", "queueResetHour", "restaurantName", "timezone", "updatedAt" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
