/* eslint-disable  @typescript-eslint/no-explicit-any */
/* eslint-disable  @typescript-eslint/no-unsafe-argument */

import fs from 'fs/promises';
import * as console from 'node:console';

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

/** Get Root Domain from Url or Subdomain*/
export const getRootDomainFromUrl = (url: string) => {
  const array = getDomainFromUrl(url).split('.');
  return array.slice(Math.max(array.length - 2, 0)).join('.');
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
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Asynchronously reads a file and converts its content to a base64-encoded string.
 * @param filePath The path of the file to be read.
 * @returns A promise that resolves to the base64-encoded string of the file's content.
 */
export const readFileAsBase64 = async (filePath: string) =>
  await fs.readFile(filePath).then((f) => f.toString('base64'));
