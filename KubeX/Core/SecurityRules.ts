export { defaultResponseHeaders } from '../Ingress/NginxIngress';

export const defaultSecurityContext = {
  runAsUser: 1000,
  runAsGroup: 3000,
  fsGroup: 2000,
};

export const defaultPodSecurityContext = {
  readOnlyRootFilesystem: false,
  privileged: false,
  runAsNonRoot: true,
  allowPrivilegeEscalation: false,
  fsGroupChangePolicy: 'OnRootMismatch',
  capabilities: {
    add: ['NET_ADMIN', 'SYS_TIME'],
    drop: ['ALL'],
  },
};

export const defaultResources = {
  limits: { cpu: '500m', memory: '500Mi' },
  requests: { cpu: '10m', memory: '100Mi' },
};

const disableAutoMountServiceAccount = (obj: any) => {
  //Update Auto mount Service Account
  obj.spec.template.spec.automountServiceAccountToken = false;
};

const applySecurity = (obj: any) => {
  //Update Security Context
  if (obj.spec.template.spec.securityContext)
    obj.spec.template.spec.securityContext = {
      ...defaultSecurityContext,
      ...obj.spec.template.spec.securityContext,
    };
  else obj.spec.template.spec.securityContext = defaultSecurityContext;

  const containers = obj.spec.template.spec.containers as Array<any>;
  containers.forEach((c) => {
    //Update Pod Security Context
    if (c.securityContext)
      c.securityContext = {
        ...defaultPodSecurityContext,
        ...c.securityContext,
      };
    else c.securityContext = defaultPodSecurityContext;
  });
};

const applyResourceLimits = (obj: any) => {
  //Update the resources
  const containers = obj.spec.template.spec.containers as Array<any>;
  containers.forEach((c) => {
    //Update the resources
    if (c.resources)
      c.resources = {
        ...defaultResources,
        ...c.resources,
      };
    else c.resources = defaultResources;
  });
};

const updateRevisionHistoryLimit = (obj: any) => {
  if (!obj.spec.revisionHistoryLimit) {
    obj.spec.revisionHistoryLimit = 1;
  }
};

type Kinds = 'DaemonSet' | 'Deployment' | 'Job' | 'CronJob' | 'StatefulSet';

interface OptionsProps {
  disableServiceAccount?: boolean;
  ignoreSecurityContext?: boolean;
  ignoredKinds?: Array<Kinds>;
}

//Apply Security Context and Resources
export const applyDeploymentRules = (
  obj: any,
  options: OptionsProps = { disableServiceAccount: true }
) => {
  if (
    !['DaemonSet', 'Deployment', 'StatefulSet', 'Job', 'CronJob'].includes(
      obj.kind
    )
  )
    return obj;

  if (options.ignoredKinds?.includes(obj.kind)) {
    console.warn(
      'applyDeploymentRules ignored:',
      `${obj.kind}-${obj.metadata.name}`
    );
    return obj;
  }

  //Update the resources
  applyResourceLimits(obj);

  updateRevisionHistoryLimit(obj);

  // disableAutoMountServiceAccount
  if (
    options.disableServiceAccount &&
    ['Deployment', 'Job', 'CronJob'].includes(obj.kind)
  ) {
    disableAutoMountServiceAccount(obj);
  }

  if (!options.ignoreSecurityContext) {
    //Update Security Context
    applySecurity(obj);
  }

  return obj;
};
