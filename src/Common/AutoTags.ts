import { runtime } from '@pulumi/pulumi';

const ignoredTags = [
  'Group',
  'GroupMember',
  'Application',
  'ApplicationPassword',
  'ServicePrincipal',
  'ServicePrincipalPassword',
  'kubernetes',
  'cloudflare',
  'providers'
];

export function registerAutoTags(autoTags: Record<string, string>): void {
  runtime.registerStackTransformation((args) => {
    //Check and ignore tag
    if (
      !args.type.includes('ResourceGroup') &&
      ignoredTags.find((t) => args.type.includes(t))
    )
      return { props: args.props, opts: args.opts };

    //Apply default tag
    args.props['tags'] = { ...args.props['tags'], ...autoTags };
    return { props: args.props, opts: args.opts };
  });
}
