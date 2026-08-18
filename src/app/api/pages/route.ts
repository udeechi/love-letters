import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const { data: notebook } = await supabaseAdmin
      .from("notebooks")
      .select("id")
      .limit(1)
      .single();

    if (!notebook) {
      return NextResponse.json({ pages: [] });
    }

    const { data: pages, error } = await supabaseAdmin
      .from("pages")
      .select("*")
      .eq("notebook_id", notebook.id)
      .order("page_number", { ascending: true });

    if (error) {
      return NextResponse.json({ pages: [] });
    }

    return NextResponse.json({ pages: pages || [] });
  } catch {
    return NextResponse.json({ pages: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { getAuthPayload } = await import("@/lib/auth");
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const { page_number } = await request.json();

    const { data: page, error } = await supabaseAdmin
      .from("pages")
      .insert({
        notebook_id: payload.notebookId,
        page_number,
        content: "",
        images: [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ page });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
