-- AlterTable: add reliability, concurrency locking, and retry fields to outbox_events
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "last_error" TEXT;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMPTZ;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "locked_by" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");
