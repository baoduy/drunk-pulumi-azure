import { Input, Output } from '@pulumi/pulumi';
import * as native from '@pulumi/azure-native';

interface Props {
  name: string;
  origin: Output<string>;
  domainName?: string;
  httpsEnabled?: boolean;
}

export default ({ name, domainName, origin, httpsEnabled }: Props) => {
  //new native..audi();
};
