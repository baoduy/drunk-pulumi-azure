import { runtime } from '@pulumi/pulumi';

const ignoredTags = [
  'group:Group',
  'application:Application',
  'applicationPassword:ApplicationPassword',
  'servicePrincipal:ServicePrincipal',
  'servicePrincipalPassword:ServicePrincipalPassword',
  'kubernetes',
];

export function registerAutoTags(autoTags: Record<string, string>): void {
  runtime.registerStackTransformation((args) => {
    //Check and ignore tag
    if (ignoredTags.find((t) => args.type.includes(t)))
      return { props: args.props, opts: args.opts };

    //Apply default tag
    args.props['tags'] = { ...args.props['tags'], ...autoTags };
    return { props: args.props, opts: args.opts };
  });
}
