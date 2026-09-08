-- -------------------------------------------------------------------------
-- Attendance meeting fields
-- -------------------------------------------------------------------------

ALTER TABLE "AttendanceSession"
ADD COLUMN IF NOT EXISTS "meetLink" TEXT;

ALTER TABLE "AttendanceSession"
ADD COLUMN IF NOT EXISTS "meetingId" TEXT;

ALTER TABLE "AttendanceSession"
ADD COLUMN IF NOT EXISTS "passcode" TEXT;


/*
 * Safely migrate old Zoom columns if they happen to exist
 * in any environment.
 */
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'AttendanceSession'
      AND column_name = 'zoomLink'
  ) THEN
    EXECUTE '
      UPDATE "AttendanceSession"
      SET "meetLink" = "zoomLink"
      WHERE "meetLink" IS NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'AttendanceSession'
      AND column_name = 'zoomMeetingId'
  ) THEN
    EXECUTE '
      UPDATE "AttendanceSession"
      SET "meetingId" = "zoomMeetingId"
      WHERE "meetingId" IS NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'AttendanceSession'
      AND column_name = 'zoomPasscode'
  ) THEN
    EXECUTE '
      UPDATE "AttendanceSession"
      SET "passcode" = "zoomPasscode"
      WHERE "passcode" IS NULL
    ';
  END IF;
END $$;


-- -------------------------------------------------------------------------
-- Multiple trainers per internship
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "InternshipTrainer" (
  "id" TEXT NOT NULL,
  "internshipId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InternshipTrainer_pkey"
    PRIMARY KEY ("id")
);


CREATE UNIQUE INDEX IF NOT EXISTS
"InternshipTrainer_internshipId_trainerId_key"
ON "InternshipTrainer"("internshipId", "trainerId");


CREATE INDEX IF NOT EXISTS
"InternshipTrainer_internshipId_idx"
ON "InternshipTrainer"("internshipId");


CREATE INDEX IF NOT EXISTS
"InternshipTrainer_trainerId_idx"
ON "InternshipTrainer"("trainerId");


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'InternshipTrainer_internshipId_fkey'
  ) THEN

    ALTER TABLE "InternshipTrainer"
    ADD CONSTRAINT
      "InternshipTrainer_internshipId_fkey"
    FOREIGN KEY ("internshipId")
    REFERENCES "Internship"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

  END IF;
END $$;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'InternshipTrainer_trainerId_fkey'
  ) THEN

    ALTER TABLE "InternshipTrainer"
    ADD CONSTRAINT
      "InternshipTrainer_trainerId_fkey"
    FOREIGN KEY ("trainerId")
    REFERENCES "Trainer"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

  END IF;
END $$;


/*
 * Preserve existing single-trainer assignments.
 *
 * Only runs if the old trainerId column currently exists.
 */
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Internship'
      AND column_name = 'trainerId'
  ) THEN

    EXECUTE '
      INSERT INTO "InternshipTrainer"
        ("id", "internshipId", "trainerId", "assignedAt")

      SELECT
        gen_random_uuid()::text,
        "id",
        "trainerId",
        CURRENT_TIMESTAMP

      FROM "Internship"

      WHERE "trainerId" IS NOT NULL

      ON CONFLICT
        ("internshipId", "trainerId")
      DO NOTHING
    ';

  END IF;
END $$;