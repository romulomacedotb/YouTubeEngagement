-- CreateTable
CREATE TABLE "GoogleClientConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL DEFAULT 'http://localhost:3000/api/auth/google/callback',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OAuthAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "googleId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "channelId" TEXT,
    "channelTitle" TEXT,
    "channelThumbnail" TEXT,
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "tokenExpiresAt" DATETIME,
    "scope" TEXT,
    "clientConfigId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OAuthAccount_clientConfigId_fkey" FOREIGN KEY ("clientConfigId") REFERENCES "GoogleClientConfig" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OAuthAccount" ("avatarUrl", "channelId", "channelThumbnail", "channelTitle", "createdAt", "email", "encryptedAccessToken", "encryptedRefreshToken", "googleId", "id", "name", "scope", "tokenExpiresAt", "updatedAt") SELECT "avatarUrl", "channelId", "channelThumbnail", "channelTitle", "createdAt", "email", "encryptedAccessToken", "encryptedRefreshToken", "googleId", "id", "name", "scope", "tokenExpiresAt", "updatedAt" FROM "OAuthAccount";
DROP TABLE "OAuthAccount";
ALTER TABLE "new_OAuthAccount" RENAME TO "OAuthAccount";
CREATE UNIQUE INDEX "OAuthAccount_googleId_key" ON "OAuthAccount"("googleId");
CREATE INDEX "OAuthAccount_clientConfigId_idx" ON "OAuthAccount"("clientConfigId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GoogleClientConfig_isDefault_idx" ON "GoogleClientConfig"("isDefault");
