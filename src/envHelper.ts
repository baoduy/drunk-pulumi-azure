import * as process from 'node:process';
import * as console from 'node:console';

class EnvHelper {
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

export const DPA_NAMING_DISABLE_PREFIX = EnvHelper.getBoolean(
  'DPA_NAMING_DISABLE_PREFIX',
);

export const DPA_NAMING_DISABLE_SUFFIX = EnvHelper.getBoolean(
  'DPA_NAMING_DISABLE_SUFFIX',
);

export const DPA_NAMING_DISABLE_REGION = EnvHelper.getBoolean(
  'DPA_NAMING_DISABLE_REGION',
);

export const DPA_VAULT_DISABLE_FORMAT_NAME = EnvHelper.getBoolean(
  'DPA_VAULT_DISABLE_FORMAT_NAME',
);

console.log('DPA_ENV', {
  DPA_VAULT_DISABLE_FORMAT_NAME,
  DPA_NAMING_DISABLE_PREFIX,
  DPA_NAMING_DISABLE_REGION,
  DPA_NAMING_DISABLE_SUFFIX,
});
