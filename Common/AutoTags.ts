import { runtime } from '@pulumi/pulumi';

export function registerAutoTags(autoTags: Record<string, string>): void {
  runtime.registerStackTransformation((args) => {
    args.props['tags'] = { ...args.props['tags'], ...autoTags };
    return { props: args.props, opts: args.opts };
  });
}
