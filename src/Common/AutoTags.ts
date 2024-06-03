import { runtime } from "@pulumi/pulumi";

const ignoredTags = [
  "Group",
  "GroupMember",
  "Application",
  "ApplicationPassword",
  "ServicePrincipal",
  "ServicePrincipalPassword",
  "kubernetes",
  "cloudflare",
  "providers",
  "dynamic:Resource",
];

export const registerAutoTags = (autoTags: Record<string, string>) =>
  runtime.registerStackTransformation((resource) => {
    //Check and ignore tag
    if (
      !resource.type.toLowerCase().includes("resourcegroup") &&
      ignoredTags.find((t) =>
        resource.type.toLowerCase().includes(t.toLowerCase()),
      )
    )
      return { props: resource.props, opts: resource.opts };

    //Apply default tag
    resource.props["tags"] = { ...resource.props["tags"], ...autoTags };
    return { props: resource.props, opts: resource.opts };
  });
