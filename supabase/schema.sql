-- ============================================================
-- FARMGRID DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── PROFILES (extends auth.users) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('farmer', 'organization', 'admin')),
  full_name   TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FARMERS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.farmers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT,
  village               TEXT,
  district              TEXT,
  state                 TEXT,
  lat                   DOUBLE PRECISION DEFAULT 20.5937,
  lng                   DOUBLE PRECISION DEFAULT 78.9629,
  farm_size_acres       NUMERIC DEFAULT 0,
  primary_crop          TEXT,
  crop_stage            TEXT CHECK (crop_stage IN ('seedling','vegetative','flowering','harvesting','post_harvest')),
  allocation_attempts   INT DEFAULT 0,
  successful_allocations INT DEFAULT 0,
  consecutive_losses    INT DEFAULT 0,
  waiting_started_at    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ORGANIZATIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_name            TEXT NOT NULL,
  contact_person      TEXT,
  contact_number      TEXT,
  address             TEXT,
  operational_region  TEXT,
  org_type            TEXT CHECK (org_type IN ('private_company','cooperative','ngo','government')),
  is_approved         BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── RESOURCES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.resources (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN (
    'tractor','harvester','portable_pump','drip_irrigation','sprinkler',
    'drone_spraying','labour_team','tiller','seeder','cold_storage','mini_truck','soil_testing'
  )),
  description           TEXT,
  quantity              INT DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','allocated','maintenance','retired')),
  daily_rate            NUMERIC,
  lat                   DOUBLE PRECISION,
  lng                   DOUBLE PRECISION,
  operating_hours_start INT DEFAULT 6,
  operating_hours_end   INT DEFAULT 20,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── REQUESTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id           UUID NOT NULL REFERENCES public.farmers(id),
  organization_id     UUID REFERENCES public.organizations(id),
  resource_id         UUID REFERENCES public.resources(id),
  resource_type       TEXT NOT NULL,
  resource_needed     TEXT NOT NULL,
  earliest_start      TIMESTAMPTZ NOT NULL,
  latest_end          TIMESTAMPTZ NOT NULL,
  duration_days       INT NOT NULL DEFAULT 1,
  crop_stage          TEXT NOT NULL CHECK (crop_stage IN ('seedling','vegetative','flowering','harvesting','post_harvest')),
  urgency_level       TEXT NOT NULL CHECK (urgency_level IN ('low','medium','high','critical')),
  urgency_reason      TEXT,
  farm_lat            DOUBLE PRECISION,
  farm_lng            DOUBLE PRECISION,
  additional_notes    TEXT,
  status              TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'draft','submitted','validating','pending_conflict','allocated','confirmed',
    'rejected','cancelled','rescheduled','disrupted','completed','failed','waitlisted','manual_review'
  )),
  priority_score      NUMERIC,
  priority_breakdown  JSONB,
  allocation_method   TEXT,
  waitlist_reason     TEXT,
  manual_review_reason TEXT,
  voice_request       BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ALLOCATIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.allocations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          UUID NOT NULL REFERENCES public.requests(id),
  resource_id         UUID NOT NULL REFERENCES public.resources(id),
  farmer_id           UUID NOT NULL REFERENCES public.farmers(id),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id),
  scheduled_start     TIMESTAMPTZ NOT NULL,
  scheduled_end       TIMESTAMPTZ NOT NULL,
  status              TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled','confirmed','active','completed','cancelled','disrupted','rescheduled'
  )),
  priority_score      NUMERIC,
  priority_breakdown  JSONB,
  allocation_method   TEXT NOT NULL DEFAULT 'auto',
  fcfs_tiebreak       BOOLEAN DEFAULT FALSE,
  tiebreak_explanation TEXT,
  admin_note          TEXT,
  cancelled_reason    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent double booking: no two active allocations can overlap for same resource
  CONSTRAINT no_double_booking EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(scheduled_start, scheduled_end) WITH &&
  ) WHERE (status NOT IN ('cancelled','completed'))
);

-- ─── CONFLICTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conflicts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id       UUID NOT NULL REFERENCES public.resources(id),
  request_ids       UUID[] NOT NULL,
  ranked_requests   JSONB NOT NULL DEFAULT '[]',
  score_delta       NUMERIC DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','auto_resolved','resolved')),
  resolution        TEXT,
  winner_request_id UUID REFERENCES public.requests(id),
  resolved_by       TEXT,
  resolved_at       TIMESTAMPTZ,
  auto_resolved     BOOLEAN DEFAULT FALSE,
  admin_note        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('success','warning','info','error')),
  is_read     BOOLEAN DEFAULT FALSE,
  entity_type TEXT,
  entity_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── AUDIT LOGS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES public.profiles(id),
  actor_name    TEXT NOT NULL DEFAULT 'System',
  actor_role    TEXT,
  action        TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     UUID,
  details       TEXT,
  metadata      JSONB,
  previous_state JSONB,
  new_state     JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DISRUPTIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disruptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id     UUID NOT NULL REFERENCES public.resources(id),
  allocation_id   UUID REFERENCES public.allocations(id),
  reason          TEXT NOT NULL,
  reported_by     UUID REFERENCES public.profiles(id),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','unresolvable')),
  resolution_note TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PRIORITY SCORES (cached) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.priority_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  total_score     NUMERIC NOT NULL,
  urgency_score   NUMERIC NOT NULL DEFAULT 0,
  weather_score   NUMERIC NOT NULL DEFAULT 0,
  crop_stage_score NUMERIC NOT NULL DEFAULT 0,
  waiting_score   NUMERIC NOT NULL DEFAULT 0,
  logistics_score NUMERIC NOT NULL DEFAULT 0,
  constraints_score NUMERIC NOT NULL DEFAULT 0,
  explanation     TEXT,
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FAIRNESS EVENTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fairness_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id         UUID NOT NULL REFERENCES public.farmers(id),
  event_type        TEXT NOT NULL CHECK (event_type IN (
    'request_submitted','allocation_success','allocation_failed',
    'waitlisted','fairness_guard_activated'
  )),
  request_id        UUID REFERENCES public.requests(id),
  priority_score    NUMERIC,
  winner_score      NUMERIC,
  winner_farmer_name TEXT,
  details           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_requests_farmer ON public.requests(farmer_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_resource ON public.requests(resource_id);
CREATE INDEX IF NOT EXISTS idx_allocations_resource ON public.allocations(resource_id);
CREATE INDEX IF NOT EXISTS idx_allocations_farmer ON public.allocations(farmer_id);
CREATE INDEX IF NOT EXISTS idx_allocations_org ON public.allocations(organization_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON public.allocations(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_org ON public.resources(organization_id);

-- ─── TRIGGER: update updated_at ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_requests
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_allocations
  BEFORE UPDATE ON public.allocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── TRIGGER: auto-create profile on signup ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── RLS POLICIES ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disruptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priority_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fairness_events ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read own, admin reads all
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin reads all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System inserts profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- Farmers: own farmer record
CREATE POLICY "Farmers read own record" ON public.farmers
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin reads all farmers" ON public.farmers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "Farmers insert own record" ON public.farmers
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Farmers update own record" ON public.farmers
  FOR UPDATE USING (user_id = auth.uid());

-- Organizations: own org record
CREATE POLICY "Orgs read own record" ON public.organizations
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin reads all orgs" ON public.organizations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "Orgs insert own record" ON public.organizations
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Orgs update own record" ON public.organizations
  FOR UPDATE USING (user_id = auth.uid());

-- Resources: orgs manage own, farmers/admin can read
CREATE POLICY "Anyone can read resources" ON public.resources
  FOR SELECT USING (true);
CREATE POLICY "Orgs manage own resources" ON public.resources
  FOR ALL USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  );

-- Requests: farmer sees own, org sees requests involving their resources, admin sees all
CREATE POLICY "Farmers read own requests" ON public.requests
  FOR SELECT USING (
    farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid())
  );
CREATE POLICY "Farmers insert own requests" ON public.requests
  FOR INSERT WITH CHECK (
    farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid())
  );
CREATE POLICY "Farmers update own requests" ON public.requests
  FOR UPDATE USING (
    farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid())
  );
CREATE POLICY "Orgs read requests for their resources" ON public.requests
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admin reads all requests" ON public.requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "System updates requests" ON public.requests
  FOR UPDATE USING (true);

-- Allocations: farmer sees own, org sees their allocations, admin sees all
CREATE POLICY "Farmers read own allocations" ON public.allocations
  FOR SELECT USING (
    farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid())
  );
CREATE POLICY "Orgs read own allocations" ON public.allocations
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admin reads all allocations" ON public.allocations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "System manages allocations" ON public.allocations
  FOR ALL USING (true);

-- Notifications: users see own
CREATE POLICY "Users see own notifications" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- Audit logs: admin sees all, system inserts
CREATE POLICY "Admin reads audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "System inserts audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Conflicts: orgs and admin
CREATE POLICY "Orgs read own conflicts" ON public.conflicts
  FOR SELECT USING (
    resource_id IN (
      SELECT r.id FROM public.resources r
      JOIN public.organizations o ON o.id = r.organization_id
      WHERE o.user_id = auth.uid()
    )
  );
CREATE POLICY "Admin reads all conflicts" ON public.conflicts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "System manages conflicts" ON public.conflicts
  FOR ALL USING (true);

-- Priority scores: farmer sees own
CREATE POLICY "Farmers read own priority scores" ON public.priority_scores
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM public.requests WHERE farmer_id IN (
        SELECT id FROM public.farmers WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "System inserts priority scores" ON public.priority_scores
  FOR INSERT WITH CHECK (true);

-- Fairness events: farmers see own
CREATE POLICY "Farmers read own fairness events" ON public.fairness_events
  FOR SELECT USING (
    farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid())
  );
CREATE POLICY "System manages fairness events" ON public.fairness_events
  FOR ALL USING (true);

-- Disruptions: admin sees all, orgs see theirs
CREATE POLICY "Admin reads disruptions" ON public.disruptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
CREATE POLICY "System manages disruptions" ON public.disruptions
  FOR ALL USING (true);

-- ─── ALLOCATION ENGINE RPC ────────────────────────────────────────────────────
-- This is the authoritative allocation function that runs atomically in the database
CREATE OR REPLACE FUNCTION public.process_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_resource RECORD;
  v_farmer RECORD;
  v_org RECORD;
  v_allocation_id UUID;
  v_priority NUMERIC;
  v_competing RECORD;
  v_winner_id UUID;
  v_winner_score NUMERIC;
  v_conflict_id UUID;
  v_sched_start TIMESTAMPTZ;
  v_sched_end TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Load the request
  SELECT * INTO v_request FROM public.requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  -- Load farmer
  SELECT * INTO v_farmer FROM public.farmers WHERE id = v_request.farmer_id;

  -- Mark as validating
  UPDATE public.requests SET status = 'validating' WHERE id = p_request_id;

  -- Calculate scheduled window
  v_sched_start := v_request.earliest_start;
  v_sched_end := v_sched_start + (v_request.duration_days || ' days')::INTERVAL;
  IF v_sched_end > v_request.latest_end THEN
    v_sched_end := v_request.latest_end;
  END IF;

  -- Find compatible available resource
  SELECT r.* INTO v_resource
  FROM public.resources r
  WHERE r.category = v_request.resource_type
    AND r.status = 'available'
    AND (
      v_request.organization_id IS NULL OR r.organization_id = v_request.organization_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.allocations a
      WHERE a.resource_id = r.id
        AND a.status NOT IN ('cancelled', 'completed')
        AND a.scheduled_start < v_sched_end
        AND a.scheduled_end > v_sched_start
    )
  ORDER BY r.created_at
  LIMIT 1;

  IF NOT FOUND THEN
    -- Check for competing requests (conflict scenario)
    SELECT r.* INTO v_resource
    FROM public.resources r
    WHERE r.category = v_request.resource_type
      AND r.status = 'available'
      AND (v_request.organization_id IS NULL OR r.organization_id = v_request.organization_id)
    ORDER BY r.created_at
    LIMIT 1;

    IF NOT FOUND THEN
      -- No compatible resource at all
      UPDATE public.requests
      SET status = 'manual_review',
          manual_review_reason = 'No compatible resource available for the requested type.'
      WHERE id = p_request_id;

      INSERT INTO public.audit_logs (actor_name, action, entity_type, entity_id, details)
      VALUES ('FarmGrid Engine', 'MANUAL_REVIEW_REQUIRED', 'request', p_request_id,
              'No compatible resource found for type: ' || v_request.resource_type);

      RETURN jsonb_build_object(
        'success', false,
        'method', 'manual_review',
        'message', 'No compatible resource available. Request flagged for manual review.'
      );
    END IF;

    -- Resource exists but conflict: find the competing allocation's request
    SELECT rq.* INTO v_competing
    FROM public.allocations a
    JOIN public.requests rq ON rq.id = a.request_id
    WHERE a.resource_id = v_resource.id
      AND a.status NOT IN ('cancelled','completed')
      AND a.scheduled_start < v_sched_end
      AND a.scheduled_end > v_sched_start
    ORDER BY rq.priority_score DESC NULLS LAST
    LIMIT 1;

    -- Compare priority scores with FCFS tiebreak
    v_priority := COALESCE(v_request.priority_score, 0);
    v_winner_score := COALESCE(v_competing.priority_score, 0);

    IF v_priority > v_winner_score THEN
      -- New request wins — this is handled by cancelling the old and re-allocating
      -- For simplicity in hackathon: waitlist new if existing is already allocated
      UPDATE public.requests
      SET status = 'waitlisted',
          waitlist_reason = format(
            'Resource allocated to another farmer (priority: %s vs yours: %s). Use What-If to explore options.',
            round(v_winner_score), round(v_priority)
          )
      WHERE id = p_request_id;

      RETURN jsonb_build_object(
        'success', false,
        'method', 'waitlisted',
        'message', 'Resource is currently allocated. Waitlisted based on priority.'
      );
    ELSE
      -- Existing request wins (higher or equal score + FCFS)
      UPDATE public.requests
      SET status = 'waitlisted',
          waitlist_reason = format(
            'Higher priority request already allocated this resource (score: %s vs yours: %s). FCFS applied for equal scores.',
            round(v_winner_score), round(v_priority)
          )
      WHERE id = p_request_id;

      RETURN jsonb_build_object(
        'success', false,
        'method', 'waitlisted',
        'message', 'Waitlisted: another request has higher or equal priority.',
        'competitor_score', v_winner_score,
        'your_score', v_priority
      );
    END IF;
  END IF;

  -- Resource is available — ALLOCATE
  SELECT org.* INTO v_org FROM public.organizations org WHERE org.id = v_resource.organization_id;

  INSERT INTO public.allocations (
    request_id, resource_id, farmer_id, organization_id,
    scheduled_start, scheduled_end, status,
    priority_score, priority_breakdown, allocation_method
  ) VALUES (
    p_request_id, v_resource.id, v_request.farmer_id, v_resource.organization_id,
    v_sched_start, v_sched_end, 'scheduled',
    v_request.priority_score, v_request.priority_breakdown, 'auto'
  ) RETURNING id INTO v_allocation_id;

  -- Update request status
  UPDATE public.requests
  SET status = 'allocated',
      resource_id = v_resource.id,
      organization_id = v_resource.organization_id,
      allocation_method = 'auto'
  WHERE id = p_request_id;

  -- Update resource status
  UPDATE public.resources SET status = 'allocated' WHERE id = v_resource.id;

  -- Update farmer stats
  UPDATE public.farmers
  SET allocation_attempts = allocation_attempts + 1,
      successful_allocations = successful_allocations + 1,
      consecutive_losses = 0,
      waiting_started_at = NULL
  WHERE id = v_request.farmer_id;

  -- Notify farmer
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  VALUES (
    v_farmer.user_id,
    '✅ Resource Allocated!',
    format('%s has been automatically allocated to you from %s.',
           v_resource.name,
           to_char(v_sched_start, 'DD Mon YYYY')),
    'success', 'allocation', v_allocation_id
  );

  -- Notify organization
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  VALUES (
    v_org.user_id,
    '📋 New Booking: ' || v_resource.name,
    format('%s has been allocated to %s from %s to %s.',
           v_resource.name, v_farmer.name,
           to_char(v_sched_start, 'DD Mon'), to_char(v_sched_end, 'DD Mon YYYY')),
    'info', 'allocation', v_allocation_id
  );

  -- Audit log
  INSERT INTO public.audit_logs (actor_name, action, entity_type, entity_id, details)
  VALUES (
    'FarmGrid Engine', 'AUTO_ALLOCATED', 'allocation', v_allocation_id,
    format('Resource %s auto-allocated to %s. Priority: %s/100.',
           v_resource.name, v_farmer.name, round(COALESCE(v_request.priority_score, 0)))
  );

  -- Fairness event
  INSERT INTO public.fairness_events (farmer_id, event_type, request_id, priority_score, details)
  VALUES (v_farmer.id, 'allocation_success', p_request_id,
          v_request.priority_score, 'Resource allocated automatically.');

  RETURN jsonb_build_object(
    'success', true,
    'method', 'auto',
    'allocation_id', v_allocation_id,
    'resource_name', v_resource.name,
    'resource_id', v_resource.id,
    'scheduled_start', v_sched_start,
    'scheduled_end', v_sched_end,
    'priority_score', v_request.priority_score,
    'message', format('%s automatically allocated from %s.',
                      v_resource.name, to_char(v_sched_start, 'DD Mon YYYY'))
  );
END;
$$;

-- ─── SEED: Admin Account ──────────────────────────────────────────────────────
-- NOTE: Run this separately after creating the admin@farmgrid.demo account in
-- Supabase Auth Dashboard with password FarmGrid@Admin123
-- Then run:
-- INSERT INTO public.profiles (id, email, role, full_name)
-- VALUES ('<admin-user-uuid>', 'admin@farmgrid.demo', 'admin', 'FarmGrid Admin')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- ─── SEED: Demo Organization ─────────────────────────────────────────────────
-- After creating org account, resources can be seeded through the UI or via INSERT statements
