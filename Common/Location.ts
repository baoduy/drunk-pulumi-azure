import { replaceAll } from './Helpers';
import { Input, output, Output } from '@pulumi/pulumi';
import LocationBuiltIn from './LocationBuiltIn';

export const getLocationString = (possibleName: string) => {
  const location = LocationBuiltIn.value.find(
    (l) => l.name === replaceAll(possibleName, ' ', '').toLowerCase()
  );
  return location?.displayName ?? 'Southeast Asia';
};

export const getLocation = (possibleName: Input<string>): Output<string> =>
  output(possibleName).apply((l) => getLocationString(l));

export const getMyPublicIpAddress = async (): Promise<string | undefined> => {
  const res = await fetch('https://api.myip.com');

  if (res.ok) {
    const data = await res.json();
    return data.ip;
  }
  return undefined;
};
