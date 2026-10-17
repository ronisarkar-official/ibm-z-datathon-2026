import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    system: "FloodWatch Frontend",
    timestamp: new Date().toISOString(),
  });
}