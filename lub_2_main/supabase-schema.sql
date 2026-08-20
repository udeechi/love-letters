-- Create notebooks table
CREATE TABLE IF NOT EXISTS notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT 'Love Letters',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  content TEXT DEFAULT '',
  images JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notebook_id, page_number)
);

-- Enable RLS
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Policies (permissive for our use case)
CREATE POLICY "Public read notebooks" ON notebooks
  FOR SELECT USING (true);

CREATE POLICY "Public read pages" ON pages
  FOR SELECT USING (true);

CREATE POLICY "Authenticated write pages" ON pages
  FOR ALL USING (true);

CREATE POLICY "Authenticated write notebooks" ON notebooks
  FOR ALL USING (true);
