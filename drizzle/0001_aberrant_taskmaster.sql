ALTER TABLE "user" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE OR REPLACE FUNCTION sync_user_role_rbac()
RETURNS TRIGGER AS $$
DECLARE
    target_role_id UUID;
BEGIN
    IF TG_OP = 'INSERT'
        OR OLD.role IS DISTINCT FROM NEW.role
        OR NOT EXISTS (
            SELECT 1
            FROM "role_permissions"
            WHERE "user_id" = NEW.id
        ) THEN
        INSERT INTO "role" ("name", "level")
        VALUES (
            NEW.role,
            CASE NEW.role
                WHEN 'superadmin' THEN 2
                WHEN 'moderator' THEN 1
                ELSE 0
            END
        )
        ON CONFLICT ("name") DO UPDATE
        SET "updated_at" = now()
        RETURNING "id" INTO target_role_id;

        DELETE FROM "role_permissions"
        WHERE "user_id" = NEW.id;

        INSERT INTO "role_permissions" ("user_id", "role_id", "permission_id")
        SELECT NEW.id, target_role_id, p.id
        FROM "permissions" p
        WHERE p.code LIKE NEW.role::text || ':%'
        UNION ALL
        SELECT NEW.id, target_role_id, NULL
        WHERE NOT EXISTS (
            SELECT 1
            FROM "permissions" p
            WHERE p.code LIKE NEW.role::text || ':%'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
DROP TRIGGER IF EXISTS trigger_sync_user_role ON "user";--> statement-breakpoint
CREATE TRIGGER trigger_sync_user_role
AFTER INSERT OR UPDATE ON "user"
FOR EACH ROW
EXECUTE FUNCTION sync_user_role_rbac();--> statement-breakpoint
UPDATE "user"
SET "role" = "role";
