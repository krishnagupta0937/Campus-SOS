-- CreateEnum
CREATE TYPE "BreakGlassScope" AS ENUM ('INCIDENT_VIEW', 'LOCATION_VIEW', 'EVIDENCE_VIEW', 'REPORTER_CONTACT_VIEW', 'REALTIME_ACCESS', 'INCIDENT_UPDATE', 'TEMPORARY_TEAM_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "BreakGlassStatus" AS ENUM ('REQUESTED', 'APPROVED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'REJECTED', 'REVIEW_REQUIRED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "BreakGlassType" AS ENUM ('NORMAL_OVERRIDE', 'CRITICAL_BREAK_GLASS');

-- CreateEnum
CREATE TYPE "SupervisorReviewStatus" AS ENUM ('NOT_REQUIRED', 'REVIEW_REQUIRED', 'REVIEWED', 'FLAGGED');

-- AlterEnum
ALTER TYPE "AuditEventType" ADD VALUE 'BREAK_GLASS_REQUESTED';
ALTER TYPE "AuditEventType" ADD VALUE 'BREAK_GLASS_APPROVED';
ALTER TYPE "AuditEventType" ADD VALUE 'BREAK_GLASS_REJECTED';
ALTER TYPE "AuditEventType" ADD VALUE 'BREAK_GLASS_ACTIVATED';
ALTER TYPE "AuditEventType" ADD VALUE 'BREAK_GLASS_EXPIRED';
ALTER TYPE "AuditEventType" ADD VALUE 'BREAK_GLASS_REVOKED';
ALTER TYPE "AuditEventType" ADD VALUE 'BREAK_GLASS_REVIEW_REQUIRED';
ALTER TYPE "AuditEventType" ADD VALUE 'BREAK_GLASS_REVIEWED';

-- CreateTable
CREATE TABLE "break_glass_requests" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "requester_user_id" UUID NOT NULL,
    "requester_team_context" TEXT,
    "type" "BreakGlassType" NOT NULL DEFAULT 'NORMAL_OVERRIDE',
    "status" "BreakGlassStatus" NOT NULL DEFAULT 'REQUESTED',
    "requested_scopes" "BreakGlassScope"[] NOT NULL,
    "approved_scopes" "BreakGlassScope"[] NOT NULL DEFAULT ARRAY[]::"BreakGlassScope"[],
    "reason" TEXT NOT NULL,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approver_user_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "activated_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "revoker_user_id" UUID,
    "revoked_at" TIMESTAMPTZ,
    "revocation_reason" TEXT,
    "rejected_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "supervisor_review_status" "SupervisorReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "reviewer_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "review_notes" TEXT,
    "audit_correlation_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "break_glass_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "break_glass_requests_incident_id_status_idx" ON "break_glass_requests"("incident_id", "status");

-- CreateIndex
CREATE INDEX "break_glass_requests_requester_user_id_status_idx" ON "break_glass_requests"("requester_user_id", "status");

-- CreateIndex
CREATE INDEX "break_glass_requests_status_expires_at_idx" ON "break_glass_requests"("status", "expires_at");

-- AddForeignKey
ALTER TABLE "break_glass_requests" ADD CONSTRAINT "break_glass_requests_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "break_glass_requests" ADD CONSTRAINT "break_glass_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "break_glass_requests" ADD CONSTRAINT "break_glass_requests_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "break_glass_requests" ADD CONSTRAINT "break_glass_requests_revoker_user_id_fkey" FOREIGN KEY ("revoker_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "break_glass_requests" ADD CONSTRAINT "break_glass_requests_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
