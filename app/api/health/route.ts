import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Perform a lightweight query to keep Supabase awake
    await db.execute(sql`SELECT 1`);
    
    return NextResponse.json(
      { status: "ok", message: "Database connection active" },
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
