import * as k8s from '@pulumi/kubernetes';
import { Input, Resource } from '@pulumi/pulumi';
import Namespace from '../../Core/Namespace';
import AwsS3, { AwsS3Props } from './S3';
import LocalStack, { LocalStackProps } from './LocalStack';

interface Props {
  provider: k8s.Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
  domain: string;

  s3?: Omit<AwsS3Props, 'domain' | 'namespace' | 'provider' | 'dependsOn'>;
  localStack?: Omit<
    LocalStackProps,
    'domain' | 'namespace' | 'provider' | 'dependsOn'
  >;
}

export default async ({ s3, localStack, ...others }: Props) => {
  const ns = Namespace({ name: 'aws-local', ...others });

  if (s3) AwsS3({ namespace: ns.metadata.name, ...others, ...s3 });

  if (localStack)
    LocalStack({ namespace: ns.metadata.name, ...others, ...localStack });
};
