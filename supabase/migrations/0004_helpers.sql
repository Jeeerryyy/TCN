-- 0004_helpers.sql
-- TCN Technical Requirements Document (TRD) Section 5, 8, 10, 13.4

-- 1. Helper functions for Auth & Roles
CREATE OR REPLACE FUNCTION fn_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION fn_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION fn_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION fn_branch_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. fn_resolve_rate
-- Resolves rate_per_hour for a given table type, wall-clock timestamptz (converted to Asia/Kolkata), and customer type.
CREATE OR REPLACE FUNCTION fn_resolve_rate(
  p_branch_id uuid,
  p_table_type table_type,
  p_at timestamptz,
  p_customer_type customer_type DEFAULT 'walk_in'
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text := 'Asia/Kolkata';
  v_local_time time;
  v_dow int; -- 0 is Sunday, 6 is Saturday
  v_day_type day_type;
  v_rate numeric;
BEGIN
  -- Extract local time and day of week in venue timezone
  v_local_time := (p_at AT TIME ZONE v_tz)::time;
  v_dow := EXTRACT(DOW FROM (p_at AT TIME ZONE v_tz))::int;

  IF v_dow IN (0, 6) THEN
    v_day_type := 'weekend';
  ELSE
    v_day_type := 'weekday';
  END IF;

  -- Select the highest priority matching rule
  SELECT r.rate_per_hour
  INTO v_rate
  FROM rate_rules r
  WHERE r.branch_id = p_branch_id
    AND r.table_type = p_table_type
    AND r.active = true
    AND (r.day_type = 'any' OR r.day_type = v_day_type)
    AND (r.customer_type = 'any' OR r.customer_type = p_customer_type)
    AND (
      -- Normal interval: start_time <= end_time
      (r.start_time <= r.end_time AND v_local_time >= r.start_time AND v_local_time < r.end_time)
      OR
      -- Wrapping interval past midnight: e.g. 22:00 to 02:00
      (r.start_time > r.end_time AND (v_local_time >= r.start_time OR v_local_time < r.end_time))
    )
  ORDER BY
    r.priority DESC,
    -- Tie-breaker: specificity (rules with fewer 'any' win)
    (CASE WHEN r.day_type <> 'any' THEN 1 ELSE 0 END +
     CASE WHEN r.customer_type <> 'any' THEN 1 ELSE 0 END) DESC
  LIMIT 1;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'E_VALIDATION: No active rate rule found for table type % at %', p_table_type, v_local_time
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_rate;
END;
$$;

-- 3. fn_compute_table_charge
-- Full authoritative billing implementation per TRD Section 10
CREATE OR REPLACE FUNCTION fn_compute_table_charge(
  p_session_id uuid,
  p_at timestamptz DEFAULT now()
)
RETURNS TABLE (
  table_charge numeric,
  table_breakdown jsonb,
  total_active_minutes numeric,
  billable_minutes numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
  v_customer_id uuid;
  v_players int;
  v_customer_type customer_type := 'walk_in';
  v_block_min numeric := 15;
  v_min_min numeric := 60;
  v_extra_player_fee numeric := 0;

  v_seg RECORD;
  v_pause RECORD;
  v_seg_start timestamptz;
  v_seg_end timestamptz;
  v_seg_active_sec numeric;
  v_total_active_sec numeric := 0;
  v_active_min numeric;
  v_billable_min numeric;
  v_blocks int;

  v_block_idx int;
  v_block_sec numeric;
  v_cur_active_pos numeric := 0;
  v_target_active_sec numeric;
  v_block_wall_time timestamptz;
  v_block_table_id uuid;
  v_block_table_type table_type;
  v_rate numeric;
  v_block_charge numeric;
  v_total_charge numeric := 0;

  v_breakdown jsonb := '[]'::jsonb;
  v_cur_group_rate numeric := NULL;
  v_cur_group_blocks int := 0;
  v_cur_group_amount numeric := 0;
  v_cur_group_from timestamptz := NULL;
  v_cur_group_to timestamptz := NULL;
  v_cur_group_table_id uuid := NULL;
BEGIN
  -- Get session details
  SELECT s.branch_id, s.customer_id, s.players
  INTO v_branch_id, v_customer_id, v_players
  FROM sessions s
  WHERE s.id = p_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'E_VALIDATION: Session % not found', p_session_id USING ERRCODE = 'P0001';
  END IF;

  -- Load branch settings for billing
  SELECT
    COALESCE((value->>'billing.block_minutes')::numeric, 15),
    COALESCE((value->>'billing.min_minutes')::numeric, 60),
    COALESCE((value->>'billing.extra_player_fee')::numeric, 0)
  INTO v_block_min, v_min_min, v_extra_player_fee
  FROM settings
  WHERE branch_id = v_branch_id AND key = 'billing'
  LIMIT 1;

  IF v_block_min IS NULL OR v_block_min <= 0 THEN v_block_min := 15; END IF;
  IF v_min_min IS NULL OR v_min_min <= 0 THEN v_min_min := 60; END IF;
  IF v_extra_player_fee IS NULL THEN v_extra_player_fee := 0; END IF;

  -- Check if customer has active membership on this bill date
  IF v_customer_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM customer_memberships cm
      WHERE cm.customer_id = v_customer_id
        AND CURRENT_DATE >= cm.starts_on
        AND CURRENT_DATE <= cm.ends_on
    ) THEN
      v_customer_type := 'member';
    END IF;
  END IF;

  -- 1. Compute total active time across segments
  FOR v_seg IN
    SELECT ss.id, ss.table_id, ss.started_at, COALESCE(ss.ended_at, p_at) as ended_at, gt.type as table_type
    FROM session_segments ss
    JOIN game_tables gt ON gt.id = ss.table_id
    WHERE ss.session_id = p_session_id
    ORDER BY ss.started_at ASC
  LOOP
    v_seg_start := v_seg.started_at;
    v_seg_end := v_seg.ended_at;

    IF v_seg_end > v_seg_start THEN
      v_seg_active_sec := EXTRACT(EPOCH FROM (v_seg_end - v_seg_start));

      -- Subtract pauses that overlap with this segment
      FOR v_pause IN
        SELECT sp.paused_at, COALESCE(sp.resumed_at, p_at) as resumed_at
        FROM session_pauses sp
        WHERE sp.session_id = p_session_id
      LOOP
        IF v_pause.resumed_at > v_seg_start AND v_pause.paused_at < v_seg_end THEN
          v_seg_active_sec := v_seg_active_sec - (
            EXTRACT(EPOCH FROM (
              LEAST(v_pause.resumed_at, v_seg_end) - GREATEST(v_pause.paused_at, v_seg_start)
            ))
          );
        END IF;
      END LOOP;

      v_seg_active_sec := GREATEST(0, v_seg_active_sec);
      v_total_active_sec := v_total_active_sec + v_seg_active_sec;
    END IF;
  END LOOP;

  v_active_min := v_total_active_sec / 60.0;

  -- 2. Billable minutes rule per Section 10:
  -- billable_min = greatest(ceil(total_active_minutes), min)
  -- if billable_min > min: billable_min = min + ceil((total_active_minutes - min)/block)*block
  IF v_active_min <= v_min_min THEN
    v_billable_min := v_min_min;
  ELSE
    v_billable_min := v_min_min + CEIL((v_active_min - v_min_min) / v_block_min) * v_block_min;
  END IF;

  v_blocks := ROUND(v_billable_min / v_block_min)::int;
  v_block_sec := v_block_min * 60;

  -- 3. Walk blocks along active timeline
  FOR v_block_idx IN 0..(v_blocks - 1) LOOP
    v_target_active_sec := v_block_idx * v_block_sec;
    v_cur_active_pos := 0;
    v_block_wall_time := NULL;
    v_block_table_id := NULL;

    -- Find which segment and wall-clock time corresponds to this target active second
    FOR v_seg IN
      SELECT ss.table_id, ss.started_at, COALESCE(ss.ended_at, p_at) as ended_at, gt.type as table_type
      FROM session_segments ss
      JOIN game_tables gt ON gt.id = ss.table_id
      WHERE ss.session_id = p_session_id
      ORDER BY ss.started_at ASC
    LOOP
      v_seg_start := v_seg.started_at;
      v_seg_end := v_seg.ended_at;

      IF v_seg_end > v_seg_start THEN
        v_seg_active_sec := EXTRACT(EPOCH FROM (v_seg_end - v_seg_start));

        FOR v_pause IN
          SELECT sp.paused_at, COALESCE(sp.resumed_at, p_at) as resumed_at
          FROM session_pauses sp
          WHERE sp.session_id = p_session_id
        LOOP
          IF v_pause.resumed_at > v_seg_start AND v_pause.paused_at < v_seg_end THEN
            v_seg_active_sec := v_seg_active_sec - (
              EXTRACT(EPOCH FROM (
                LEAST(v_pause.resumed_at, v_seg_end) - GREATEST(v_pause.paused_at, v_seg_start)
              ))
            );
          END IF;
        END LOOP;
        v_seg_active_sec := GREATEST(0, v_seg_active_sec);

        IF (v_cur_active_pos + v_seg_active_sec) > v_target_active_sec OR v_block_wall_time IS NULL THEN
          -- Found the segment containing this block
          v_block_table_id := v_seg.table_id;
          v_block_table_type := v_seg.table_type;
          v_block_wall_time := v_seg_start + ((v_target_active_sec - v_cur_active_pos) || ' seconds')::interval;
        END IF;

        v_cur_active_pos := v_cur_active_pos + v_seg_active_sec;
      END IF;
    END LOOP;

    -- If beyond actual recorded active timeline (e.g. minimum charge top-up), fallback to last segment end
    IF v_block_wall_time IS NULL THEN
      SELECT ss.table_id, COALESCE(ss.ended_at, p_at), gt.type
      INTO v_block_table_id, v_block_wall_time, v_block_table_type
      FROM session_segments ss
      JOIN game_tables gt ON gt.id = ss.table_id
      WHERE ss.session_id = p_session_id
      ORDER BY ss.started_at DESC
      LIMIT 1;
    END IF;

    -- Resolve rate for this block
    v_rate := fn_resolve_rate(v_branch_id, v_block_table_type, v_block_wall_time, v_customer_type);
    v_block_charge := v_rate / (60.0 / v_block_min);
    v_total_charge := v_total_charge + v_block_charge;

    -- Group consecutive blocks of the same rate & table into breakdown json
    IF v_cur_group_rate IS NULL OR v_cur_group_rate <> v_rate OR v_cur_group_table_id <> v_block_table_id THEN
      IF v_cur_group_rate IS NOT NULL THEN
        v_breakdown := v_breakdown || jsonb_build_object(
          'from', v_cur_group_from,
          'to', v_cur_group_to,
          'table_id', v_cur_group_table_id,
          'rate', v_cur_group_rate,
          'blocks', v_cur_group_blocks,
          'amount', ROUND(v_cur_group_amount, 2)
        );
      END IF;
      v_cur_group_rate := v_rate;
      v_cur_group_blocks := 1;
      v_cur_group_amount := v_block_charge;
      v_cur_group_from := v_block_wall_time;
      v_cur_group_to := v_block_wall_time + (v_block_min || ' minutes')::interval;
      v_cur_group_table_id := v_block_table_id;
    ELSE
      v_cur_group_blocks := v_cur_group_blocks + 1;
      v_cur_group_amount := v_cur_group_amount + v_block_charge;
      v_cur_group_to := v_block_wall_time + (v_block_min || ' minutes')::interval;
    END IF;
  END LOOP;

  IF v_cur_group_rate IS NOT NULL THEN
    v_breakdown := v_breakdown || jsonb_build_object(
      'from', v_cur_group_from,
      'to', v_cur_group_to,
      'table_id', v_cur_group_table_id,
      'rate', v_cur_group_rate,
      'blocks', v_cur_group_blocks,
      'amount', ROUND(v_cur_group_amount, 2)
    );
  END IF;

  -- Add extra player fee if players > 2 (per PRD AS-10)
  IF v_players > 2 AND v_extra_player_fee > 0 THEN
    v_total_charge := v_total_charge + ((v_players - 2) * v_extra_player_fee * (v_billable_min / 60.0));
  END IF;

  table_charge := ROUND(v_total_charge); -- round to nearest Rs 1 per PRD 6.2
  table_breakdown := v_breakdown;
  total_active_minutes := ROUND(v_active_min, 1);
  billable_minutes := v_billable_min;
  RETURN NEXT;
END;
$$;
