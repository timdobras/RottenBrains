-- Re-grant permissions after recreating the function
GRANT EXECUTE ON FUNCTION upsert_watch_history_atomic(UUID, TEXT, INTEGER, INTEGER, NUMERIC, INTEGER, INTEGER, TEXT, INTEGER) TO authenticated;
