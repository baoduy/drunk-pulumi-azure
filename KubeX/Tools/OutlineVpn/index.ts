import { K8sArgs } from '../../types';
import Namespace from '../../Core/Namespace';
import { KeyVaultInfo } from '../../../types';
import { certImportFromVault, certImportFromFolder } from '../../CertImports';
import * as kubernetes from '@pulumi/kubernetes';
import { createPVCForStorageClass, StorageClassNameTypes } from '../../Storage';
import { randomUuId } from '../../../Core/Random';
import { Input } from '@pulumi/pulumi';
import ksCertSecret from '../../Core/KsCertSecret';

//https://medium.com/asl19-developers/hosting-outline-vpn-server-on-kubernetes-69a8765eed19

export interface OutlineProps extends K8sArgs {
  vaultInfo?: KeyVaultInfo;
  hostname: string;
  apiPort?: number;
  accessPort?: number;
  //Either provider 1 of value below
  cert: {
    certVaultName?: string;
    certFolderName?: string;
    cert?: {
      cert: Input<string>;
      ca?: Input<string>;
      privateKey: Input<string>;
    };
  };

  replicas?: number;
  storageClassName: StorageClassNameTypes;
}
export default async ({
  vaultInfo,
  hostname,
  apiPort = 65123,
  accessPort = 45123,
  cert,
  storageClassName,
  replicas = 1,
  ...others
}: OutlineProps) => {
  const name = 'outline-vpn';
  const namespace = 'outline-system';
  const image = 'quay.io/outline/shadowbox:stable';

  const id = randomUuId(name).result;
  const ns = Namespace({ name: namespace, ...others });

  const defaultProps = {
    namespace,
    dependsOn: ns,
    provider: others.provider,
  };

  //Cert
  if (cert.cert) {
    ksCertSecret({
      name: `tls-${name}-imported`,
      ...cert.cert,
      ...defaultProps,
    });
  } else if (cert.certVaultName && vaultInfo) {
    await certImportFromVault({
      certNames: [cert.certVaultName],
      vaultInfo,
      ...defaultProps,
    });
  } else if (cert.certFolderName) {
    certImportFromFolder({
      certName: name,
      certFolder: cert.certFolderName,
      namespaces: [namespace],
      ...defaultProps,
    });
  }

  //Config Map
  // const configMap = new kx.ConfigMap(
  //   name,
  //   {
  //     metadata: { namespace },
  //     data: { 'config.yml': '' },
  //   },
  //   others
  // );

  //Storage
  const persisVolume = createPVCForStorageClass({
    name,
    storageClassName,
    ...defaultProps,
  });

  const serverConfig = {
    rollouts: [{ id: 'single-port', enabled: true }],
    portForNewAccessKeys: accessPort,
    hostname,
  };

  //Deployment
  const outlineDeployment = new kubernetes.apps.v1.Deployment(
    'outlineShadowbox_Deployment',
    {
      metadata: {
        name,
        namespace,
        annotations: {
          'pulumi.com/skipAwait': 'true',
        },
      },
      spec: {
        replicas,
        selector: {
          matchLabels: {
            name,
            app: name,
          },
        },
        template: {
          metadata: {
            labels: {
              name,
              app: name,
            },
          },
          spec: {
            containers: [
              {
                name,
                image,
                //`echo '{"rollouts":[{"id":"single-port","enabled":true}],"portForNewAccessKeys":${accessPort}}' > /root/shadowbox/persisted-state/shadowbox_server_config.json; cat /opt/outline/shadowbox_config.json > /root/shadowbox/persisted-state/shadowbox_config.json; [ ! -f /root/shadowbox/persisted-state/outline-ss-server/config.yml ] && cat /opt/outline/outline-ss-server/config.yml > /root/shadowbox/persisted-state/outline-ss-server/config.yml; sleep 10; ln -sf /opt/outline/shadowbox_config.json /root/shadowbox/persisted-state/shadowbox_config.json; ln -sf /opt/outline/outline-ss-server/config.yml /root/shadowbox/persisted-state/outline-ss-server/config.yml; var='kill -SIGHUP $(pgrep -f outline-ss-server)'; echo "*/15 * * * * $var" > mycron; crontab mycron; rm mycron;`,
                lifecycle: {
                  postStart: {
                    exec: {
                      command: [
                        '/bin/sh',
                        '-c',
                        `echo '${JSON.stringify(
                          serverConfig
                        )}' > /root/shadowbox/persisted-state/shadowbox_server_config.json;`,
                      ],
                    },
                  },
                },
                ports: [
                  { containerPort: accessPort },
                  { containerPort: apiPort },
                ],
                env: [
                  {
                    name: 'SB_API_PORT',
                    value: apiPort.toString(),
                  },
                  {
                    name: 'SB_API_PREFIX',
                    value: id,
                  },
                  {
                    name: 'SB_CERTIFICATE_FILE',
                    value: '/tmp/shadowbox-selfsigned-dev.crt',
                  },
                  {
                    name: 'SB_PRIVATE_KEY_FILE',
                    value: '/tmp/shadowbox-selfsigned-dev.key',
                  },
                ],
                volumeMounts: [
                  {
                    name: 'server-config-volume',
                    mountPath: '/cache',
                  },
                  {
                    name: 'shadowbox-config',
                    mountPath: '/opt/outline',
                  },
                  {
                    name: 'shadowbox-config',
                    mountPath: '/root/shadowbox',
                  },
                  {
                    name: 'tls',
                    mountPath: '/tmp/shadowbox-selfsigned-dev.crt',
                    subPath: 'shadowbox-selfsigned-dev.crt',
                    readOnly: true,
                  },
                  {
                    name: 'tls',
                    mountPath: '/tmp/shadowbox-selfsigned-dev.key',
                    subPath: 'shadowbox-selfsigned-dev.key',
                    readOnly: true,
                  },
                ],

                resources: {
                  requests: { memory: '100Mi', cpu: '0.1' },
                  limits: { memory: '4Gi', cpu: '2' },
                },
              },
            ],
            volumes: [
              {
                name: 'server-config-volume',
                emptyDir: {},
              },
              {
                name: 'shadowbox-config',
                persistentVolumeClaim: {
                  claimName: persisVolume.metadata.name,
                },
              },
              // {
              //   name: 'config',
              //   configMap: { name: configMap.metadata.name },
              // },
              {
                name: 'tls',
                secret: {
                  secretName: `tls-${name}-imported`,
                  items: [
                    {
                      key: 'tls.crt',
                      path: 'shadowbox-selfsigned-dev.crt',
                    },
                    {
                      key: 'tls.key',
                      path: 'shadowbox-selfsigned-dev.key',
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
    {
      dependsOn: [ns, persisVolume],
      provider: others.provider,
    }
  );

  //Services
  const outlineShadowbox_vpn_service = new kubernetes.core.v1.Service(
    'outlineShadowbox_vpn_service',
    {
      metadata: {
        name,
        namespace,

        labels: {
          app: name,
        },
      },
      spec: {
        //type: "LoadBalancer",
        ports: [
          {
            name: 'apiport-tcp',
            port: apiPort,
            targetPort: apiPort,
            protocol: 'TCP',
          },
          {
            name: 'apiport-udp',
            port: apiPort,
            targetPort: apiPort,
            protocol: 'UDP',
          },
          {
            name: 'accessport-tcp',
            port: accessPort,
            targetPort: accessPort,
            protocol: 'TCP',
          },
          {
            name: 'accessport-udp',
            port: accessPort,
            targetPort: accessPort,
            protocol: 'UDP',
          },
        ],
        selector: {
          app: name,
        },
      },
    },
    {
      dependsOn: outlineDeployment,
      provider: others.provider,
      deleteBeforeReplace: true,
    }
  );
};
