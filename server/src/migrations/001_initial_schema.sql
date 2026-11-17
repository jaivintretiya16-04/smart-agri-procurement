-- Schema Migration: 001_initial_schema.sql
-- Smart Agricultural Procurement & Queue Management System

-- 1. Users table (all roles: farmer, operator, admin)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('farmer', 'operator', 'admin')),
    token_version INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Farmer profiles table
CREATE TABLE IF NOT EXISTS farmer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Uttar Pradesh',
    district VARCHAR(100) NOT NULL DEFAULT 'Lucknow',
    village VARCHAR(100),
    pincode VARCHAR(20),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    action VARCHAR(100) NOT NULL,
    before_state JSONB,
    after_state JSONB,
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Centers table (Government and Private)
CREATE TABLE IF NOT EXISTS centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('government', 'private')),
    address TEXT NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Uttar Pradesh',
    pincode VARCHAR(20) NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    contact_phone VARCHAR(20),
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending_verification' 
        CHECK (verification_status IN ('pending_verification', 'approved', 'rejected', 'suspended')),
    active_state VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (active_state IN ('active', 'inactive', 'paused', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Center operator assignments
CREATE TABLE IF NOT EXISTS center_operator_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    role_in_center VARCHAR(50) NOT NULL DEFAULT 'operator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (operator_id, center_id)
);

-- 6. Center verifications (Admin governance log)
CREATE TABLE IF NOT EXISTS center_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    reviewed_by UUID NOT NULL REFERENCES users(id),
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('approved', 'rejected', 'suspended')),
    reason TEXT NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Master crop catalog
CREATE TABLE IF NOT EXISTS crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name_en VARCHAR(100) NOT NULL,
    name_hi VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'quintal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Center accepted crops
CREATE TABLE IF NOT EXISTS center_crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    is_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    min_quality_grade VARCHAR(20) DEFAULT 'Standard',
    special_requirements TEXT,
    UNIQUE (center_id, crop_id)
);

-- 9. Center crop published prices (historical snapshot support)
CREATE TABLE IF NOT EXISTS center_crop_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    rate_per_quintal NUMERIC(10, 2) NOT NULL CHECK (rate_per_quintal > 0),
    effective_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMPTZ,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. Center regular schedules
CREATE TABLE IF NOT EXISTS center_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    default_max_farmers INT NOT NULL DEFAULT 10,
    default_max_quintals NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 11. Center pauses and emergency closures
CREATE TABLE IF NOT EXISTS center_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    closure_type VARCHAR(50) NOT NULL CHECK (closure_type IN ('pause', 'emergency_closure')),
    reason TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 12. Slots table (Dual capacity)
CREATE TABLE IF NOT EXISTS slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    max_farmers INT NOT NULL DEFAULT 10,
    max_quintals NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    reserved_farmers INT NOT NULL DEFAULT 0 CHECK (reserved_farmers >= 0),
    reserved_quintals NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (reserved_quintals >= 0),
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_farmer_capacity CHECK (reserved_farmers <= max_farmers),
    CONSTRAINT chk_quintal_capacity CHECK (reserved_quintals <= max_quintals)
);

-- 13. Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(50) NOT NULL UNIQUE,
    farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES crops(id),
    estimated_quintals NUMERIC(10, 2) NOT NULL CHECK (estimated_quintals > 0),
    price_snapshot NUMERIC(10, 2) NOT NULL CHECK (price_snapshot > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('confirmed', 'checked_in', 'in_service', 'completed', 'cancelled', 'no_show', 'rescheduling_required')),
    qr_token_hash VARCHAR(64) NOT NULL UNIQUE,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 14. Booking status history & events
CREATE TABLE IF NOT EXISTS booking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 15. Slot holds and waitlist
CREATE TABLE IF NOT EXISTS slot_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES crops(id),
    quintals NUMERIC(10, 2) NOT NULL,
    hold_token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'offered'
        CHECK (status IN ('offered', 'accepted', 'expired', 'withdrawn')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. Queue entries (Checked-in farmers)
CREATE TABLE IF NOT EXISTS queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
    token_number INT NOT NULL,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMPTZ,
    service_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    queue_status VARCHAR(50) NOT NULL DEFAULT 'waiting'
        CHECK (queue_status IN ('waiting', 'called', 'serving', 'completed', 'skipped'))
);

-- 17. Crop procurement inspection records
CREATE TABLE IF NOT EXISTS procurement_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    center_id UUID NOT NULL REFERENCES centers(id),
    operator_id UUID NOT NULL REFERENCES users(id),
    gross_weight NUMERIC(10, 2) NOT NULL CHECK (gross_weight >= 0),
    tare_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (tare_weight >= 0),
    net_weight NUMERIC(10, 2) NOT NULL CHECK (net_weight >= 0),
    accepted_quantity NUMERIC(10, 2) NOT NULL CHECK (accepted_quantity >= 0),
    quality_grade VARCHAR(50) NOT NULL,
    final_rate_per_quintal NUMERIC(10, 2) NOT NULL CHECK (final_rate_per_quintal >= 0),
    deduction_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (deduction_amount >= 0),
    payable_amount NUMERIC(10, 2) NOT NULL CHECK (payable_amount >= 0),
    outcome VARCHAR(50) NOT NULL CHECK (outcome IN ('accepted', 'partially_accepted', 'rejected')),
    rejection_reason TEXT,
    notes TEXT,
    inspected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 18. Receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procurement_record_id UUID NOT NULL REFERENCES procurement_records(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) NOT NULL UNIQUE,
    version INT NOT NULL DEFAULT 1,
    content_snapshot JSONB NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 19. Payments and payment events
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procurement_record_id UUID NOT NULL REFERENCES procurement_records(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed')),
    reference_id VARCHAR(100),
    actor_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    procurement_record_id UUID NOT NULL REFERENCES procurement_records(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    reference_id VARCHAR(100),
    actor_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 20. Notifications table (In-app)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    title_hi VARCHAR(255) NOT NULL,
    message_en TEXT NOT NULL,
    message_hi TEXT NOT NULL,
    link_url VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 21. Email jobs table (Asynchronous outbox)
CREATE TABLE IF NOT EXISTS email_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    template_key VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'queued'
        CHECK (delivery_status IN ('queued', 'sending', 'sent', 'failed')),
    retry_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ
);

-- 22. Demo scenarios table (Virtual time simulation)
CREATE TABLE IF NOT EXISTS demo_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_name VARCHAR(100) NOT NULL UNIQUE,
    virtual_time TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_slots_center_starts ON slots(center_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_farmer ON bookings(farmer_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_queue_center_status ON queue_entries(center_id, queue_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
