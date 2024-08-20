declare namespace NodeJS {
  interface ProcessEnv {
    DPA_NAMING_DISABLE_PREFIX?: string;
    DPA_NAMING_DISABLE_REGION?: string;
    DPA_NAMING_DISABLE_SUFFIX?: string;
    DPA_VAULT_DISABLE_FORMAT_NAME?: string;
  }
}
