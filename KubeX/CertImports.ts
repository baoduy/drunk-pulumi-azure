import * as k8s from "@pulumi/kubernetes";
import { Input } from "@pulumi/pulumi";
import { getKubeDomainCert } from "./Helpers";
import { getTlsName } from "./CertHelper";
import fs from "fs";

interface FromCertOrderProps {
  namespaces: Input<string>[];
  domainName: string;
  provider: k8s.Provider;
}

/** Import Cert to K8s from Azure Cert Order*/
export const certImportFromCertOrder = async ({
  namespaces,
  domainName,
  provider,
}: FromCertOrderProps) => {
  const cert = await getKubeDomainCert(domainName);
  if (!cert) return;

  const name = getTlsName(domainName, false);
  namespaces.map((n, i) => {
    return new k8s.core.v1.Secret(
      `${name}-${i}`,
      {
        metadata: {
          name,
          namespace: n,
        },
        type: "kubernetes.io/tls",
        stringData: {
          "tls.crt": cert.cert + cert.ca,
          "tls.key": cert.key,
        },
      },
      { provider }
    );
  });
};

const getCertFromFolder = (folder: string) => {
  const cert = fs.readFileSync(`./${folder}/cert.cert`, { encoding: "utf8" });
  const ca = fs.readFileSync(`./${folder}/ca.cert`, { encoding: "utf8" });
  const key = fs.readFileSync(`./${folder}/key.cert`, { encoding: "utf8" });

  return { cert, ca, key };
};

export const certImportFromFolder = ({
  domainName,
  namespaces,
  certFolder,
  provider,
}: FromCertOrderProps & { certFolder: string }) => {
  const cert = getCertFromFolder(certFolder);
  if (!cert) return;

  const name = getTlsName(domainName, false);
  namespaces.map((n, i) => {
    return new k8s.core.v1.Secret(
      `${name}-${i}`,
      {
        metadata: {
          name,
          namespace: n,
        },
        type: "kubernetes.io/tls",
        stringData: {
          "tls.crt": cert.cert + cert.ca,
          "tls.key": cert.key,
        },
      },
      { provider }
    );
  });
};
