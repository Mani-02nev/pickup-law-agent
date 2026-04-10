-- ============================================================
-- PickUp Law Agent — Database Schema
-- schema.sql
-- Generated: 2026-04-10
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- 1. LEGAL KNOWLEDGE TABLE
--    Stores IPC sections, Constitutional articles, CrPC rules
-- ────────────────────────────────────────────────────────────
CREATE TABLE legal_knowledge (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type               TEXT        NOT NULL,               -- 'ipc' | 'constitution' | 'crpc' | 'law'
  title              TEXT        NOT NULL,               -- "IPC Section 127"
  section            TEXT        UNIQUE NOT NULL,        -- "127", "121A", "14"
  category           TEXT,                               -- "Criminal Law / IPC"
  content            TEXT,                               -- Full legal text
  punishment         TEXT,                               -- Punishment clause
  simple_explanation TEXT,                               -- Layman explanation
  key_points         TEXT[],                             -- Array of bullet points
  source             TEXT        DEFAULT 'IPC 1860',     -- Source Bare Act
  created_at         TIMESTAMP   DEFAULT NOW(),
  updated_at         TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX idx_lk_type    ON legal_knowledge(type);
CREATE INDEX idx_lk_section ON legal_knowledge(section);

-- ────────────────────────────────────────────────────────────
-- 2. SESSIONS TABLE
--    Tracks each user's conversation session
-- ────────────────────────────────────────────────────────────
CREATE TABLE sessions (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      REFERENCES auth.users(id) ON DELETE CASCADE,
  mode       TEXT      NOT NULL DEFAULT 'knowledge',   -- 'knowledge' | 'case'
  role       TEXT      DEFAULT 'Lawyer',               -- UserRole
  is_active  BOOLEAN   DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_sessions_mode    ON sessions(mode);
CREATE INDEX idx_sessions_active  ON sessions(is_active);

-- ────────────────────────────────────────────────────────────
-- 3. MESSAGES TABLE
--    Stores the full chat history
-- ────────────────────────────────────────────────────────────
CREATE TABLE messages (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID      NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role       TEXT      NOT NULL CHECK (role IN ('user', 'agent')),
  content    TEXT      NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_role    ON messages(role);

-- ────────────────────────────────────────────────────────────
-- 4. RESULTS TABLE
--    Stores structured AI results (LegalReport as JSONB)
-- ────────────────────────────────────────────────────────────
CREATE TABLE results (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID      NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type       TEXT      NOT NULL,    -- 'knowledge' | 'case_analysis' | 'fallback'
  section    TEXT,                  -- e.g. "127" for IPC queries
  data       JSONB     NOT NULL,    -- Full LegalReport JSON
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_results_session ON results(session_id);
CREATE INDEX idx_results_type    ON results(type);
CREATE INDEX idx_results_section ON results(section);

-- ────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_knowledge ENABLE ROW LEVEL SECURITY;

-- Sessions: users only see their own
CREATE POLICY "Own sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

-- Messages: via session ownership
CREATE POLICY "Own messages" ON messages
  FOR ALL USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- Results: via session ownership
CREATE POLICY "Own results" ON results
  FOR ALL USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- Legal knowledge: public read
CREATE POLICY "Public read legal_knowledge" ON legal_knowledge
  FOR SELECT USING (TRUE);

-- ────────────────────────────────────────────────────────────
-- 6. HELPER FUNCTION: auto-update updated_at
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_legal_knowledge_updated_at
  BEFORE UPDATE ON legal_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
