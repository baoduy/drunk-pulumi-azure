import { DeploymentIngress } from '../../Deployment';
import { Input } from '@pulumi/pulumi';

//** The Route transformation: https://microsoft.github.io/reverse-proxy/articles/transforms.html*/
export type Transform =
  | { PathPrefix: string }
  | { PathRemovePrefix: string }
  | { PathPattern: string }
  | {
      RequestHeader: string;
      Append: string;
    }
  | {
      ResponseHeader: string;
      Append: string;
      When?: 'Always';
    }
  | { ClientCert: 'X-Client-Cert' | string }
  | { RequestHeadersCopy: boolean }
  | { RequestHeaderOriginalHost: boolean }
  | {
      'X-Forwarded': 'proto' | 'host' | 'for' | 'prefix' | string;
      Append: boolean;
      Prefix: 'X-Forwarded-';
    };

export interface Route {
  path: string | '{**catch-all}' | '{**remainder}';
  /**Header matching*/
  headers?: Array<{
    name: string;
    values: string[];
    mode:
      | 'ExactHeader'
      | 'HeaderPrefix'
      | 'Contains'
      | 'NotContains'
      | 'Exists';
  }>;
  transforms?: Transform[];
}

export interface Cluster {
  loadBalancingPolicy?:
    | 'FirstAlphabetical'
    | 'Random'
    | 'PowerOfTwoChoices'
    | 'RoundRobin'
    | 'LeastRequests';
  destinationUrl: string | Array<string>;
  routes: Route[];
}

export interface ReverseProxy {
  clusters: Cluster[];
  ingressConfig?: DeploymentIngress;
}

export interface ForwardedProxy {
  route: string;
  destinationUrls: Array<string>;
  clientCertificate?: Input<string>;
  clientCertificatePassword?: Input<string>;
  sslProtocols?: 'Ssl2' | 'Ssl3' | 'Tls' | 'Tls11' | 'Tls12' | 'Tls13';
  headers?: {
    [key: string]: string;
  };
}
