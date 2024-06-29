//Common Builder Types
import { Input, Resource } from "@pulumi/pulumi";
import { KeyVaultInfo, ResourceGroupInfo, ResourceInfo } from "../../types";
import { EnvRolesResults } from "../../AzAd/EnvRoles";

export type BuilderProps = {
  name: string;
  group: ResourceGroupInfo;
  envRoles: EnvRolesResults;
  vaultInfo: KeyVaultInfo;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
};
export type CommonOmit<T> = Omit<T, keyof BuilderProps>;
export type LoginBuilderProps = {
  adminLogin: Input<string>;
  password: Input<string>;
};

export interface ILoginBuilder<IReturnInterface> {
  generateLogin(): IReturnInterface;
  withLoginInfo(props: LoginBuilderProps): IReturnInterface;
}

//Synchronous
export interface IBuilder<TResults extends ResourceInfo> {
  commonProps: BuilderProps;
  build(): TResults;
}

export abstract class Builder<TResults extends ResourceInfo>
  implements IBuilder<TResults>
{
  protected constructor(public commonProps: BuilderProps) {}
  public abstract build(): TResults;
}

//Asynchronous
export interface IBuilderAsync<TResults extends ResourceInfo>
  extends Omit<IBuilder<TResults>, "build"> {
  build(): Promise<TResults>;
}

export abstract class BuilderAsync<TResults extends ResourceInfo>
  implements IBuilderAsync<TResults>
{
  protected constructor(public commonProps: BuilderProps) {}
  public abstract build(): Promise<TResults>;
}
