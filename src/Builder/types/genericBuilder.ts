//Common Builder Types
import { Input, Resource } from "@pulumi/pulumi";
import { KeyVaultInfo, ResourceGroupInfo } from "../../types";

export type BuilderProps = {
  name: string;
  group: ResourceGroupInfo;
  vaultInfo: KeyVaultInfo;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
};
export type CommonOmit<T> = Omit<T, keyof BuilderProps>;

//Synchronous
export interface IBuilder<TResults> {
  commonProps: BuilderProps;
  build: () => TResults;
}

export abstract class Builder<TResults> implements IBuilder<TResults> {
  protected constructor(public commonProps: BuilderProps) {}
  public abstract build(): TResults;
}

//Asynchronous
export interface IBuilderAsync<TResults>
  extends Omit<IBuilder<TResults>, "build"> {
  build: () => Promise<TResults>;
}

export abstract class BuilderAsync<TResults>
  implements IBuilderAsync<TResults>
{
  protected constructor(public commonProps: BuilderProps) {}
  public abstract build(): Promise<TResults>;
}