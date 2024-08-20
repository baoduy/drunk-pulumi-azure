import { replaceAll } from '../Helpers';
import { azRegions } from './LocationBuiltIn';

export const getLocation = (possibleName: string) => {
  const nameWithoutSpace = replaceAll(possibleName, ' ', '').toLowerCase();
  const location = azRegions.find(
    (l) =>
      l.name === nameWithoutSpace ||
      replaceAll(l.display_name, ' ', '').toLowerCase() === nameWithoutSpace,
  );
  return location?.display_name ?? 'Southeast Asia';
};

export const getCountryCode = (possibleName: string) => {
  const nameWithoutSpace = replaceAll(possibleName, ' ', '').toLowerCase();
  const location = azRegions.find(
    (l) =>
      l.name === nameWithoutSpace ||
      replaceAll(l.display_name, ' ', '').toLowerCase() === nameWithoutSpace,
  );
  return location?.country_code ?? 'SG';
};

export const getRegionCode = (possibleName: string) => {
  const nameWithoutSpace = replaceAll(possibleName, ' ', '').toLowerCase();
  const location = azRegions.find(
    (l) =>
      l.name === nameWithoutSpace ||
      replaceAll(l.display_name, ' ', '').toLowerCase() === nameWithoutSpace,
  );
  return location?.name ?? 'southeastasia';
};

export const getMyPublicIpAddress = async (): Promise<string | undefined> => {
  const res = await fetch('https://api.ipify.org?format=json');

  if (res.ok) {
    const data = (await res.json()) as unknown as { ip: string };
    return data.ip as string;
  }
  return undefined;
};
