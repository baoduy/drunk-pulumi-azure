import * as k8s from '@pulumi/kubernetes';
import { randomLogin } from '../../../Core/Random';
import { DefaultK8sArgs } from '../../types';
import { KeyVaultInfo } from '../../../types';
import Namespace from '../../Core/Namespace';

export interface OpenLDAPProps extends Omit<DefaultK8sArgs, 'namespace'> {
  vaultInfo?: KeyVaultInfo;
  namespace?: string;
  replicas?: number;
  storageClassName: string;
  ldapDomain: string;
}

export default ({
  name = 'openldap',
  namespace = 'openldap',
  vaultInfo,
  resources,
  replicas = 1,
  ldapDomain,
  storageClassName,
  ...others
}: OpenLDAPProps) => {
  //Admin Pass
  const adminLogin = randomLogin({
    name: `${name}-admin`,
    vaultInfo,
    loginPrefix: 'admin',
    maxUserNameLength: 10,
    passwordOptions: { length: 20, policy: false },
  });

  const ns = Namespace({ name: namespace, ...others });

  //https://github.com/jp-gouin/helm-openldap/blob/master/values.yaml
  const openLDAP = new k8s.helm.v3.Chart(
    name,
    {
      namespace,
      chart: 'openldap-stack-ha',
      fetchOpts: { repo: 'https://jp-gouin.github.io/helm-openldap' },

      values: {
        users: '',
        userPasswords: '',

        global: {
          ldapDomain,
          adminUser: adminLogin.userName,
          adminPassword: adminLogin.password,
          configUserEnabled: true,
          configUser: adminLogin.userName,
          configPassword: adminLogin.password,
        },

        replicaCount: replicas,
        replication: { enabled: false },

        initTLSSecret: {
          enabled: false,
          tls_enabled: false,
          secret: undefined,
        },

        phpldapadmin: {
          enabled: true,
          ingress: { enabled: false, ingressClassName: 'nginx' },
        },

        'ltb-passwd': {
          enabled: false,
          ingress: { enabled: false, ingressClassName: 'nginx' },
        },

        persistence: {
          enabled: true,
          storageClass: storageClassName,
        },
        resources,
      },
    },
    { provider: others.provider, dependsOn: ns }
  );

  return openLDAP;
};
