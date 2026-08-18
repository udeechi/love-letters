import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  try {
    const { error: checkError } = await supabaseAdmin
      .from("notebooks")
      .select("id")
      .limit(1);

    if (!checkError) {
      return NextResponse.json({ message: "Database already set up" });
    }

    return NextResponse.json({
      message: "Tables not found. Please run the SQL in your Supabase dashboard.",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
