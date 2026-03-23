-- Re-grant permissions on the 9-param upsert_watch_history_atomic
GRANT EXECUTE ON FUNCTION upsert_watch_history_atomic(UUID, TEXT, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, TEXT, INTEGER) TO authenticated;
