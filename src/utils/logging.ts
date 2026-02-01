// helper สำหรับ log แบบคุม verbosity

const isDebug = () => process.env.DEBUG === 'true' || process.env.DEBUG === '1';

export const logInfo = (message: string, ...args: unknown[]) => {
  console.log(`[INFO] ${message}`, ...args);
};

export const logWarn = (message: string, ...args: unknown[]) => {
  console.warn(`[WARN] ${message}`, ...args);
};

export const logError = (message: string, ...args: unknown[]) => {
  console.error(`[ERROR] ${message}`, ...args);
};

export const logDebug = (message: string, ...args: unknown[]) => {
  if (!isDebug()) return;
  console.debug(`[DEBUG] ${message}`, ...args);
};
