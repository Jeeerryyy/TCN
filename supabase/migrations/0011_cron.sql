-- ============================================================================
-- Migration: 0011_cron.sql
-- Description: Scheduled pg_cron jobs for alerts, booking expiry, and pruning
-- ============================================================================

DO $$
BEGIN
  -- Check if pg_cron extension is available before scheduling
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- 1. Generate venue alerts every minute (Y-01)
    PERFORM cron.schedule(
      'tcn-alerts-generator',
      '* * * * *',
      'SELECT fn_generate_alerts()'
    );

    -- 2. Expire unpaid online bookings after hold time every minute (Y-02)
    PERFORM cron.schedule(
      'tcn-booking-expiry',
      '* * * * *',
      'SELECT fn_expire_bookings()'
    );

    -- 3. Nightly pruning of old alerts and op_logs at 3:00 AM Kolkata time (TRD Section 12.10)
    PERFORM cron.schedule(
      'tcn-nightly-prune',
      '0 3 * * *',
      $cron$
        DELETE FROM alerts WHERE created_at < now() - interval '14 days';
        DELETE FROM op_log WHERE created_at < now() - interval '30 days';
      $cron$
    );
  END IF;
END $$;
