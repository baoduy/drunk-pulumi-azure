/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-argument */

/** Replace all characters in string*/
export function replaceAll(value: string, search: string, replace: string) {
  if (!value) return value;
  return value.split(search).join(replace);
}

export const toBase64 = (value: string) =>
  Buffer.from(value).toString("base64");

export const shallowEquals = (obj1: any, obj2: any) =>
  Object.keys(obj1).length === Object.keys(obj2).length &&
  Object.keys(obj1).every((key) => obj1[key] === obj2[key]);

/** Get Domain from Url*/
export const getDomainFromUrl = (url: string) =>
  url.replace("https://", "").replace("http://", "").split("/")[0];

/** Get Root Domain from Url or Sub domain*/
export const getRootDomainFromUrl = (url: string) => {
  const array = getDomainFromUrl(url).split(".");
  return array.slice(Math.max(array.length - 2, 0)).join(".");
};

/** Create Range*/
export const RangeOf = (length: number) =>
  Array.from({ length: length }, (v, k) => k);

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item: any): boolean {
  return item !== null && typeof item === "object" && !Array.isArray(item);
}

/**
 * Deep merge two or more objects.
 * @param target
 * @param sources
 * @returns {T}
 */
export function mergeDeep<T>(target: T, ...sources: any[]): T {
  if (!sources.length) return target;

  for (const source of sources) {
    if (isObject(source)) {
      for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        const targetValue = (target as any)[key];

        if (isObject(sourceValue)) {
          if (!targetValue) {
            (target as any)[key] = {};
          }
          mergeDeep((target as any)[key], sourceValue);
        } else {
          (target as any)[key] = sourceValue;
        }
      }
    }
  }

  return target;
}
