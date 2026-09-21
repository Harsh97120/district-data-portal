// Automated unit & integration tests for "My Activity" logic, deduplication, and isolation
import assert from "assert";

console.log("Running My Activity System Unit Tests...\n");

// 1. Mock In-Memory Activity Store to simulate MongoDB collection behavior
class MockActivityCollection {
  constructor() {
    this.docs = [];
  }

  async insertOne(doc) {
    const _id = "act_" + Math.random().toString(36).slice(2, 9);
    const newDoc = { ...doc, _id };
    this.docs.push(newDoc);
    return { insertedId: _id };
  }

  async findOne(filter) {
    return this.docs.find((d) => {
      for (const key of Object.keys(filter)) {
        if (key === "createdAt" && filter.createdAt?.$gte) {
          if (new Date(d.createdAt).getTime() < new Date(filter.createdAt.$gte).getTime()) {
            return false;
          }
        } else if (d[key] !== filter[key]) {
          return false;
        }
      }
      return true;
    }) || null;
  }

  async updateOne(filter, update) {
    const doc = this.docs.find((d) => d._id === filter._id);
    if (doc && update.$set) {
      Object.assign(doc, update.$set);
      return { modifiedCount: 1 };
    }
    return { modifiedCount: 0 };
  }

  async countDocuments(filter) {
    return this.find(filter).length;
  }

  find(filter) {
    let result = this.docs.filter((d) => {
      if (filter.userId && d.userId !== filter.userId) return false;
      if (filter.actionType && d.actionType !== filter.actionType) return false;
      if (filter.$or) {
        const matchesOr = filter.$or.some((condition) => {
          const [key, regex] = Object.entries(condition)[0];
          return d[key] && regex.test(d[key]);
        });
        if (!matchesOr) return false;
      }
      return true;
    });

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }

  async deleteMany(filter) {
    const initialLen = this.docs.length;
    this.docs = this.docs.filter((d) => {
      if (filter.userId && d.userId === filter.userId) return false;
      return true;
    });
    return { deletedCount: initialLen - this.docs.length };
  }
}

// 2. Mock handler simulating /api/activity
async function handlePostActivity(sessionUser, body, collection) {
  if (!sessionUser || !sessionUser.id) {
    return { status: 401, error: "Authentication required to log activity." };
  }

  const VALID_ACTION_TYPES = ["DISTRICT_VIEW", "INDICATOR_VIEW", "DISTRICT_COMPARISON", "AI_QUERY"];
  if (!body || !body.actionType || !VALID_ACTION_TYPES.includes(body.actionType)) {
    return { status: 400, error: "Invalid actionType." };
  }

  const now = new Date();
  const DEDUPE_WINDOW_MS = 15 * 60 * 1000;
  const dedupeThreshold = new Date(now.getTime() - DEDUPE_WINDOW_MS);

  const dedupeFilter = {
    userId: sessionUser.id,
    actionType: body.actionType,
    createdAt: { $gte: dedupeThreshold },
  };

  if (body.actionType === "DISTRICT_VIEW" && body.districtId) {
    dedupeFilter.districtId = body.districtId;
  } else if (body.actionType === "INDICATOR_VIEW" && body.districtId && body.indicatorId) {
    dedupeFilter.districtId = body.districtId;
    dedupeFilter.indicatorId = body.indicatorId;
  } else if (body.actionType === "DISTRICT_COMPARISON" && body.districtId && body.comparisonDistrictId) {
    dedupeFilter.districtId = body.districtId;
    dedupeFilter.comparisonDistrictId = body.comparisonDistrictId;
  } else if (body.actionType === "AI_QUERY" && body.query) {
    dedupeFilter.query = body.query.trim();
  }

  const existing = await collection.findOne(dedupeFilter);
  if (existing) {
    await collection.updateOne({ _id: existing._id }, { $set: { updatedAt: now, createdAt: now } });
    return { status: 200, success: true, activityId: existing._id, deduplicated: true };
  }

  const newDoc = {
    userId: sessionUser.id,
    actionType: body.actionType,
    districtId: body.districtId,
    districtName: body.districtName,
    stateName: body.stateName,
    comparisonDistrictId: body.comparisonDistrictId,
    comparisonDistrictName: body.comparisonDistrictName,
    indicatorId: body.indicatorId,
    indicatorLabel: body.indicatorLabel,
    dataset: body.dataset,
    query: body.query,
    createdAt: now,
    updatedAt: now,
  };

  const res = await collection.insertOne(newDoc);
  return { status: 200, success: true, activityId: res.insertedId, deduplicated: false };
}

async function handleGetActivity(sessionUser, queryParams, collection) {
  if (!sessionUser || !sessionUser.id) {
    return { status: 401, error: "Authentication required to view activity." };
  }

  const filter = { userId: sessionUser.id };
  if (queryParams.type === "indicators") filter.actionType = "INDICATOR_VIEW";
  if (queryParams.type === "districts") filter.actionType = "DISTRICT_VIEW";
  if (queryParams.type === "comparisons") filter.actionType = "DISTRICT_COMPARISON";
  if (queryParams.type === "ai") filter.actionType = "AI_QUERY";

  if (queryParams.search) {
    const regex = new RegExp(queryParams.search, "i");
    filter.$or = [
      { districtName: regex },
      { stateName: regex },
      { comparisonDistrictName: regex },
      { indicatorLabel: regex },
      { query: regex },
    ];
  }

  const docs = collection.find(filter);
  return { status: 200, activities: docs, totalCount: docs.length };
}

async function handleDeleteActivity(sessionUser, collection) {
  if (!sessionUser || !sessionUser.id) {
    return { status: 401, error: "Authentication required." };
  }
  const res = await collection.deleteMany({ userId: sessionUser.id });
  return { status: 200, success: true, deletedCount: res.deletedCount };
}

// ── EXECUTE TESTS ────────────────────────────────────────────────────────────

const db = new MockActivityCollection();
const userA = { id: "user_a_123", email: "userA@example.com" };
const userB = { id: "user_b_456", email: "userB@example.com" };

// TEST 1: Unauthenticated request rejected
{
  const res = await handlePostActivity(null, { actionType: "DISTRICT_VIEW" }, db);
  assert.strictEqual(res.status, 401);
  console.log("✓ TEST 1 Passed: Unauthenticated request correctly rejected with 401");
}

// TEST 2: User A records a DISTRICT_VIEW
{
  const res = await handlePostActivity(
    userA,
    { actionType: "DISTRICT_VIEW", districtId: "GJ-Ahmedabad", districtName: "Ahmedabad", stateName: "Gujarat" },
    db
  );
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.deduplicated, false);
  console.log("✓ TEST 2 Passed: User A successfully logs DISTRICT_VIEW");
}

// TEST 3: Deduplication window prevents duplicate entry within 15 minutes
{
  const res = await handlePostActivity(
    userA,
    { actionType: "DISTRICT_VIEW", districtId: "GJ-Ahmedabad", districtName: "Ahmedabad", stateName: "Gujarat" },
    db
  );
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.deduplicated, true);
  assert.strictEqual(db.docs.length, 1, "Should not add second row; should update existing");
  console.log("✓ TEST 3 Passed: 15-minute deduplication prevents duplicate records");
}

// TEST 4: User A records INDICATOR_VIEW & DISTRICT_COMPARISON
{
  await handlePostActivity(
    userA,
    {
      actionType: "INDICATOR_VIEW",
      districtId: "GJ-Ahmedabad",
      districtName: "Ahmedabad",
      stateName: "Gujarat",
      indicatorId: "child_anaemia",
      indicatorLabel: "Child Anaemia",
      dataset: "NFHS-6",
    },
    db
  );

  await handlePostActivity(
    userA,
    {
      actionType: "DISTRICT_COMPARISON",
      districtId: "GJ-Ahmedabad",
      districtName: "Ahmedabad",
      stateName: "Gujarat",
      comparisonDistrictId: "GJ-Surat",
      comparisonDistrictName: "Surat",
      indicatorId: "child_anaemia",
      indicatorLabel: "Child Anaemia",
      dataset: "NFHS-6",
    },
    db
  );

  assert.strictEqual(db.docs.length, 3);
  console.log("✓ TEST 4 Passed: Multiple distinct activity types saved successfully");
}

// TEST 5: User B records activity
{
  await handlePostActivity(
    userB,
    { actionType: "DISTRICT_VIEW", districtId: "RJ-Jaipur", districtName: "Jaipur", stateName: "Rajasthan" },
    db
  );
  assert.strictEqual(db.docs.length, 4);
  console.log("✓ TEST 5 Passed: User B records activity independently");
}

// TEST 6: Strict User Isolation (User B cannot see User A's activity)
{
  const resA = await handleGetActivity(userA, { type: "all" }, db);
  const resB = await handleGetActivity(userB, { type: "all" }, db);

  assert.strictEqual(resA.totalCount, 3);
  assert.strictEqual(resB.totalCount, 1);
  assert.ok(resA.activities.every((a) => a.userId === userA.id));
  assert.ok(resB.activities.every((a) => a.userId === userB.id));
  console.log("✓ TEST 6 Passed: Multi-tenant user isolation verified (User A never sees User B)");
}

// TEST 7: Filtering by action type
{
  const indOnly = await handleGetActivity(userA, { type: "indicators" }, db);
  assert.strictEqual(indOnly.totalCount, 1);
  assert.strictEqual(indOnly.activities[0].actionType, "INDICATOR_VIEW");

  const compOnly = await handleGetActivity(userA, { type: "comparisons" }, db);
  assert.strictEqual(compOnly.totalCount, 1);
  assert.strictEqual(compOnly.activities[0].actionType, "DISTRICT_COMPARISON");
  console.log("✓ TEST 7 Passed: Activity type filtering works accurately");
}

// TEST 8: Keyword search
{
  const searchRes = await handleGetActivity(userA, { type: "all", search: "Surat" }, db);
  assert.strictEqual(searchRes.totalCount, 1);
  assert.strictEqual(searchRes.activities[0].comparisonDistrictName, "Surat");
  console.log("✓ TEST 8 Passed: Keyword search filters by district/comparison names");
}

// TEST 9: Clear History isolation (User A clears history, User B is unaffected)
{
  const delRes = await handleDeleteActivity(userA, db);
  assert.strictEqual(delRes.deletedCount, 3);

  const resAAfter = await handleGetActivity(userA, { type: "all" }, db);
  const resBAfter = await handleGetActivity(userB, { type: "all" }, db);

  assert.strictEqual(resAAfter.totalCount, 0, "User A history should be completely deleted");
  assert.strictEqual(resBAfter.totalCount, 1, "User B history must remain 100% intact");
  console.log("✓ TEST 9 Passed: Clear History deleted only caller's records without touching other users");
}

console.log("\nALL 9 MY-ACTIVITY TEST SUITES PASSED CLEANLY! 🎉\n");
