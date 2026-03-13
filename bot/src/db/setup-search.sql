-- Full-text search setup for offers table
-- Run after drizzle-kit push creates the base tables

-- Add tsvector generated column
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (to_tsvector('english', description)) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS offers_search_vector_idx
ON offers USING GIN (search_vector);
