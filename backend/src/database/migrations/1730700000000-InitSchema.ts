import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema đầu tiên: users, refresh_tokens, captures, tasks.
 * Mỗi task và capture thuộc về đúng một user, xóa user thì xóa hết dữ liệu của user đó.
 */
export class InitSchema1730700000000 implements MigrationInterface {
  name = 'InitSchema1730700000000';

  public async up(q: QueryRunner): Promise<void> {
    // gen_random_uuid() có sẵn từ Postgres 13. Bật pgcrypto để chạy được cả bản cũ hơn.
    await q.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await q.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(254) NOT NULL,
        "password_hash" character varying(100) NOT NULL,
        "display_name" character varying(80),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )`);
    await q.query(`CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email")`);

    await q.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" character(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "revoked_reason" character varying(16),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_refresh_tokens_reason" CHECK ("revoked_reason" IN ('rotated', 'logout', 'logout_all', 'reuse')),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await q.query(`CREATE INDEX "IDX_refresh_tokens_user" ON "refresh_tokens" ("user_id")`);

    await q.query(`
      CREATE TABLE "captures" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "raw_text" text NOT NULL,
        "source" character varying(16) NOT NULL DEFAULT 'text',
        "status" character varying(16) NOT NULL DEFAULT 'pending',
        "drafts" jsonb NOT NULL,
        "task_ids" uuid array NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_captures" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_captures_source" CHECK ("source" IN ('text', 'voice')),
        CONSTRAINT "CHK_captures_status" CHECK ("status" IN ('pending', 'confirmed', 'discarded')),
        CONSTRAINT "FK_captures_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await q.query(`CREATE INDEX "IDX_captures_user_created" ON "captures" ("user_id", "created_at")`);

    await q.query(`
      CREATE TABLE "tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" character varying(200) NOT NULL,
        "deadline" TIMESTAMP WITH TIME ZONE,
        "priority" character varying(16) NOT NULL DEFAULT 'medium',
        "status" character varying(16) NOT NULL DEFAULT 'todo',
        "capture_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "completed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_tasks_priority" CHECK ("priority" IN ('high', 'medium', 'low')),
        CONSTRAINT "CHK_tasks_status" CHECK ("status" IN ('todo', 'done')),
        CONSTRAINT "FK_tasks_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tasks_capture" FOREIGN KEY ("capture_id") REFERENCES "captures"("id") ON DELETE SET NULL
      )`);
    // Truy vấn nóng nhất là Top 3: task chưa xong của một user.
    await q.query(`CREATE INDEX "IDX_tasks_user_status" ON "tasks" ("user_id", "status")`);
    await q.query(`CREATE INDEX "IDX_tasks_capture" ON "tasks" ("capture_id")`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "tasks"`);
    await q.query(`DROP TABLE "captures"`);
    await q.query(`DROP TABLE "refresh_tokens"`);
    await q.query(`DROP TABLE "users"`);
  }
}
