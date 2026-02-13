export const isMockIntentResponse = (status: number, body: Record<string, unknown>): boolean => {
  if (status !== 200) return false;
  const provider = String(body.provider ?? '').toLowerCase();
  const message = String(body.message ?? '').toLowerCase();
  return provider === 'mock' || message.includes('mock');
};
