import * as k8s from '@pulumi/kubernetes';
import { Provider } from '@pulumi/kubernetes';
import * as kx from '../KubX';

export interface PodAutoScaleProps {
  maxReplicas: number;
  minReplicas?: number;
  deployment: kx.Deployment;
  provider: Provider;
}

export const PodAutoScale = ({
  maxReplicas = 3,
  minReplicas = 1,
  deployment,
  provider,
}: PodAutoScaleProps) => {
  const name = `${deployment.name}-HA`.toLowerCase();
  return new k8s.autoscaling.v2beta2.HorizontalPodAutoscaler(
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
              target: { type: 'Utilization', averageUtilization: 90 },
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
