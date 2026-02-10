// Date/time helper utilities.

// Return current time as an ISO string.
export const nowIso = () => new Date().toISOString();

// Format as a readable date (en-US).
export const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US');
};

// Format as date + time (en-US).
export const formatDateTime = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US');
};

// Format using Bangkok timezone to match sandbox UI output.
export const formatBangkok = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
};
