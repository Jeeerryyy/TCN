-- 0009_rpc_admin_reports.sql
-- TCN Technical Requirements Document (TRD) Section 13 & PRD Traces A-05, A-30, A-31, S-50, S-51

-- 1. rpc_report_daily_revenue (A-05, A-30)
CREATE OR REPLACE FUNCTION rpc_report_daily_revenue(
  p_from date,
  p_to date
)
RETURNS TABLE (
  report_date date,
  table_revenue numeric(10,2),
  cafe_revenue numeric(10,2),
  membership_revenue numeric(10,2),
  total_revenue numeric(10,2),
  session_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  SELECT id INTO v_branch_id FROM branches LIMIT 1;

  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(p_from, p_to, interval '1 day')::date AS d
  ),
  daily_bills AS (
    SELECT
      b.paid_at::date AS dt,
      sum(CASE WHEN b.kind = 'session' THEN b.table_charge ELSE 0 END) AS tbl_rev,
      sum(b.cafe_total) AS cafe_rev,
      sum(CASE WHEN b.kind = 'membership' THEN b.total ELSE 0 END) AS mem_rev,
      sum(b.total) AS tot_rev,
      count(CASE WHEN b.kind = 'session' THEN 1 ELSE NULL END) AS sess_cnt
    FROM bills b
    WHERE b.branch_id = v_branch_id
      AND b.status = 'paid'
      AND b.paid_at::date BETWEEN p_from AND p_to
    GROUP BY b.paid_at::date
  )
  SELECT
    d.d AS report_date,
    coalesce(db.tbl_rev, 0.00)::numeric(10,2) AS table_revenue,
    coalesce(db.cafe_rev, 0.00)::numeric(10,2) AS cafe_revenue,
    coalesce(db.mem_rev, 0.00)::numeric(10,2) AS membership_revenue,
    coalesce(db.tot_rev, 0.00)::numeric(10,2) AS total_revenue,
    coalesce(db.sess_cnt, 0)::int AS session_count
  FROM dates d
  LEFT JOIN daily_bills db ON db.dt = d.d
  ORDER BY d.d ASC;
END;
$$;

-- 2. rpc_report_utilization (A-30)
CREATE OR REPLACE FUNCTION rpc_report_utilization(
  p_from date,
  p_to date
)
RETURNS TABLE (
  table_id uuid,
  table_name text,
  table_type table_type,
  active_minutes numeric(10,2),
  total_minutes numeric(10,2),
  utilization_pct numeric(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
  v_days int;
  v_operating_hours_per_day numeric := 14.0; -- 10:00 to 24:00
  v_total_available_minutes numeric;
BEGIN
  SELECT id INTO v_branch_id FROM branches LIMIT 1;
  v_days := greatest(1, (p_to - p_from) + 1);
  v_total_available_minutes := v_days * v_operating_hours_per_day * 60.0;

  RETURN QUERY
  WITH table_active AS (
    SELECT
      gt.id AS t_id,
      gt.name AS t_name,
      gt.type AS t_type,
      coalesce(
        sum(
          extract(epoch FROM (least(coalesce(s.ended_at, now()), (p_to + 1)::timestamp) - greatest(s.started_at, p_from::timestamp))) / 60.0
        ), 0
      ) AS act_min
    FROM game_tables gt
    LEFT JOIN sessions s ON s.table_id = gt.id
      AND s.status IN ('running', 'paused', 'completed')
      AND s.started_at < (p_to + 1)::timestamp
      AND coalesce(s.ended_at, now()) > p_from::timestamp
    WHERE gt.branch_id = v_branch_id
      AND gt.active = true
    GROUP BY gt.id, gt.name, gt.type
  )
  SELECT
    ta.t_id AS table_id,
    ta.t_name AS table_name,
    ta.t_type AS table_type,
    round(ta.act_min, 2) AS active_minutes,
    round(v_total_available_minutes, 2) AS total_minutes,
    round(least(100.0, (ta.act_min / nullif(v_total_available_minutes, 0)) * 100.0), 2)::numeric(5,2) AS utilization_pct
  FROM table_active ta
  ORDER BY ta.t_name ASC;
END;
$$;

-- 3. rpc_report_peak_hours (A-30)
CREATE OR REPLACE FUNCTION rpc_report_peak_hours(
  p_from date,
  p_to date
)
RETURNS TABLE (
  day_of_week int,
  hour_of_day int,
  session_count int,
  active_minutes numeric(10,2),
  revenue numeric(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  SELECT id INTO v_branch_id FROM branches LIMIT 1;

  RETURN QUERY
  WITH slots AS (
    SELECT
      extract(dow FROM s.started_at)::int AS dow,
      extract(hour FROM s.started_at)::int AS hod,
      count(*)::int AS s_cnt,
      sum(extract(epoch FROM (coalesce(s.ended_at, now()) - s.started_at)) / 60.0) AS act_m,
      sum(coalesce(b.total, 0)) AS rev
    FROM sessions s
    LEFT JOIN bills b ON b.session_id = s.id AND b.status = 'paid'
    WHERE s.branch_id = v_branch_id
      AND s.started_at >= p_from::timestamp
      AND s.started_at < (p_to + 1)::timestamp
    GROUP BY extract(dow FROM s.started_at)::int, extract(hour FROM s.started_at)::int
  )
  SELECT
    sl.dow AS day_of_week,
    sl.hod AS hour_of_day,
    sl.s_cnt AS session_count,
    round(coalesce(sl.act_m, 0), 2) AS active_minutes,
    round(coalesce(sl.rev, 0), 2) AS revenue
  FROM slots sl
  ORDER BY sl.dow ASC, sl.hod ASC;
END;
$$;

-- 4. rpc_report_top_items (A-30)
CREATE OR REPLACE FUNCTION rpc_report_top_items(
  p_from date,
  p_to date,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  item_id uuid,
  item_name text,
  category_name text,
  qty_sold int,
  revenue numeric(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  SELECT id INTO v_branch_id FROM branches LIMIT 1;

  RETURN QUERY
  SELECT
    oi.menu_item_id AS item_id,
    oi.name_snapshot AS item_name,
    coalesce(mc.name, 'Other') AS category_name,
    sum(oi.qty)::int AS qty_sold,
    round(sum(oi.price_snapshot * oi.qty), 2) AS revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN bills b ON (b.session_id = o.session_id OR b.id = o.session_id) AND b.status = 'paid'
  LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
  LEFT JOIN menu_categories mc ON mc.id = mi.category_id
  WHERE b.branch_id = v_branch_id
    AND b.paid_at::date BETWEEN p_from AND p_to
  GROUP BY oi.menu_item_id, oi.name_snapshot, mc.name
  ORDER BY qty_sold DESC
  LIMIT p_limit;
END;
$$;

-- 5. rpc_report_profit (A-30)
CREATE OR REPLACE FUNCTION rpc_report_profit(
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
  v_rev numeric(10,2) := 0.00;
  v_exp numeric(10,2) := 0.00;
  v_cat_exp jsonb;
BEGIN
  SELECT id INTO v_branch_id FROM branches LIMIT 1;

  SELECT coalesce(sum(total), 0.00) INTO v_rev
  FROM bills
  WHERE branch_id = v_branch_id
    AND status = 'paid'
    AND paid_at::date BETWEEN p_from AND p_to;

  SELECT coalesce(sum(amount), 0.00) INTO v_exp
  FROM expenses
  WHERE branch_id = v_branch_id
    AND spent_on BETWEEN p_from AND p_to;

  SELECT coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb) INTO v_cat_exp
  FROM (
    SELECT category, sum(amount) AS amount
    FROM expenses
    WHERE branch_id = v_branch_id
      AND spent_on BETWEEN p_from AND p_to
    GROUP BY category
    ORDER BY amount DESC
  ) c;

  RETURN jsonb_build_object(
    'total_revenue', v_rev,
    'total_expenses', v_exp,
    'net_profit', (v_rev - v_exp),
    'expenses_by_category', v_cat_exp
  );
END;
$$;

-- 6. rpc_attendance_toggle (S-50, S-51)
CREATE OR REPLACE FUNCTION rpc_attendance_toggle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch_id uuid;
  v_staff_id uuid := auth.uid();
  v_open_att attendance%ROWTYPE;
  v_res jsonb;
BEGIN
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'E_AUTH: Unauthorized';
  END IF;

  SELECT id INTO v_branch_id FROM branches LIMIT 1;

  -- Check if open check-in exists
  SELECT * INTO v_open_att
  FROM attendance
  WHERE staff_id = v_staff_id AND check_out IS NULL
  ORDER BY check_in DESC
  LIMIT 1;

  IF FOUND THEN
    -- Check out (S-51)
    UPDATE attendance
    SET check_out = now()
    WHERE id = v_open_att.id;

    SELECT row_to_json(a)::jsonb INTO v_res
    FROM (
      SELECT att.*, 'check_out' AS action
      FROM attendance att WHERE att.id = v_open_att.id
    ) a;
  ELSE
    -- Check in (S-50)
    INSERT INTO attendance (
      branch_id,
      staff_id,
      check_in
    ) VALUES (
      v_branch_id,
      v_staff_id,
      now()
    )
    RETURNING id INTO v_open_att.id;

    SELECT row_to_json(a)::jsonb INTO v_res
    FROM (
      SELECT att.*, 'check_in' AS action
      FROM attendance att WHERE att.id = v_open_att.id
    ) a;
  END IF;

  RETURN v_res;
END;
$$;
