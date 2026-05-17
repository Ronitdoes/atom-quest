-- Defense-in-depth constraints for workflow and audit integrity.
ALTER TABLE "Goal" ADD CONSTRAINT "goal_target_nonnegative_check" CHECK ("target" >= 0);
ALTER TABLE "Goal" ADD CONSTRAINT "goal_weightage_max_check" CHECK ("weightage" <= 100);

ALTER TABLE "GoalAchievement" ADD CONSTRAINT "goal_achievement_quarter_check" CHECK ("quarter" BETWEEN 1 AND 4);
ALTER TABLE "GoalAchievement" ADD CONSTRAINT "goal_achievement_value_nonnegative_check" CHECK ("value" >= 0);
ALTER TABLE "GoalAchievement" ADD CONSTRAINT "goal_achievement_status_check" CHECK ("status" IN ('Not Started', 'On Track', 'Completed'));

ALTER TABLE "CycleWindow" ADD CONSTRAINT "cycle_window_quarter_check" CHECK ("quarter" BETWEEN 1 AND 4);
ALTER TABLE "CycleWindow" ADD CONSTRAINT "cycle_window_status_check" CHECK ("status" IN ('UPCOMING', 'OPEN', 'CLOSED'));
ALTER TABLE "CycleWindow" ADD CONSTRAINT "cycle_window_date_order_check" CHECK ("startDate" < "endDate");

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog records are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_prevent_update
BEFORE UPDATE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER audit_log_prevent_delete
BEFORE DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
