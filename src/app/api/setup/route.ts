import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  try {
    // Try to check if tables exist by querying
    const { error: checkError } = await supabaseAdmin
      .from("notebooks")
      .select("id")
      .limit(1);

    if (!checkError) {
      return NextResponse.json({ message: "Database already set up" });
    }

    // Tables don't exist - provide SQL to run
    return NextResponse.json({
      message: "Tables not found. Please run the SQL in your Supabase dashboard.",
      sql: `
CREATE TABLE IF NOT EXISTS notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT 'Love Letters',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read notebooks" ON notebooks FOR SELECT USING (true);
CREATE POLICY "Public read pages" ON pages FOR SELECT USING (true);
CREATE POLICY "Auth write pages" ON pages FOR ALL USING (true);
CREATE POLICY "Auth write notebooks" ON notebooks FOR ALL USING (true);
      `,
      dashboard_url: `https://supabase.com/dashboard/project/rgiaqpxamegnnmmlzilh/sql/new`,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
