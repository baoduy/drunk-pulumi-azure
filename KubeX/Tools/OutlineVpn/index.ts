import { K8sArgs } from '../../types';
import Namespace from '../../Core/Namespace';
import { KeyVaultInfo } from '../../../types';
import { certImportFromVault, certImportFromFolder } from '../../CertImports';
import * as kubernetes from "@pulumi/kubernetes";

interface Props extends K8sArgs {
  vaultInfo?: KeyVaultInfo;
  certVaultName?: string;
  certFolderName?: string;
}


export default async ({
  vaultInfo,
  certVaultName,
  certFolderName,
  ...others
}: Props) => {
  const name = 'outline-vpn';
  const namespace = 'outline-system';

  const ns = Namespace({ name: namespace, ...others });
const defaultProps = {
  namespace,
  dependsOn: ns,
  provider: others.provider,}

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

  //Deploy nfs-server
  const nfs_serverDeployment = new kubernetes.extensions.v1beta1.Deployment("nfs_serverDeployment", {
    metadata: {
      name: "nfs-server",
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: {
          role: "nfs-server",
        },
      },
      template: {
        metadata: {
          labels: {
            role: "nfs-server",
          },
        },
        spec: {
          containers: [{
            name: "nfs-server",
            image: "gcr.io/google_containers/volume-nfs:0.8",
            ports: [
              {
                name: "nfs",
                containerPort: 2049,
              },
              {
                name: "mountd",
                containerPort: 20048,
              },
              {
                name: "rpcbind",
                containerPort: 111,
              },
            ],
            securityContext: {
              privileged: true,
            },
            volumeMounts: [{
              mountPath: "/exports",
              name: "mypvc",
            }],
          }],
          volumes: [{
            name: "mypvc",
            gcePersistentDisk: {
              pdName: "gce-nfs-disk",
              fsType: "ext4",
            },
          }],
        },
      },
    },
  });

  const nfs_serverService = new kubernetes.core.v1.Service("nfs_serverService", {
    metadata: {
      name: "nfs-server",
    },
    spec: {
      ports: [
        {
          name: "nfs",
          port: 2049,
        },
        {
          name: "mountd",
          port: 20048,
        },
        {
          name: "rpcbind",
          port: 111,
        },
      ],
      selector: {
        role: "nfs-server",
      },
    },
  });


};
