type Env = Record<string, string | undefined>;

export interface AppConfig {
  /** Postgres connection string. */
  databaseUrl: string;
  /**
   * Origin used for links sent to users (e.g. password reset).
   */
  publicBaseUrl: string;
  /** One message per missing or malformed setting. */
  errors: string[];
  valid: () => boolean;
}

/** Reads the config from `env` without throwing, so callers can report every problem at once. */
export function loadConfig(env: Env): AppConfig {
  const errors: string[] = [];

  function required(name: string) {
    const value = env[name];
    if (!value) {
      errors.push(`${name} is unset and required`);
    }
    return value ?? "";
  }

  function url(name: string) {
    const value = required(name);
    if (!value) {
      return "";
    }
    try {
      return new URL(value).origin;
    } catch {
      errors.push(`${name} is not a valid URL: ${value}`);
      return "";
    }
  }

  return {
    databaseUrl: required("DATABASE_URL"),
    publicBaseUrl: url("PUBLIC_BASE_URL"),
    errors,
    valid: () => errors.length === 0,
  };
}

export function assertValidConfig(config: AppConfig) {
  if (!config.valid()) {
    throw new Error(`Invalid app config:\n  ${config.errors.join("\n  ")}`);
  }
}

let config: AppConfig | undefined;

/** The validated config for this process. Throws if any setting is missing or malformed. */
export function getConfig(): AppConfig {
  if (!config) {
    const loaded = loadConfig(process.env);
    assertValidConfig(loaded);
    config = loaded;
  }
  return config;
}
