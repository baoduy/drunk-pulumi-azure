import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import NginxIngress from '../../../KubeX/Ingress/NginxIngress';
import { applyDeploymentRules } from '../SecurityRules';

export interface MonitoringProps {
  namespace: string;
  provider: k8s.Provider;
  nodeSelector?: pulumi.Input<{
    [key: string]: pulumi.Input<string>;
  }>;

  enablePrometheus?: boolean;
  enableKubeEtcd?: boolean;
  enableKubeControllerManager?: boolean;
  enableKubeScheduler?: boolean;
  enableKubeProxy?: boolean;
  enableGrafana?: { hostName: string; tlsSecretName: string };
  enableAlertManager?: boolean;

  dependsOn?:
    | pulumi.Input<pulumi.Input<pulumi.Resource>[]>
    | pulumi.Input<pulumi.Resource>;
}

export default ({
  namespace = 'monitoring',
  /**Select AKS node that is not Virtual Node*/
  nodeSelector = {},

  enableKubeControllerManager,
  enableKubeEtcd,
  enableKubeProxy,
  enableKubeScheduler,
  enableGrafana,
  enableAlertManager,

  provider,
  dependsOn,
}: MonitoringProps) => {
  //TODO: Setup grafana with Azure AD authentication
  // console.log(`Creating prometheus:`, {
  //   enableKubeControllerManager,
  //   enableKubeEtcd,
  //   enableKubeProxy,
  //   enableKubeScheduler,
  //   enableGrafana: Boolean(enableGrafana),
  //   enableAlertManager,
  // });

  /** https://github.com/cablespaghetti/k3s-monitoring
   *
   * Monitor Rules Creating issue
   *    - kubectl delete  validatingwebhookconfigurations.admissionregistration.k8s.io prometheus-prometheus-oper-admission
   *    - kubectl delete  MutatingWebhookConfiguration  prometheus-prometheus-oper-admission
   *
   * kube-proxy issue refer here: https://github.com/prometheus-community/helm-charts/blob/61e7d540b686fa0df428933a42136f7084223ee2/charts/kube-prometheus-stack/README.md
   */
  const prometheus = new k8s.helm.v3.Chart(
    'prometheus',
    {
      chart: 'kube-prometheus-stack',
      namespace,
      fetchOpts: { repo: 'https://prometheus-community.github.io/helm-charts' },
      values: {
        nodeSelector,

        //Disable etcd monitoring. See https://github.com/cablespaghetti/k3s-monitoring/issues/4
        kubeEtcd: {
          enabled: enableKubeEtcd,
        },
        //Disable kube-controller-manager and kube-scheduler monitoring. See https://github.com/cablespaghetti/k3s-monitoring/issues/2
        kubeControllerManager: {
          enabled: enableKubeControllerManager,
        },
        kubeScheduler: {
          enabled: enableKubeScheduler,
        },
        kubeProxy: {
          enabled: enableKubeProxy,
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
        prometheus: {
          prometheusSpec: {
            retention: '1d',
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
        },
        grafana: {
          plugins: ['grafana-piechart-panel'],
          enabled: Boolean(enableGrafana),
        },
        // 'kube-state-metrics': {
        //   image: {
        //     repository: 'eddiezane/kube-state-metrics',
        //     tag: 'v1.9.7',
        //   },
        // },
      },
      transformations: [
        (obj) => applyDeploymentRules(obj, { ignoredKinds: ['Job'] }),
      ],
    },
    { provider, dependsOn }
  );

  if (enableGrafana) {
    NginxIngress({
      name: 'prometheus-grafana',
      ...enableGrafana,
      hostNames: [enableGrafana.hostName],

      service: {
        metadata: {
          name: pulumi.interpolate`prometheus-grafana`,
          namespace: pulumi.output(namespace),
        },
        spec: { ports: [{ port: 80 }] },
      },

      dependsOn: prometheus,
      provider,
    });
  }

  return prometheus;
};
