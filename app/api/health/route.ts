import { NextResponse } from "next/server";
import { supabase } from "@/db/supabase";

export const runtime = 'edge';

export async function GET() {
  try {
    // Perform a lightweight query to keep Supabase awake
    const { error } = await supabase.from('users').select('id').limit(1);
    
    if (error) throw new Error(error.message);

    return NextResponse.json(
      { status: "ok", message: "Database connection active (Edge)" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "error", message: "Database connection failed" },
      { status: 500 }
    );
  }
}
