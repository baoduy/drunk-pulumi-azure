import * as process from 'node:process';
import * as console from 'node:console';

declare namespace NodeJS {
  interface ProcessEnv {
    //Disabling
    /** Allows to disable 'prefix' from naming builder.*/
    DPA_NAMING_DISABLE_PREFIX?: string;
    /** Allows to disable 'region' from naming builder.*/
    DPA_NAMING_DISABLE_REGION?: string;
    /** Allows to disable 'suffix' from naming builder.*/
    DPA_NAMING_DISABLE_SUFFIX?: string;
    /** Allows to disable vault item naming formating (remove env name from item name).*/
    DPA_VAULT_DISABLE_FORMAT_NAME?: string;
    //Enabling
    /** Allows to disable/enable adding secondary key or connection string into Vault.*/
    DPA_CONN_ENABLE_SECONDARY?: string;
  }
}

class Env {
  static getString(key: string): string | undefined {
    return process.env[key];
  }

  static getNumber(key: string): number | undefined {
    const value = process.env[key];
    if (value === undefined) {
      return undefined;
    }
    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue)) {
      return undefined;
    }
    return parsedValue;
  }

  static getBoolean(key: string): boolean {
    const value = process.env[key];
    if (value === undefined) {
      return false;
    }
    return value === 'true' || value === '1';
  }
}

const env = {
  DPA_NAMING_DISABLE_PREFIX: Env.getBoolean('DPA_NAMING_DISABLE_PREFIX'),
  DPA_NAMING_DISABLE_SUFFIX: Env.getBoolean('DPA_NAMING_DISABLE_SUFFIX'),
  DPA_NAMING_DISABLE_REGION: Env.getBoolean('DPA_NAMING_DISABLE_REGION'),
  DPA_VAULT_DISABLE_FORMAT_NAME: Env.getBoolean(
    'DPA_VAULT_DISABLE_FORMAT_NAME',
  ),
  DPA_CONN_ENABLE_SECONDARY: Env.getBoolean('DPA_CONN_ENABLE_SECONDARY'),
};

export default env;
console.log('DPA_ENV', env);
