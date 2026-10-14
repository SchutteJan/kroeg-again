type Env = Record<string, string | undefined>;

export interface AppConfig {
  /** Postgres connection string. */
  databaseUrl: string;
  /**
   * Origin used for links sent to users (e.g. password reset).
   */
  publicBaseUrl: string;
  /**
   * API key for sending email through Resend. Only required in production;
   */
  resendApiKey: string | undefined;
  /**
   * Sender for outgoing email, e.g. `Kroegen <noreply@example.com>`.
   */
  emailFrom: string;
  /**
   * Secret for signing ALTCHA proof-of-work challenges. Only required in production;
   */
  altchaHmacSecret: string | undefined;
  /** One message per missing or malformed setting. */
  errors: string[];
  valid: () => boolean;
}

/** Reads the config from `env` without throwing, so callers can report every problem at once. */
export function loadConfig(env: Env): AppConfig {
  const errors: string[] = [];

  function alwaysRequired(name: string) {
    const value = env[name];
    if (!value) {
      errors.push(`${name} is unset and required`);
    }
    return value ?? "";
  }

  function prodRequired(name: string) {
    if (env.NODE_ENV === "production") {
      return alwaysRequired(name);
    }
    return env[name];
  }

  function url(name: string) {
    const value = alwaysRequired(name);
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
    databaseUrl: alwaysRequired("DATABASE_URL"),
    publicBaseUrl: url("PUBLIC_BASE_URL"),
    resendApiKey: prodRequired("RESEND_API_KEY"),
    emailFrom: env.EMAIL_FROM || "Kroegen <accounts@kroeg.jan.tf>",
    altchaHmacSecret: prodRequired("ALTCHA_HMAC_SECRET"),
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
