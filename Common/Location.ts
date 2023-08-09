import { createAxios } from '../Tools/Axios';
import { replaceAll } from './Helpers';
import { Input, output, Output } from '@pulumi/pulumi';

interface LocationResult {
  name: string;
  displayName: string;
}

let _locationCache: Array<LocationResult> | undefined;

export const getAllLocations = async () => {
  if (_locationCache) return _locationCache;

  const url = '/locations?api-version=2020-01-01';
  _locationCache = (
    await createAxios()
      .get<{ value: Array<LocationResult> }>(url)
      .then((r) => r.data.value)
  ).map((l) => {
    l.displayName = replaceAll(l.displayName, ' ', '');
    return l;
  });
  return _locationCache;
};

const getLocationString = async (possibleName: string) => {
  const locations = await getAllLocations();
  const location = locations.find(
    (l) => l.name === replaceAll(possibleName, ' ', '').toLowerCase()
  );
  return location?.displayName;
};

export const getLocation = (
  possibleName: Input<string>
): Output<string | undefined> =>
  output(possibleName).apply(async (l) => await getLocationString(l));

export const getMyPublicIpAddress = async (): Promise<string | undefined> => {
  const res = await fetch('https://api.myip.com');

  if (res.ok) {
    const data = await res.json();
    return data.ip;
  }
  return undefined;
};
