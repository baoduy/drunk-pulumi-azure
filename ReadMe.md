# HBD.Pulumi.Share

The common share component for Pulumi projects

## How to use me?

1. Clone me from https://github.com/baoduy/HBD.Pulumi.Share into a folder named "".
2. Create a pulumi account and link to the environment.
3. Create a "\_Config" folder to store your custom configuration.

## How to config Organization Name

You should add the Organization code to the name of some resources and resource groups to ensure that their name is identical and dedicated to your projects.
There are two ways to config your organization code.

1. Name your project with the following convention: "ProjectName-OrgCode".
2. The organization will be retrieved directly from the Pulumi portal.

## Private Link Dns Name

https://docs.microsoft.com/en-us/azure/private-link/private-endpoint-dns

## Azure Resources Support Zone Redundant

https://learn.microsoft.com/en-us/azure/reliability/availability-zones-service-support

## Upgrading Issues

Azure AD Application: https://github.com/pulumi/pulumi-azuread/issues/185#issuecomment-982414862

## Config Azure Resources

- Set Organization
  pulumi org set-default

$ pulumi config set azure-native:clientId <clientID>
$ pulumi config set azure-native:clientSecret <clientSecret> --secret
$ pulumi config set azure-native:tenantId <tenantID>
$ pulumi config set azure-native:subscriptionId <subscriptionId>

# optional default location, otherwise set in code

$ pulumi config set azure-native:location SoutheastAsia
