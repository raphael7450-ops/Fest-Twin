/** Reject provider business errors even when the transport succeeded. */
export function assertUpstreamSuccess(payload, { allowNoData = false } = {}) {
  const header = payload?.OpenAPI_ServiceResponse?.cmmMsgHeader
    ?? payload?.response?.header ?? payload?.header;
  const code = header?.returnReasonCode ?? header?.resultCode;
  if (payload?.OpenAPI_ServiceResponse ||
      (code !== undefined && !["0", "00", "0000", ...(allowNoData ? ["03"] : [])].includes(String(code)))) {
    throw new Error("Upstream business response was not successful");
  }
}

export function requireObservedItems(items) {
  if (!Array.isArray(items) || items.length === 0 ||
      items.some((item) => !item || typeof item !== "object" || Object.keys(item).length === 0)) {
    throw new Error("Upstream returned no usable observations");
  }
}
