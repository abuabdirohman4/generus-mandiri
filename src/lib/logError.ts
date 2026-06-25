/**
 * Structured server-side error logger.
 *
 * pm2 menangkap stdout/stderr proses Node ke file log otomatis (tidak perlu DB).
 * Helper ini mencetak error dengan konteks user + timestamp dalam format konsisten,
 * supaya saat debugging gampang tahu "user X kena error Y kapan".
 *
 * Pakai di catch block server action / route:
 *   logError('getAttendanceReport', error, { username, userId, filters })
 */
export function logError(
  context: string,
  error: unknown,
  meta?: Record<string, unknown>
) {
  const err = error as { message?: string; digest?: string; code?: string; stack?: string };
  console.error(`[ERROR] ${context}`, {
    timestamp: new Date().toISOString(),
    ...meta,
    message: err?.message ?? String(error),
    code: err?.code,
    digest: err?.digest,
    stack: err?.stack,
  });
}
