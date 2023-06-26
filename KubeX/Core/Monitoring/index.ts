import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import NginxIngress from '../../../KubeX/Ingress/NginxIngress';
import { applyDeploymentRules } from '../SecurityRules';
import Namespace from '../Namespace';
import { getTlsName } from '../../CertHelper';
import { getRootDomainFromUrl } from '../../../Common/Helpers';

export interface MonitoringProps {
  namespace?: string;
  provider: k8s.Provider;
  nodeSelector?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;

  enablePrometheus?: boolean;
  enableGrafana?: { hostName: string };
  enableAlertManager?: boolean;

  dependsOn?:
    | pulumi.Input<pulumi.Input<pulumi.Resource>[]>
    | pulumi.Input<pulumi.Resource>;
}

export default ({
  namespace = 'monitoring',
  /**Select AKS node that is not Virtual Node*/
  nodeSelector = {},

  enableAlertManager = false,
  enablePrometheus = true,
  enableGrafana,
  provider,
}: MonitoringProps) => {
  //TODO: Setup grafana with Azure AD authentication

  /** https://github.com/cablespaghetti/k3s-monitoring
   *
   * Monitor Rules Creating issue
   *    - kubectl delete  validatingwebhookconfigurations.admissionregistration.k8s.io prometheus-prometheus-oper-admission
   *    - kubectl delete  MutatingWebhookConfiguration  prometheus-prometheus-oper-admission
   *
   * kube-proxy issue refer here: https://github.com/prometheus-community/helm-charts/blob/61e7d540b686fa0df428933a42136f7084223ee2/charts/kube-prometheus-stack/README.md
   */

  const ns = Namespace({ name: namespace, provider });

  const prometheus = new k8s.helm.v3.Chart(
    'prometheus',
    {
      chart: 'kube-prometheus-stack',
      namespace,
      fetchOpts: { repo: 'https://prometheus-community.github.io/helm-charts' },
      values: {
        //Required for use in managed kubernetes clusters (such as AWS EKS) with custom CNI (such as calico),
        //because control-plane managed by AWS cannot communicate with pods' IP CIDR and admission webhooks are not working
        hostNetwork: false,
        nodeSelector,

        coreDns: { enabled: false },
        kubeDns: { enabled: false },
        kubelet: { enabled: false },
        //Disable etcd monitoring. See https://github.com/cablespaghetti/k3s-monitoring/issues/4
        kubeEtcd: { enabled: false },
        //Disable kube-controller-manager and kube-scheduler monitoring. See https://github.com/cablespaghetti/k3s-monitoring/issues/2
        kubeControllerManager: { enabled: false },
        kubeScheduler: { enabled: false },
        kubeProxy: { enabled: false },
        kubernetesServiceMonitors: { enabled: false },
        kubeApiServer: { enabled: false },
        kubeletService: { enabled: false },
        kubeStateMetrics: { enabled: true },
        nodeExporter: { enabled: true },
        networkPolicy: { enabled: false },

        prometheus: { enabled: enablePrometheus },
        prometheusOperator: { enabled: true },
        prometheusSpec: {
          retention: '7d',
          storageSpec: {
            volumeClaimTemplate: {
              spec: {
                accessModes: ['ReadWriteOnce'],
                resources: {
                  requests: {
                    storage: '5Gi',
                  },
                },
              },
            },
          },
        },

        grafana: {
          enabled: enableGrafana,
          plugins: ['grafana-piechart-panel'],
        },

        alertmanager: {
          enabled: enableAlertManager,
          // config: {
          //   global: {
          //     smtp_from: 'you@gmail.com',
          //     smtp_smarthost: 'mailhog:1025',
          //     smtp_require_tls: false,
          //   },
          //   route: {
          //     group_by: ['job'],
          //     group_wait: '30s',
          //     group_interval: '5m',
          //     repeat_interval: '1h',
          //     receiver: 'email',
          //     routes: [
          //       {
          //         match: {
          //           alertname: 'Watchdog',
          //         },
          //         receiver: 'null',
          //       },
          //       {
          //         match: {
          //           alertname: 'CPUThrottlingHigh',
          //         },
          //         receiver: 'null',
          //       },
          //       {
          //         match: {
          //           alertname: 'KubeMemoryOvercommit',
          //         },
          //         receiver: 'null',
          //       },
          //       {
          //         match: {
          //           alertname: 'KubeCPUOvercommit',
          //         },
          //         receiver: 'null',
          //       },
          //       {
          //         match: {
          //           alertname: 'KubeletTooManyPods',
          //         },
          //         receiver: 'null',
          //       },
          //     ],
          //   },
          //   receivers: [
          //     {
          //       name: 'null',
          //     },
          //     {
          //       name: 'email',
          //       email_configs: [
          //         {
          //           send_resolved: true,
          //           to: 'youremail@gmail.com',
          //         },
          //       ],
          //     },
          //   ],
          //   //Inhibition rules allow to mute a set of alerts given that another alert is firing.
          //   //We use this to mute any warning-level notifications if the same alert is already critical.
          //   inhibit_rules: [
          //     {
          //       source_match: {
          //         severity: 'critical',
          //       },
          //       target_match: {
          //         severity: 'warning',
          //       },
          //       equal: ['alertname', 'namespace'],
          //     },
          //   ],
          // },
          // alertmanagerSpec: {
          //   storage: {
          //     volumeClaimTemplate: {
          //       spec: {
          //         accessModes: ['ReadWriteOnce'],
          //         resources: {
          //           requests: {
          //             storage: '1Gi',
          //           },
          //         },
          //       },
          //     },
          //   },
          // },
        },

        ingress: { enabled: false },
        ingressPerReplica: { enabled: false },
      },
      transformations: [
        (obj) => applyDeploymentRules(obj, { ignoredKinds: ['Job'] }),
      ],
    },
    { provider, dependsOn: ns }
  );

  if (enableGrafana) {
    NginxIngress({
      name: 'prometheus-grafana',
      hostNames: [enableGrafana.hostName],
      certManagerIssuer: true,
      className: 'nginx',
      tlsSecretName: getTlsName(
        getRootDomainFromUrl(enableGrafana.hostName),
        true
      ),

      service: {
        metadata: {
          name: pulumi.interpolate`prometheus-grafana`,
          namespace,
        },
        spec: { ports: [{ port: 80 }] },
      },

      dependsOn: prometheus,
      provider,
    });
  }

  return prometheus;
};
