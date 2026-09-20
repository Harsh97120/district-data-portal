import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/session";
import { getUsersCollection, toSafeUser } from "@/lib/models/user";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Try fetching updated user record from MongoDB
    try {
      const users = await getUsersCollection();
      const user = await users.findOne({ _id: new ObjectId(session.id) });

      if (user) {
        return NextResponse.json({
          authenticated: true,
          user: toSafeUser(user),
        });
      }
    } catch (dbErr) {
      // If DB is temporarily unreachable, fallback to session info
      console.warn("Could not refresh user from DB, using session token payload:", dbErr);
    }

    return NextResponse.json({
      authenticated: true,
      user: session,
    });
  } catch (error) {
    console.error("Auth me check error:", error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    );
  }
}
