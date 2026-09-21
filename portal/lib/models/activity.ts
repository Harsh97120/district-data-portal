import { ObjectId, Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type ActivityActionType =
  | "DISTRICT_VIEW"
  | "INDICATOR_VIEW"
  | "DISTRICT_COMPARISON"
  | "AI_QUERY";

export interface ActivityDocument {
  _id?: ObjectId;
  userId: string; // The authenticated user's MongoDB ID
  actionType: ActivityActionType;
  districtId?: string;
  districtName?: string;
  stateName?: string;
  stateCode?: string;
  comparisonDistrictId?: string;
  comparisonDistrictName?: string;
  comparisonStateName?: string;
  comparisonStateCode?: string;
  indicatorId?: string;
  indicatorLabel?: string;
  category?: string;
  dataset?: string;
  query?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityItem {
  id: string;
  actionType: ActivityActionType;
  districtId?: string;
  districtName?: string;
  stateName?: string;
  stateCode?: string;
  comparisonDistrictId?: string;
  comparisonDistrictName?: string;
  comparisonStateName?: string;
  comparisonStateCode?: string;
  indicatorId?: string;
  indicatorLabel?: string;
  category?: string;
  dataset?: string;
  query?: string;
  targetUrl: string;
  createdAt: string; // ISO string
}

export function buildTargetUrl(doc: ActivityDocument): string {
  switch (doc.actionType) {
    case "DISTRICT_VIEW":
      return doc.districtId ? `/district/${doc.districtId}` : "/";
    case "INDICATOR_VIEW":
      if (doc.districtId && doc.category) {
        const query = doc.indicatorId ? `?indicator=${encodeURIComponent(doc.indicatorId)}` : "";
        return `/district/${doc.districtId}/category/${doc.category}${query}`;
      }
      return doc.districtId ? `/district/${doc.districtId}` : "/";
    case "DISTRICT_COMPARISON":
      if (doc.districtId && doc.comparisonDistrictId) {
        const params = new URLSearchParams();
        params.set("compare", doc.comparisonDistrictId);
        if (doc.indicatorId) params.set("indicator", doc.indicatorId);
        if (doc.dataset) params.set("year", doc.dataset);
        return `/district/${doc.districtId}?${params.toString()}#comparison`;
      }
      return doc.districtId ? `/district/${doc.districtId}` : "/";
    case "AI_QUERY":
      return doc.districtId ? `/district/${doc.districtId}?ai=open` : "/";
    default:
      return "/";
  }
}

export function toActivityItem(doc: ActivityDocument): ActivityItem {
  return {
    id: doc._id?.toString() || "",
    actionType: doc.actionType,
    districtId: doc.districtId,
    districtName: doc.districtName,
    stateName: doc.stateName,
    stateCode: doc.stateCode,
    comparisonDistrictId: doc.comparisonDistrictId,
    comparisonDistrictName: doc.comparisonDistrictName,
    comparisonStateName: doc.comparisonStateName,
    comparisonStateCode: doc.comparisonStateCode,
    indicatorId: doc.indicatorId,
    indicatorLabel: doc.indicatorLabel,
    category: doc.category,
    dataset: doc.dataset,
    query: doc.query,
    targetUrl: buildTargetUrl(doc),
    createdAt: (doc.createdAt || new Date()).toISOString(),
  };
}

export async function getActivitiesCollection(): Promise<Collection<ActivityDocument>> {
  const db = await getDb();
  return db.collection<ActivityDocument>("activities");
}
