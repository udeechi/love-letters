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
    // Check if notebook already exists
    const { data: existing } = await supabaseAdmin
      .from("notebooks")
      .select("id")
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({
        message: "Notebook already exists",
        notebookId: existing.id,
      });
    }

    // Hash password
    const passwordHash = await hashPassword("iloveu");

    // Create notebook
    const { data: notebook, error: notebookError } = await supabaseAdmin
      .from("notebooks")
      .insert({
        title: "Love Letters",
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (notebookError) {
      return NextResponse.json(
        { error: `Failed to create notebook: ${notebookError.message}` },
        { status: 500 }
      );
    }

    // Create first page
    const { error: pageError } = await supabaseAdmin.from("pages").insert({
      notebook_id: notebook.id,
      page_number: 1,
      content: "",
      images: [],
    });

    if (pageError) {
      return NextResponse.json(
        { error: `Failed to create page: ${pageError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Setup complete!",
      notebookId: notebook.id,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
