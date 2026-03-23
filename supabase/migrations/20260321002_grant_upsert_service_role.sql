-- Re-grant service_role permissions on upsert_watch_history_atomic
GRANT EXECUTE ON FUNCTION upsert_watch_history_atomic(UUID, TEXT, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, TEXT, INTEGER) TO service_role;
