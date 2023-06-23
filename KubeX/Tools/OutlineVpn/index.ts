import { K8sArgs } from '../../types';
import Namespace from '../../Core/Namespace';
import { KeyVaultInfo } from '../../../types';
import { certImportFromVault, certImportFromFolder } from '../../CertImports';
import * as kubernetes from "@pulumi/kubernetes";
import { createPVCForStorageClass, StorageClassNameTypes } from '../../Storage';

export interface OutlineProps extends K8sArgs {
  vaultInfo?: KeyVaultInfo;
  certVaultName?: string;
  certFolderName?: string;
  storageClassName: StorageClassNameTypes;
}


export default async ({
  vaultInfo,
  certVaultName,
  certFolderName,
  storageClassName,
  ...others
}: OutlineProps) => {
  const name = 'outline-vpn';
  const namespace = 'outline-system';
  const image = 'quay.io/outline/shadowbox:stable';

  const ns = Namespace({ name: namespace, ...others });

  const defaultProps = {
  namespace,
  dependsOn: ns,
  provider: others.provider,
  }

  //Cert
  if (certVaultName && vaultInfo) {
    await certImportFromVault({
      certNames: [certVaultName],
      vaultInfo,
      ...defaultProps
    });
  } else if (certFolderName) {
    await certImportFromFolder({
      certName: name,
      certFolder: certFolderName,
      namespaces: [namespace],
      ...defaultProps
    });
  }

  //Storage
  const persisVolume = createPVCForStorageClass({
    name,
    namespace,
    ...others,
    storageClassName,
  });

  //Deployment
  const outlineDeployment = new kubernetes.apps.v1.Deployment("outlineShadowbox_Deployment", {
    metadata: {
      name: "shadowbox-server",
      namespace
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          name: "shadowbox",
        },
      },
      template: {
        metadata: {
          labels: {
            name: "shadowbox",
          },
        },
        spec: {
          containers:[{
            name: 'shadowbox',
            image,
            lifecycle:{
              postStart:{
                exec:{
                  command:["/bin/sh", "-c", "echo '{\"rollouts\":[{\"id\":\"single-port\",\"enabled\":true}],\"portForNewAccessKeys\":443}' > /root/shadowbox/persisted-state/shadowbox_server_config.json; cat /opt/outline/shadowbox_config.json > /root/shadowbox/persisted-state/shadowbox_config.json; cat /opt/outline/outline-ss-server/config.yml > /root/shadowbox/persisted-state/outline-ss-server/config.yml; sleep 10; ln -sf /opt/outline/shadowbox_config.json /root/shadowbox/persisted-state/shadowbox_config.json; ln -sf /opt/outline/outline-ss-server/config.yml /root/shadowbox/persisted-state/outline-ss-server/config.yml; var='kill -SIGHUP $(pgrep -f outline-ss-server)'; echo \"*/15 * * * * $var\" > mycron; crontab mycron; rm mycron;"],
                }
              }
            },
            ports:[
              {name:'http',containerPort: 80},
              {name:'https',containerPort: 443}
            ],
            env:[
              {
                name:'SB_CERTIFICATE_FILE',
                value:''
              },
              {
                name:'SB_PRIVATE_KEY_FILE',
                value:''
              }
            ],
            volumeMounts:[{
              name:'server-config-volume',
              mountPath: '/cache'
            },{
              name:'shadowbox-config',
              mountPath: '/opt/outline'
            },{
              name:'tls',
              mountPath: '/tmp/shadowbox-selfsigned-dev.crt',
              subPath: 'shadowbox-selfsigned-dev.crt'
            },{
              name:'tls',
              mountPath: '/tmp/shadowbox-selfsigned-dev.key',
              subPath: 'shadowbox-selfsigned-dev.key'
            }],
          }],
          volumes:[{
            name:'server-config-volume',
            emptyDir:{}
          },{
            name:'shadowbox-config',
            persistentVolumeClaim:{claimName: persisVolume.metadata.name}
          },{
            name: 'tls',
            secret:{
              secretName:name,
              items:[{
                key:'tls.crt',
                path:'shadowbox-selfsigned-dev.crt'
              },{
                key:'tls.key',
                path:'shadowbox-selfsigned-dev.key'
              }]
            }
          }]
        },
      },
    },
  },{
    dependsOn: ns,
    provider: others.provider,
  });

  //Services
  const outlineShadowbox_lb_tcpService = new kubernetes.core.v1.Service("outlineShadowbox_lb_tcpService", {
    metadata: {
      labels: {
        app: "shadowbox",
      },
      namespace,
      name: "shadowbox-lb-tcp",
    },
    spec: {
      //type: "LoadBalancer",
      //loadBalancerIP: "xx.xx.xx.xx",
      ports: [{
        name: "out",
        port: 443,
        targetPort: 443,
        protocol: "TCP",
      }],
      selector: {
        app: "shadowbox",
      },
    },
  },{
    dependsOn: ns,
    provider: others.provider,
  });

  const outlineShadowbox_lb_udpService = new kubernetes.core.v1.Service("outlineShadowbox_lb_udpService", {
    metadata: {
      labels: {
        app: "shadowbox",
      },
      namespace,
      name: "shadowbox-lb-udp",
    },
    spec: {
      //type: "LoadBalancer",
      //loadBalancerIP: "zz.zz.zz.zz",
      ports: [{
        name: "out",
        port: 443,
        targetPort: 443,
        protocol: "UDP",
      }],
      selector: {
        app: "shadowbox",
      },
    },
  },{
    dependsOn: ns,
    provider: others.provider,
  });
};
