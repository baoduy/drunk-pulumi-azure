/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-argument */

/** Replace all characters in string*/
export function replaceAll(value: string, search: string, replace: string) {
  if (!value) return value;
  return value.split(search).join(replace);
}

export const toBase64 = (value: string) =>
  Buffer.from(value).toString('base64');

export const shallowEquals = (obj1: any, obj2: any) =>
  Object.keys(obj1).length === Object.keys(obj2).length &&
  Object.keys(obj1).every((key) => obj1[key] === obj2[key]);

/** Get Domain from Url*/
export const getDomainFromUrl = (url: string) =>
  url.replace('https://', '').replace('http://', '').split('/')[0];

/** Get Root Domain from Url or Sub domain*/
export const getRootDomainFromUrl = (url: string) => {
  const array = getDomainFromUrl(url).split('.');
  return array.slice(Math.max(array.length - 2, 0)).join('.');
};

/** Create Range*/
export const RangeOf = (length: number) =>
  Array.from({ length: length }, (v, k) => k);
