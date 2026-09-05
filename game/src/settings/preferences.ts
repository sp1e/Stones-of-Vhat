export type Preferences = {
  version: 1;
  goreEnabled: boolean;
};

export type PreferenceLoad = {
  value: Preferences;
  source: 'default' | 'saved' | 'invalid';
};

function fallback(source: 'default' | 'invalid'): PreferenceLoad {
  return {
    value: { version: 1, goreEnabled: true },
    source,
  };
}

export function decodePreferences(raw: string | null): PreferenceLoad {
  if (raw === null) return fallback('default');

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return fallback('invalid');
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fallback('invalid');
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1 || typeof candidate.goreEnabled !== 'boolean') {
    return fallback('invalid');
  }

  return {
    value: { version: 1, goreEnabled: candidate.goreEnabled },
    source: 'saved',
  };
}

export function encodePreferences(value: Preferences): string {
  return JSON.stringify({ version: 1, goreEnabled: value.goreEnabled });
}
