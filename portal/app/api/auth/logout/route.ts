import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function POST(): Promise<NextResponse> {
  try {
    await clearSession();
    return NextResponse.json({
      success: true,
      message: "Signed out successfully.",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sign out." },
      { status: 500 }
    );
  }
}
