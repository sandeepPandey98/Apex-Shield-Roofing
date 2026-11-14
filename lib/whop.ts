// Current API, verified against Whop OpenAPI dated 2026-11-12.
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 502,
    public upstreamStatus?: number,
  ) {
    super(message);
  }
}
export function whopAccount() {
  const id = process.env.NEXT_PUBLIC_WHOP_ACCOUNT_ID;
  if (!id?.startsWith("biz_"))
    throw new ApiError("Whop account is not configured.", 503);
  return id;
}
export async function whopRequest<T = Record<string, unknown>>(
  path: string,
  body?: unknown,
  key?: string,
  method?: "PATCH",
): Promise<T> {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) throw new ApiError("Whop credentials are not configured.", 503);
  const environment = process.env.WHOP_ENVIRONMENT || "sandbox";
  if (!["sandbox", "production"].includes(environment))
    throw new ApiError("Invalid Whop environment.", 503);
  const base =
    process.env.WHOP_TEST_BASE_URL && process.env.NODE_ENV === "test"
      ? process.env.WHOP_TEST_BASE_URL
      : environment === "production"
        ? "https://api.whop.com/api/v1"
        : "https://sandbox-api.whop.com/api/v1";
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: method || (body === undefined ? "GET" : "POST"),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Api-Version-Date": "2026-11-12",
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Whop could not be reached. The outcome may be pending; retry with the same request key.",
      504,
    );
  }
  let data: T;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("Whop returned an unreadable response.");
  }
  if (!response.ok)
    throw new ApiError(
      response.status === 429
        ? "Whop is busy. Please try again shortly."
        : "Whop could not complete this request. Check the business dashboard before retrying.",
      response.status === 429 ? 429 : 502,
      response.status,
    );
  return data;
}
