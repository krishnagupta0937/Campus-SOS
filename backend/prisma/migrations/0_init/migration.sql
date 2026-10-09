-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'CAMPUS_ADMIN', 'CHIEF_PROCTOR', 'SECURITY', 'MEDICAL', 'FIRE_SAFETY', 'WOMEN_SAFETY', 'MEN_SAFETY', 'STUDENT_COUNCIL', 'INFRASTRUCTURE', 'TRANSPORTATION', 'IT_DIGITAL');

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('student', 'staff', 'personnel');

-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('EMERGENCY_SOS', 'STANDARD_REPORT');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('DRAFT', 'CREATED', 'TEAMS_NOTIFIED', 'RESPONDER_ASSIGNED', 'RESPONDER_ON_THE_WAY', 'RESPONDER_AT_LOCATION', 'RESOLVED', 'REOPENED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DutyState" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'REJECTED', 'TIMED_OUT', 'CANCELLED', 'EN_ROUTE', 'ON_SCENE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "LocationKind" AS ENUM ('ROOM', 'CLASSROOM', 'LABORATORY', 'BLOCK', 'LIBRARY', 'CANTEEN', 'PARKING', 'GROUND', 'HOSTEL', 'OTHER');

-- CreateEnum
CREATE TYPE "ClassSource" AS ENUM ('AI', 'RULE_FALLBACK', 'STUDENT', 'ADMIN_OVERRIDE');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('ACT', 'KNOW', 'REPORTER', 'CAMPUS_WIDE', 'AREA');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('IN_APP', 'PUSH', 'SMS', 'VOICE', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('INCIDENT_CREATED', 'SOS_CONFIRMED', 'AI_CLASSIFICATION', 'ROUTING_DECISION', 'NOTIFICATION_SENT', 'RESPONDER_ASSIGNED', 'RESPONDER_ACCEPTED', 'RESPONDER_REJECTED', 'REASSIGNED', 'STATUS_CHANGED', 'RESOLVED', 'ADMIN_ACTION', 'TEAM_ASSIGNMENT_CHANGED', 'ACCESS_EVENT', 'ACCESS_RESTRICTED_CASE', 'PHOTO_VIEWED', 'AI_FALLBACK_USED', 'ESCALATED', 'DUTY_STATE_CHANGED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "user_type" "UserType" NOT NULL,
    "role" "UserRole" NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT,
    "sso_subject" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "assignment_mode" TEXT NOT NULL DEFAULT 'AUTO_ASSIGN',
    "offer_timeout_sos_seconds" INTEGER NOT NULL DEFAULT 45,
    "offer_timeout_standard_seconds" INTEGER NOT NULL DEFAULT 600,
    "sos_parallel_offer" BOOLEAN NOT NULL DEFAULT true,
    "allow_busy_override_for_sos" BOOLEAN NOT NULL DEFAULT false,
    "coordinator_member_id" UUID,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "designation" TEXT,
    "is_coordinator" BOOLEAN NOT NULL DEFAULT false,
    "can_view_restricted" BOOLEAN NOT NULL DEFAULT false,
    "is_directory_visible" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responder_profiles" (
    "member_id" UUID NOT NULL,
    "duty_state" "DutyState" NOT NULL DEFAULT 'OFFLINE',
    "duty_state_changed_at" TIMESTAMPTZ,
    "duty_state_changed_by" UUID,
    "change_reason" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_assigned_at" TIMESTAMPTZ,
    "current_assignment_count" INTEGER NOT NULL DEFAULT 0,
    "push_subscription_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "sms_phone" TEXT,

    CONSTRAINT "responder_profiles_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "duty_schedules" (
    "id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "recurrence" TEXT,
    "created_by" UUID NOT NULL,

    CONSTRAINT "duty_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_maps" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "width_px" INTEGER NOT NULL,
    "height_px" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campus_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predefined_locations" (
    "id" UUID NOT NULL,
    "map_id" UUID NOT NULL,
    "kind" "LocationKind" NOT NULL,
    "name" TEXT NOT NULL,
    "anchor_x" DECIMAL(7,6),
    "anchor_y" DECIMAL(7,6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "predefined_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" UUID NOT NULL,
    "public_id" TEXT NOT NULL,
    "workflow" "WorkflowType" NOT NULL,
    "reporter_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "student_category" TEXT,
    "final_category" TEXT NOT NULL DEFAULT 'OTHER',
    "status" "IncidentStatus" NOT NULL DEFAULT 'CREATED',
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,
    "immediate_danger" BOOLEAN NOT NULL DEFAULT false,
    "campus_wide_eligible" BOOLEAN NOT NULL DEFAULT false,
    "explore_visible" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_team_notified_at" TIMESTAMPTZ,
    "first_accepted_at" TIMESTAMPTZ,
    "responder_arrived_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "resolution_summary" TEXT,
    "resolution_code" TEXT,
    "idempotency_key" TEXT,
    "is_drill" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_drafts" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "workflow" "WorkflowType" NOT NULL,
    "payload" JSONB NOT NULL,
    "classification_preview" JSONB,
    "routing_preview" JSONB,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_locations" (
    "incident_id" UUID NOT NULL,
    "map_id" UUID,
    "predefined_location_id" UUID,
    "location_kind" "LocationKind",
    "location_text" TEXT,
    "pin_x" DECIMAL(7,6),
    "pin_y" DECIMAL(7,6),
    "gps_lat" DECIMAL(9,6),
    "gps_lng" DECIMAL(9,6),

    CONSTRAINT "incident_locations_pkey" PRIMARY KEY ("incident_id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "incident_id" UUID,
    "draft_id" UUID,
    "uploader_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width_px" INTEGER,
    "height_px" INTEGER,
    "sha256" TEXT,
    "scan_status" TEXT NOT NULL DEFAULT 'PENDING',
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_classifications" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "source" "ClassSource" NOT NULL,
    "model" TEXT,
    "prompt_version" TEXT,
    "input_snapshot" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "confidence" DECIMAL(4,3) NOT NULL,
    "immediate_danger" BOOLEAN NOT NULL,
    "reasoning" TEXT,
    "latency_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_decisions" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "classification_id" UUID NOT NULL,
    "config_version" INTEGER NOT NULL,
    "matched_rules" TEXT[],
    "teams" JSONB NOT NULL,
    "restrictions" JSONB NOT NULL,
    "audience" JSONB NOT NULL,
    "flags" TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_teams" (
    "incident_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "granted_by" TEXT NOT NULL,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "incident_teams_pkey" PRIMARY KEY ("incident_id","team_id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'OFFERED',
    "offered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "en_route_at" TIMESTAMPTZ,
    "on_scene_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "reject_reason" TEXT,
    "attempt_no" INTEGER NOT NULL DEFAULT 1,
    "slot_no" INTEGER NOT NULL DEFAULT 1,
    "assigned_by" TEXT NOT NULL DEFAULT 'AUTO',

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_status_history" (
    "id" UUID NOT NULL,
    "incident_id" UUID NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "incident_id" UUID,
    "audience_type" "AudienceType" NOT NULL,
    "recipient_user_id" UUID,
    "notice_id" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "notification_id" UUID NOT NULL,
    "channel" "Channel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "provider_message_id" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "error_code" TEXT,
    "sent_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_notices" (
    "id" UUID NOT NULL,
    "incident_id" UUID,
    "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "sanitized_body" TEXT NOT NULL,
    "area_text" TEXT,
    "starts_at" TIMESTAMPTZ,
    "ends_at" TIMESTAMPTZ,
    "drafted_by" TEXT NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "auto_published" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campus_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_rules" (
    "id" UUID NOT NULL,
    "rule_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL,
    "condition" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "description" TEXT,
    "updated_by" UUID,

    CONSTRAINT "routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotlines" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_24x7" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "hotlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" BIGSERIAL NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" "AuditEventType" NOT NULL,
    "incident_id" UUID,
    "actor_user_id" UUID,
    "actor_kind" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "prev_hash" BYTEA,
    "hash" BYTEA,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "platform" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_info" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "rotated_from" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_sso_subject_key" ON "users"("sso_subject");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_user_type_idx" ON "users"("user_type");

-- CreateIndex
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "responder_profiles_duty_state_idx" ON "responder_profiles"("duty_state");

-- CreateIndex
CREATE INDEX "predefined_locations_map_id_kind_idx" ON "predefined_locations"("map_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_public_id_key" ON "incidents"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_idempotency_key_key" ON "incidents"("idempotency_key");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_workflow_status_idx" ON "incidents"("workflow", "status");

-- CreateIndex
CREATE INDEX "incidents_final_category_idx" ON "incidents"("final_category");

-- CreateIndex
CREATE INDEX "incidents_reporter_id_created_at_idx" ON "incidents"("reporter_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "incidents_created_at_idx" ON "incidents"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "attachments_incident_id_position_key" ON "attachments"("incident_id", "position");

-- CreateIndex
CREATE INDEX "ai_classifications_incident_id_created_at_idx" ON "ai_classifications"("incident_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "incident_teams_team_id_revoked_at_idx" ON "incident_teams"("team_id", "revoked_at");

-- CreateIndex
CREATE INDEX "assignments_incident_id_idx" ON "assignments"("incident_id");

-- CreateIndex
CREATE INDEX "assignments_member_id_status_idx" ON "assignments"("member_id", "status");

-- CreateIndex
CREATE INDEX "assignments_status_expires_at_idx" ON "assignments"("status", "expires_at");

-- CreateIndex
CREATE INDEX "incident_status_history_incident_id_created_at_idx" ON "incident_status_history"("incident_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_created_at_idx" ON "notifications"("recipient_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_incident_id_idx" ON "notifications"("incident_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_notification_id_idx" ON "notification_deliveries"("notification_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries"("status");

-- CreateIndex
CREATE INDEX "audit_events_incident_id_occurred_at_idx" ON "audit_events"("incident_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_events_event_type_occurred_at_idx" ON "audit_events"("event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_token_hash_idx" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "outbox_events_processed_created_at_idx" ON "outbox_events"("processed", "created_at");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responder_profiles" ADD CONSTRAINT "responder_profiles_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "team_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responder_profiles" ADD CONSTRAINT "responder_profiles_duty_state_changed_by_fkey" FOREIGN KEY ("duty_state_changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campus_maps" ADD CONSTRAINT "campus_maps_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predefined_locations" ADD CONSTRAINT "predefined_locations_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "campus_maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_drafts" ADD CONSTRAINT "incident_drafts_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_locations" ADD CONSTRAINT "incident_locations_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_locations" ADD CONSTRAINT "incident_locations_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "campus_maps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_locations" ADD CONSTRAINT "incident_locations_predefined_location_id_fkey" FOREIGN KEY ("predefined_location_id") REFERENCES "predefined_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "incident_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_classifications" ADD CONSTRAINT "ai_classifications_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_classification_id_fkey" FOREIGN KEY ("classification_id") REFERENCES "ai_classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_teams" ADD CONSTRAINT "incident_teams_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_teams" ADD CONSTRAINT "incident_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "team_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_status_history" ADD CONSTRAINT "incident_status_history_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "campus_notices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campus_notices" ADD CONSTRAINT "campus_notices_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

