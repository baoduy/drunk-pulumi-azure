import { DefaultK8sArgs } from '../../types';
import { KeyVaultInfo } from '../../../types';
import Namespace from '../../Core/Namespace';
import Deployment from '../../Deployment';
import Yaml from 'json-to-pretty-yaml';
import { createSelfSignCertV2 } from '../../../Certificate';
import KsCertSecret from '../../Core/KsCertSecret';
import { dhparam } from '../../Core/DhparamHelper';
import { randomPassword } from '../../../Core/Random';
import { createPVCForStorageClass } from '../../Storage';

export interface OpenLDAPProps extends Omit<DefaultK8sArgs, 'namespace'> {
  vaultInfo?: KeyVaultInfo;
  namespace?: string;
  replicas?: number;
  storageClassName: string;
  environments: {
    LDAP_ORGANISATION: string;
    LDAP_DOMAIN: string;
  };
}

export default ({
  name = 'openldap',
  namespace = 'ldap',
  vaultInfo,
  resources,
  replicas,
  environments,
  storageClassName,
  ...others
}: OpenLDAPProps) => {
  const image = 'osixia/openldap:latest';
  const ns = Namespace({ name: namespace, ...others });
  //Storage Volume
  const persisVolume = createPVCForStorageClass({
    name,
    namespace,
    accessMode: 'ReadWriteMany',
    ...others,
    storageClassName,
  });
  //Admin Pass
  const adminPass = randomPassword({
    name: `${name}-admin`,
    vaultInfo,
    policy: 'yearly',
  });
  //Config Pass
  const configPass = randomPassword({
    name: `${name}-config`,
    vaultInfo,
    policy: 'yearly',
  });
  //Readonly Pass
  const readOnlyPass = randomPassword({
    name: `${name}-readOnly`,
    vaultInfo,
    policy: false,
  });
  //Certficate
  const cert = createSelfSignCertV2({
    dnsName: environments.LDAP_DOMAIN,
    commonName: environments.LDAP_DOMAIN,
    organization: environments.LDAP_ORGANISATION,
    validYears: 3,
    vaultInfo,
  });
  const dhparamBase64 = dhparam();
  //Cert Secret
  const certSecret = KsCertSecret({
    name: 'cert',
    namespace,
    certInfo: {
      ...cert,
      dhparam: dhparamBase64,
    },
    ...others,
    dependsOn: ns,
  });

  //Environment variables
  const env = { LDAP_LOG_LEVEL: 265 };
  const setupEnv = {
    //Required and used for new ldap server only
    ...environments,

    LDAP_ADMIN_PASSWORD: adminPass.result,
    LDAP_CONFIG_PASSWORD: configPass.result,
    LDAP_READONLY_USER_USERNAME: `${name}-readonly`,
    LDAP_READONLY_USER_PASSWORD: readOnlyPass.result,

    LDAP_BASE_DN: environments.LDAP_DOMAIN,
    LDAP_READONLY_USER: true,
    LDAP_RFC2307BIS_SCHEMA: false,

    // Backend
    LDAP_BACKEND: 'mdb',

    // Tls
    LDAP_TLS: true,
    LDAP_TLS_CRT_FILENAME: 'tls.crt',
    LDAP_TLS_KEY_FILENAME: 'tls.key',
    LDAP_TLS_DH_PARAM_FILENAME: 'tls.dhparam',
    LDAP_TLS_CA_CRT_FILENAME: 'tls.ca',

    LDAP_TLS_ENFORCE: false,
    LDAP_TLS_CIPHER_SUITE:
      'SECURE256:+SECURE128:-VERS-TLS-ALL:+VERS-TLS1.2:-RSA:-DHE-DSS:-CAMELLIA-128-CBC:-CAMELLIA-256-CBC',
    LDAP_TLS_VERIFY_CLIENT: 'demand',

    // Replication
    LDAP_REPLICATION: false,
    // variables $LDAP_BASE_DN, $LDAP_ADMIN_PASSWORD, $LDAP_CONFIG_PASSWORD
    // are automaticaly replaced at run time

    // if you want to add replication to an existing ldap
    // adapt LDAP_REPLICATION_CONFIG_SYNCPROV and LDAP_REPLICATION_DB_SYNCPROV to your configuration
    // avoid using $LDAP_BASE_DN, $LDAP_ADMIN_PASSWORD and $LDAP_CONFIG_PASSWORD variables
    //LDAP_REPLICATION_CONFIG_SYNCPROV: 'binddn="cn=admin,cn=config" bindmethod=simple credentials=$LDAP_CONFIG_PASSWORD searchbase="cn=config" type=refreshAndPersist retry="60 +" timeout=1 starttls=critical',
    //LDAP_REPLICATION_DB_SYNCPROV: 'binddn="cn=admin,$LDAP_BASE_DN" bindmethod=simple credentials=$LDAP_ADMIN_PASSWORD searchbase="$LDAP_BASE_DN" type=refreshAndPersist interval=00:00:00:10 retry="60 +" timeout=1 starttls=critical',
    // LDAP_REPLICATION_HOSTS:
    //   - ldap://ldap.example.org # The order must be the same on all ldap servers
    // - ldap://ldap2.example.org

    // Do not change the ldap config
    // - If set to true with an existing database, config will remain unchanged. Image tls and replication config will not be run.
    //   The container can be started with LDAP_ADMIN_PASSWORD and LDAP_CONFIG_PASSWORD empty or filled with fake data.
    // - If set to true when bootstrapping a new database, bootstap ldif and schema will not be added and tls and replication config will not be run.
    KEEP_EXISTING_CONFIG: false,

    // Remove config after setup
    LDAP_REMOVE_CONFIG_AFTER_SETUP: true,

    // ssl-helper environment variables prefix
    LDAP_SSL_HELPER_PREFIX: 'ldap', // ssl-helper first search config from LDAP_SSL_HELPER_* variables, before SSL_HELPER_* variables.
  };

  return Deployment({
    name,
    namespace,

    secrets: {
      'env.yaml': Yaml.stringify(env),
      'env.startup.yaml': Yaml.stringify(setupEnv),
    },
    mapSecretsToVolume: {
      name: 'secret-volume',
      path: '/container/environment/01-custom',
    },
    podConfig: {
      ports: { openldap: 389, openldapssl: 636 },
      image,
      //securityContext: defaultSecurityContext,
      //podSecurityContext: defaultPodSecurityContext,
      volumes: [
        {
          name: 'container-run',
          mountPath: '/container/run',
          emptyDir: true,
        },
        {
          name: 'ldap-certs',
          mountPath: '/container/service/slapd/assets/certs',
          secretName: certSecret.metadata.name,
          readOnly: true,
        },
        {
          name: 'ldap-data',
          mountPath: '/var/lib/ldap',
          persistentVolumeClaim: persisVolume.metadata.name,
        },
        {
          name: 'ldap-config',
          mountPath: '/etc/ldap/slapd.d',
          persistentVolumeClaim: persisVolume.metadata.name,
        },
      ],
      resources,
    },
    deploymentConfig: { replicas, args: ['--copy-service'] },

    ...others,
    dependsOn: ns,
  });
};
