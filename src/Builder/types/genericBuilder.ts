// Common Builder Types
import {
  BasicResourceWithVaultArgs,
  LoginArgs,
  ResourceInfo,
  TypeOmit,
  WithDependsOn,
} from '../../types';

/**
 * Properties for a builder, including basic resource properties with vault information and dependencies.
 */
export type BuilderProps = BasicResourceWithVaultArgs & WithDependsOn;

/**
 * Type to omit builder properties from a given type.
 */
export type OmitBuilderProps<T> = TypeOmit<T, BuilderProps>;

/**
 * Interface for a login builder.
 * @template IReturnInterface - The return type of the builder methods.
 */
export interface ILoginBuilder<IReturnInterface> {
  /**
   * Method to generate login credentials.
   * @returns The return type specified by IReturnInterface.
   */
  generateLogin(): IReturnInterface;

  /**
   * Method to set login information.
   * @param props - The login arguments.
   * @returns The return type specified by IReturnInterface.
   */
  withLoginInfo(props: LoginArgs): IReturnInterface;
}

/**
 * Interface for a synchronous builder.
 * @template TResults - The type of the build result.
 */
export interface IBuilder<TResults extends ResourceInfo> {
  commonProps: BuilderProps;
  /**
   * Method to build the resource.
   * @returns The build result of type TResults.
   */
  build(): TResults;
}

/**
 * Abstract class for a synchronous builder.
 * @template TResults - The type of the build result.
 */
export abstract class Builder<TResults extends ResourceInfo>
  implements IBuilder<TResults>
{
  protected constructor(public commonProps: BuilderProps) {}
  public abstract build(): TResults;
}

/**
 * Interface for an asynchronous builder.
 * @template TResults - The type of the build result.
 */
export interface IBuilderAsync<TResults extends ResourceInfo>
  extends Omit<IBuilder<TResults>, 'build'> {
  /**
   * Method to build the resource asynchronously.
   * @returns A promise that resolves to the build result of type TResults.
   */
  build(): Promise<TResults>;
}

/**
 * Abstract class for an asynchronous builder.
 * @template TResults - The type of the build result.
 */
export abstract class BuilderAsync<TResults extends ResourceInfo>
  implements IBuilderAsync<TResults>
{
  protected constructor(public commonProps: BuilderProps) {}
  public abstract build(): Promise<TResults>;
}

/**
 * Interface for enabling encryption on a builder.
 * @template TBuilderResults - The return type of the builder methods.
 */
export interface IEncryptable<TBuilderResults> {
  /**
   * Method to enable encryption.
   * @param enabled - Whether encryption is enabled.
   * @returns The return type specified by TBuilderResults.
   */
  enableEncryption(enabled?: boolean): TBuilderResults;
}

/**
 * Interface for locking a builder.
 * @template TBuilderResults - The return type of the builder methods.
 */
export interface ILockable<TBuilderResults> {
  /**
   * Method to lock the builder.
   * @param lock - Whether the builder is locked.
   * @returns The return type specified by TBuilderResults.
   */
  lock(lock?: boolean): TBuilderResults;
}

/**
 * Interface for ignoring changes on a builder.
 * @template TBuilderResults - The return type of the builder methods.
 */
export interface IIgnoreChanges<TBuilderResults> {
  /**
   * Method to specify properties to ignore changes from.
   * @param props - The properties to ignore changes from.
   * @returns The return type specified by TBuilderResults.
   */
  ignoreChangesFrom(...props: string[]): TBuilderResults;
}

/**
 * Interface for retrieving information from a builder.
 * @template TBuilderResults - The return type of the builder methods.
 */
export interface IInfo<TBuilderResults> {
  /**
   * Method to retrieve information from the builder.
   * @returns The return type specified by TBuilderResults.
   */
  info(): TBuilderResults;
}
