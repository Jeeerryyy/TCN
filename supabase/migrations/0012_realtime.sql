-- ============================================================================
-- Migration: 0012_realtime.sql
-- Description: Enable Postgres Realtime replication for all TRD Section 9 tables
-- ============================================================================

DO $$
BEGIN
  -- Add tables to supabase_realtime publication if it exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_tables;
    ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
    ALTER PUBLICATION supabase_realtime ADD TABLE session_pauses;
    ALTER PUBLICATION supabase_realtime ADD TABLE session_segments;
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE bills;
    ALTER PUBLICATION supabase_realtime ADD TABLE bill_payments;
    ALTER PUBLICATION supabase_realtime ADD TABLE discount_requests;
    ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
    ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE menu_categories;
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;
END $$;
