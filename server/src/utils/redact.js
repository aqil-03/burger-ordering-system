const ORDER_TRACKING_PATH = /(\/api\/orders\/)[^/?#]+/g
const SENSITIVE_QUERY = /([?&](?:token|trackingToken)=)[^&#]*/gi

export function redactSensitiveUrl(value) {
  return String(value ?? '')
    .replace(ORDER_TRACKING_PATH, '$1[redacted]')
    .replace(SENSITIVE_QUERY, '$1[redacted]')
}
