import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();

export const getValue = (name: string) => config.get(name);
export const requireValue = (name: string) => config.require(name);

export const getSecret = (name: string) => config.getSecret(name);
export const requireSecret = (name: string) => config.requireSecret(name);
