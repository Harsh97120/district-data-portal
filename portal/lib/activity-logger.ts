import type { ActivityActionType } from "./models/activity";

export interface LogActivityParams {
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
}

/**
 * Dispatches an activity log request asynchronously in a fire-and-forget manner.
 * Never throws, never blocks the UI, and fails silently if user is unauthenticated.
 */
export function logActivity(params: LogActivityParams): void {
  if (typeof window === "undefined") return;

  try {
    fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      keepalive: true,
    }).catch(() => {
      // Non-blocking silent catch
    });
  } catch {
    // Non-blocking silent catch
  }
}
