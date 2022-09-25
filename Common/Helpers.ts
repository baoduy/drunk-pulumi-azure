import { Output, all } from '@pulumi/pulumi';

/*** This is using for unit test */
export function outputPromise<T>(
  values: Array<Output<T | undefined> | undefined>
): Promise<T[]>;

export function outputPromise<T>(
  value: Output<T | undefined> | undefined
): Promise<T>;

export function outputPromise<T>(values: any): any {
  if (Array.isArray(values))
    return new Promise<T[]>((resolve) =>
      all(values).apply((v) => resolve(v as T[]))
    );
  return new Promise<T>((resolve) =>
    all([values]).apply((v) => resolve(v[0] as T))
  );
}

/** Replace all characters in string*/
export function replaceAll(value: string, search: string, replace: string) {
  if (!value) return value;
  return value.split(search).join(replace);
}

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
