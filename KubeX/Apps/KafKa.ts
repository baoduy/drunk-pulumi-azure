import { DefaultK8sArgs } from '../types';
import { KeyVaultInfo } from '../../types';
import { randomPassword } from '../../Core/Random';
import { StorageClassNameTypes } from '../Storage';
import * as k8s from '@pulumi/kubernetes';
import { addCustomSecret } from '../../KeyVault/CustomHelper';
import { getPasswordName } from '../../Common/Naming';
import { interpolate } from '@pulumi/pulumi';

interface Props extends DefaultK8sArgs { }

export default ({ name, namespace, provider }: Props) => {
    const kafka = new k8s.helm.v3.Chart(
        name,
        {
            namespace,
            chart: 'kafka',
            fetchOpts: { repo: 'https://charts.bitnami.com/bitnami' },

            values: {},
        },
        { provider }
    );

    return kafka;

};
