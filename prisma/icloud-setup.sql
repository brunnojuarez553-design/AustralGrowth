-- CreateTable
CREATE TABLE "ICloudConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "calendars" JSONB NOT NULL,
    "calendarUrl" TEXT,
    "calendarName" TEXT,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "lockToken" TEXT,
    "lockUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ICloudConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ICloudObject" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "eventId" TEXT,
    "url" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "etag" TEXT,
    "rawIcs" TEXT,
    "baseHash" TEXT,
    "uploaded" BOOLEAN NOT NULL DEFAULT false,
    "deletedLocally" BOOLEAN NOT NULL DEFAULT false,
    "readOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ICloudObject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ICloudConnection_userId_key" ON "ICloudConnection"("userId");

-- CreateIndex
CREATE INDEX "ICloudConnection_workspaceId_idx" ON "ICloudConnection"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ICloudObject_eventId_key" ON "ICloudObject"("eventId");

-- CreateIndex
CREATE INDEX "ICloudObject_connectionId_idx" ON "ICloudObject"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ICloudObject_connectionId_url_key" ON "ICloudObject"("connectionId", "url");

-- AddForeignKey
ALTER TABLE "ICloudConnection" ADD CONSTRAINT "ICloudConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ICloudConnection" ADD CONSTRAINT "ICloudConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ICloudObject" ADD CONSTRAINT "ICloudObject_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ICloudConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ICloudObject" ADD CONSTRAINT "ICloudObject_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Server-only access through authenticated, workspace-scoped Prisma routes.
ALTER TABLE "ICloudConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ICloudObject" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ICloudConnection", "ICloudObject" FROM anon, authenticated, PUBLIC;
