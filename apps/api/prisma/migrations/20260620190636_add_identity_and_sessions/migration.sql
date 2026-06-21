/*
  Warnings:

  - The values [REFRESH_TOKEN_REUSED] on the enum `AuthAuditAction` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "SessionRevocationReason" AS ENUM ('ROTATED', 'LOGOUT', 'LOGOUT_ALL', 'TOKEN_REUSE', 'ACCOUNT_DISABLED', 'PASSWORD_CHANGED');

-- AlterEnum
BEGIN;
CREATE TYPE "AuthAuditAction_new" AS ENUM ('REGISTERED', 'LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'TOKEN_REFRESHED', 'TOKEN_REUSE_DETECTED', 'LOGGED_OUT', 'LOGGED_OUT_ALL');
ALTER TABLE "auth_audit_logs" ALTER COLUMN "action" TYPE "AuthAuditAction_new" USING ("action"::text::"AuthAuditAction_new");
ALTER TYPE "AuthAuditAction" RENAME TO "AuthAuditAction_old";
ALTER TYPE "AuthAuditAction_new" RENAME TO "AuthAuditAction";
DROP TYPE "public"."AuthAuditAction_old";
COMMIT;

-- AlterTable
ALTER TABLE "auth_audit_logs" ADD COLUMN     "session_id" UUID;

-- AlterTable
ALTER TABLE "refresh_sessions" ADD COLUMN     "revoked_reason" "SessionRevocationReason";

-- CreateIndex
CREATE INDEX "refresh_sessions_user_id_revoked_at_idx" ON "refresh_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");
