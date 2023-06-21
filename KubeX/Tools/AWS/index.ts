import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';
import AwsS3, { AwsS3Props } from './S3';

interface Props {
  namespace: Input<string>;
  provider: k8s.Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;

  domain:string;

  s3?: Omit<AwsS3Props, 'namespace' | 'provider' | 'dependsOn'>;

}

export default async ({
                        s3,
  ...others
}: Props) => {
  if (s3) AwsS3({ ...others, ...s3 });
};
