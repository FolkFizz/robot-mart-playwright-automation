export const chatSecuritySafetyMarkers = [
  "can't help with that request",
  'shop for robots'
] as const;

export const maliciousLoginPayloads = [
  "' OR '1'='1",
  "admin' --",
  '<script>alert(1)</script>'
] as const;

export const malformedInvoiceIds = [
  '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  '<script>alert(1)</script>',
  'ORD-DOES-NOT-EXIST',
  'INVALID_ORDER_999999999999999999999999'
] as const;
