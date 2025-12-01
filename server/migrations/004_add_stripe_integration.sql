-- Migration 004: Stripe Integration
-- Adds Stripe payment integration fields and webhook tracking
-- Status: Stripe (required for Stripe payment processing)

-- Add Stripe fields to payment_intents
ALTER TABLE payment_intents 
ADD COLUMN IF NOT EXISTS stripe_intent_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_intent_id ON payment_intents(stripe_intent_id);

-- Add Stripe fields to subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Add Stripe fields to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);

-- Create webhook events table for tracking
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_type ON stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_user_id ON stripe_webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed ON stripe_webhook_events(processed);
