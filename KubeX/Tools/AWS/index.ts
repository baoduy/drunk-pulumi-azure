import Namespace from '../../Core/Namespace';
import AwsS3, { AwsS3Props } from './S3';
import { DefaultK8sArgs } from '../../types';

interface Props extends Omit<DefaultK8sArgs, 'name'> {
  s3?: Omit<AwsS3Props, 'domain' | 'namespace' | 'provider' | 'dependsOn'>;
  // localStack?: Omit<
  //   LocalStackProps,
  //   'domain' | 'namespace' | 'provider' | 'dependsOn'
  // >;
}

export default ({ namespace, s3, ...others }: Props) => {
  const ns = namespace
    ? { metadata: { name: namespace } }
    : Namespace({ name: 'aws-local', ...others });

  if (s3) AwsS3({ namespace: ns.metadata.name, ...others, ...s3 });

  // if (localStack)
  //   LocalStack({ namespace: ns.metadata.name, ...others, ...localStack });
};
