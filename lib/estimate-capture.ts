import { ApiError } from "./whop";

export function estimateCaptureMode(): "members" | "leads_api" {
  const mode=process.env.ESTIMATE_CAPTURE_MODE || "members";
  if (mode!=="members" && mode!=="leads_api") throw new ApiError("Estimate capture mode is not configured correctly.",503);
  if (mode==="leads_api" && (process.env.ROOFING_WHOP_ENVIRONMENT || process.env.WHOP_ENVIRONMENT || "sandbox")!=="sandbox")
    throw new ApiError("Leads API test mode requires the sandbox environment.",503);
  return mode;
}
