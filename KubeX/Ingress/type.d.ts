import { Input, Resource } from "@pulumi/pulumi";
import * as kx from "../KubX";
import * as k8s from "@pulumi/kubernetes";
import { defaultResponseHeaders } from "./Conts";

export interface ServicePort {
  appProtocol?: Input<string>;
  name?: Input<string>;
  nodePort?: Input<number>;
  port: Input<number>;
  protocol?: Input<string>;
  targetPort?: Input<number | string>;
}

export type IngressClassName = "public" | "private" | "nginx";

export type IngressCanary = {
  headerKey?: Input<string>;
  headerValue?: Input<string>;
  headerPattern?: Input<string>;
};

export type CertManagerIssuerTypes =
  | boolean
  | "letsencrypt-staging"
  | "letsencrypt-prod";

type SimpleServiceType = {
  metadata: {
    name: Input<string>;
    namespace: Input<string>;
    labels?: Input<{ [key: string]: Input<string> }>;
  };
  spec: { ports: Array<ServicePort> };
};

type ServiceType = kx.Service | k8s.core.v1.Service | SimpleServiceType;

interface ServicesType extends SimpleServiceType {
  path: string;
}

export interface IngressProps {
  name: string;
  className?: IngressClassName;
  certManagerIssuer?: CertManagerIssuerTypes;

  hostNames: Input<string>[];
  allowHttp?: boolean;
  internalIngress?: boolean;
  tlsSecretName?: Input<string>;
  maxUploadSizeMb?: number;

  responseHeaders?: Partial<
    typeof defaultResponseHeaders & { [key: string]: string }
  >;
  whitelistIps?: Array<Input<string>>;
  enableModSecurity?: boolean;
  cors?: { origins: string[]; headers?: string[] };

  canary?: IngressCanary;

  proxy?: {
    backendProtocol?: "HTTP" | "HTTPS" | "GRPC" | "GRPCS" | "AJP" | "FCGI";
    backendUrl: string;
    sslVerify?: boolean;
    tlsSecretName?: Input<string>;
  };

  auth?: {
    enableClientTls?: boolean;
    alwaysRequireCert?: boolean;
    caSecret?: string;
    upstreamHeaderKey?: string;
    errorPage?: string;
  };

  service?: ServiceType;
  services?: {
    metadata: {
      namespace: Input<string>;
      labels?: Input<{ [key: string]: Input<string> }>;
    };
    paths: ServicesType[];
  };

  provider: k8s.Provider;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}
