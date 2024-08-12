//Common Builder Types
import {
  BasicResourceWithVaultArgs,
  LoginArgs,
  ResourceInfo,
  TypeOmit,
  WithDependsOn,
} from '../../types';

export type BuilderProps = BasicResourceWithVaultArgs & WithDependsOn;
export type OmitBuilderProps<T> = TypeOmit<T, BuilderProps>;

export interface ILoginBuilder<IReturnInterface> {
  generateLogin(): IReturnInterface;
  withLoginInfo(props: LoginArgs): IReturnInterface;
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
  extends Omit<IBuilder<TResults>, 'build'> {
  build(): Promise<TResults>;
}

export abstract class BuilderAsync<TResults extends ResourceInfo>
  implements IBuilderAsync<TResults>
{
  protected constructor(public commonProps: BuilderProps) {}
  public abstract build(): Promise<TResults>;
}

//Other interface
export interface IEncryptable<TBuilderResults> {
  enableEncryption(enabled?: boolean): TBuilderResults;
}
export interface ILockable<TBuilderResults> {
  lock(lock?: boolean): TBuilderResults;
}
export interface IIgnoreChanges<TBuilderResults> {
  ignoreChangesFrom(...props: string[]): TBuilderResults;
}
export interface IInfo<TBuilderResults> {
  info(): TBuilderResults;
}
