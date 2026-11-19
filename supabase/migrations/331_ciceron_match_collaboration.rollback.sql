-- Rollback 331 (branch / non-prod only). Reverse order of creation.
-- Does not touch foundation assignments/comments tables.

DROP FUNCTION IF EXISTS ciceron.soft_delete_match_comment(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS ciceron.edit_match_comment(uuid, uuid, uuid, text, uuid[]);
DROP FUNCTION IF EXISTS ciceron.add_match_comment(uuid, uuid, uuid, uuid, text, uuid[]);
DROP FUNCTION IF EXISTS ciceron.update_match_assignment_status(uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS ciceron.assign_match(uuid, uuid, uuid, uuid, uuid, date);
DROP FUNCTION IF EXISTS ciceron.match_firm_client(uuid);

DROP TABLE IF EXISTS ciceron.match_comments;
DROP TABLE IF EXISTS ciceron.match_assignments;
