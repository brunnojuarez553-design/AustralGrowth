-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT NOT NULL DEFAULT 'EVENT',
    "color" TEXT NOT NULL DEFAULT '#ff7a1a',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" TEXT NOT NULL DEFAULT 'NONE',
    "repeatUntil" TIMESTAMP(3),
    "reminderMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_workspaceId_userId_start_idx" ON "CalendarEvent"("workspaceId", "userId", "start");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Calendar data is accessed only by the authenticated Next.js API using Prisma.
-- The application checks the verified user and workspace on every operation.
ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CalendarEvent" FROM anon, authenticated, PUBLIC;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_end_after_start" CHECK ("end" > "start");
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_kind_valid" CHECK ("kind" IN ('EVENT', 'TASK'));
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_recurrence_valid" CHECK ("recurrence" IN ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY'));
