// Simple telemetry adapter. If a global telemetry provider exists (window.telemetry.track), use it.
// Otherwise, provide a no-op that logs to console (so tests can spy on it).

export type TelemetryPayload = Record<string, any>;

function safeTrack(name: string, payload: TelemetryPayload = {}) {
  try {
    if (typeof window !== 'undefined' && (window as any).telemetry && typeof (window as any).telemetry.track === 'function') {
      (window as any).telemetry.track(name, payload);
      return;
    }

    // Fallback: if an analytics object exists (e.g., window.analytics.track)
    if (typeof window !== 'undefined' && (window as any).analytics && typeof (window as any).analytics.track === 'function') {
      (window as any).analytics.track(name, payload);
      return;
    }

    // Otherwise console.log for dev/testing
    // eslint-disable-next-line no-console
    console.debug('[telemetry] event', name, payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug('telemetry.track error', err);
  }
}

export const track = safeTrack;

export default { track };
