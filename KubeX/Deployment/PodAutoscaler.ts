import * as k8s from '@pulumi/kubernetes';
import { Provider } from '@pulumi/kubernetes';
import * as kx from '../kx';

export interface PodAutoScaleProps {
  name: string;
  maxReplicas: number;
  minReplicas?: number;
  deployment: kx.Deployment | k8s.apps.v1.Deployment;
  provider: Provider;
}

export const PodAutoScale = ({
  name,
  maxReplicas = 3,
  minReplicas = 1,
  deployment,
  provider,
}: PodAutoScaleProps) => {
  name = `${name}-HA`.toLowerCase();
  return new k8s.autoscaling.v2.HorizontalPodAutoscaler(
    name,
    {
      metadata: {
        name,
        namespace: deployment.metadata.namespace,
      },
      spec: {
        scaleTargetRef: {
          kind: 'Deployment',
          apiVersion: 'apps/v1',
          name: deployment.metadata.name,
        },

        maxReplicas,
        minReplicas,

        //targetCPUUtilizationPercentage: 80,
        metrics: [
          {
            type: 'Resource',
            resource: {
              name: 'cpu',
              target: { type: 'Utilization', averageUtilization: 80 },
            },
          },
          // {
          //   type: 'Resource',
          //   resource: {
          //     name: 'memory',
          //     target: { type: 'AverageValue', averageValue: '1Gi' },
          //   },
          // },
        ],

        behavior: {
          scaleDown: {
            stabilizationWindowSeconds: 300,
            policies: [{ type: 'Pods', value: 1, periodSeconds: 1800 }], //scale down 30m
          },
          scaleUp: {
            stabilizationWindowSeconds: 300,
            policies: [{ type: 'Pods', value: 1, periodSeconds: 300 }], //scale up 5m
          },
        },
      },
    },
    { provider }
  );
};

export default PodAutoScale;
