import { NextRequest, NextResponse } from "next/server";
import { Filter } from "mongodb";
import { getSession } from "@/lib/session";
import {
  getActivitiesCollection,
  toActivityItem,
  type ActivityActionType,
  type ActivityDocument,
} from "@/lib/models/activity";

const VALID_ACTION_TYPES: ActivityActionType[] = [
  "DISTRICT_VIEW",
  "INDICATOR_VIEW",
  "DISTRICT_COMPARISON",
  "AI_QUERY",
];

const DEDUPLICATION_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * GET /api/activity
 * Fetches recent activity strictly for the authenticated user with filters & search.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Authentication required to view activity." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get("type") || "all";
    const searchQuery = (searchParams.get("search") || "").trim();
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));

    const collection = await getActivitiesCollection();

    // Strict multi-tenant isolation: always enforce userId
    const filter: Filter<ActivityDocument> = { userId: session.id };

    // Action type filter
    if (typeParam === "indicators") {
      filter.actionType = "INDICATOR_VIEW";
    } else if (typeParam === "districts") {
      filter.actionType = "DISTRICT_VIEW";
    } else if (typeParam === "comparisons") {
      filter.actionType = "DISTRICT_COMPARISON";
    } else if (typeParam === "ai") {
      filter.actionType = "AI_QUERY";
    }

    // Keyword search filter across relevant fields
    if (searchQuery) {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { districtName: regex },
        { stateName: regex },
        { comparisonDistrictName: regex },
        { comparisonStateName: regex },
        { indicatorLabel: regex },
        { query: regex },
      ];
    }

    const [totalCount, docs] = await Promise.all([
      collection.countDocuments(filter),
      collection
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    const activities = docs.map(toActivityItem);
    const hasMore = skip + activities.length < totalCount;

    return NextResponse.json({
      activities,
      totalCount,
      hasMore,
    });
  } catch (error) {
    console.error("GET /api/activity error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve activity history." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activity
 * Records a new activity for the authenticated user with duplicate prevention.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Authentication required to log activity." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.actionType) {
      return NextResponse.json(
        { error: "Invalid activity payload: actionType is required." },
        { status: 400 }
      );
    }

    const actionType = body.actionType as ActivityActionType;
    if (!VALID_ACTION_TYPES.includes(actionType)) {
      return NextResponse.json(
        { error: `Invalid actionType. Allowed: ${VALID_ACTION_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const collection = await getActivitiesCollection();
    const now = new Date();
    const dedupeThreshold = new Date(now.getTime() - DEDUPLICATION_WINDOW_MS);

    // ── Deduplication Check ──────────────────────────────────────────────────
    // Build matcher based on action type to prevent spamming duplicate rows
    const dedupeFilter: Filter<ActivityDocument> = {
      userId: session.id,
      actionType,
      createdAt: { $gte: dedupeThreshold },
    };

    if (actionType === "DISTRICT_VIEW" && body.districtId) {
      dedupeFilter.districtId = body.districtId;
    } else if (actionType === "INDICATOR_VIEW" && body.districtId && body.indicatorId) {
      dedupeFilter.districtId = body.districtId;
      dedupeFilter.indicatorId = body.indicatorId;
      if (body.dataset) dedupeFilter.dataset = body.dataset;
    } else if (actionType === "DISTRICT_COMPARISON" && body.districtId && body.comparisonDistrictId) {
      dedupeFilter.districtId = body.districtId;
      dedupeFilter.comparisonDistrictId = body.comparisonDistrictId;
      if (body.indicatorId) dedupeFilter.indicatorId = body.indicatorId;
      if (body.dataset) dedupeFilter.dataset = body.dataset;
    } else if (actionType === "AI_QUERY" && body.query) {
      dedupeFilter.query = body.query.trim();
    }

    const existingRecent = await collection.findOne(dedupeFilter);

    if (existingRecent && existingRecent._id) {
      // Update timestamp to bump recency without creating a redundant duplicate
      await collection.updateOne(
        { _id: existingRecent._id },
        { $set: { updatedAt: now, createdAt: now } }
      );
      return NextResponse.json({
        success: true,
        activityId: existingRecent._id.toString(),
        deduplicated: true,
      });
    }

    // ── Insert New Activity ──────────────────────────────────────────────────
    const newDoc: ActivityDocument = {
      userId: session.id, // Strictly server-derived from authenticated session
      actionType,
      districtId: body.districtId || undefined,
      districtName: body.districtName || undefined,
      stateName: body.stateName || undefined,
      stateCode: body.stateCode || undefined,
      comparisonDistrictId: body.comparisonDistrictId || undefined,
      comparisonDistrictName: body.comparisonDistrictName || undefined,
      comparisonStateName: body.comparisonStateName || undefined,
      comparisonStateCode: body.comparisonStateCode || undefined,
      indicatorId: body.indicatorId || undefined,
      indicatorLabel: body.indicatorLabel || undefined,
      category: body.category || undefined,
      dataset: body.dataset || undefined,
      query: body.query ? String(body.query).slice(0, 300) : undefined,
      metadata: body.metadata || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newDoc);

    return NextResponse.json({
      success: true,
      activityId: result.insertedId.toString(),
      deduplicated: false,
    });
  } catch (error) {
    console.error("POST /api/activity error:", error);
    return NextResponse.json(
      { error: "Failed to record activity." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activity
 * Clears ALL activity history strictly for the authenticated user.
 */
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Authentication required to clear activity." },
        { status: 401 }
      );
    }

    const collection = await getActivitiesCollection();

    // Multi-tenant protection: delete ONLY the authenticated user's records
    const result = await collection.deleteMany({ userId: session.id });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("DELETE /api/activity error:", error);
    return NextResponse.json(
      { error: "Failed to clear activity history." },
      { status: 500 }
    );
  }
}
