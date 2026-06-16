// Lightweight runtime feature flag helper
// Reads flags from: window.__FEATURE_FLAGS__ (runtime) or Vite env (import.meta.env.VITE_<FLAG>)
export function isFeatureEnabled(flagName) {
  try {
    if (typeof window !== 'undefined' && window.__FEATURE_FLAGS__ && flagName in window.__FEATURE_FLAGS__) {
      return Boolean(window.__FEATURE_FLAGS__[flagName]);
    }

    // Vite exposes env variables as import.meta.env.VITE_*
    const key = `VITE_${flagName}`;
    if (typeof import.meta !== 'undefined' && import.meta.env && key in import.meta.env) {
      return Boolean(import.meta.env[key]);
    }
  } catch (err) {
    // non-fatal
    // eslint-disable-next-line no-console
    console.debug('featureFlags.isFeatureEnabled error', err);
  }

  return false;
}

export default { isFeatureEnabled };
