import * as pulumi from '@pulumi/pulumi';

/**
 * DynamicProviderInputs represents the inputs that are passed as inputs
 * to each function in the implementation of a `pulumi.dynamic.ResourceProvider`.
 */
export interface DefaultInputs {}

/**
 * The Outputs represents the output type of `create` function in the
 * dynamic resource provider.
 */
export interface DefaultOutputs extends Omit<DefaultInputs, 'result'> {
  name: string;
}

/**
 * The Base Options represents the inputs to the dynamic resource.
 * Any property of type `Input<T>` will automatically be resolved to their type `T`
 * by the custom dynamic resource before passing them to the functions in the
 * dynamic resource provider.
 */
export type BaseOptions<TOptions = DefaultInputs> = {
  [K in keyof TOptions]: pulumi.Input<TOptions[K]>;
};

export type BaseOutputs<TOptions = DefaultInputs> = {
  [K in keyof TOptions]: pulumi.Output<TOptions[K]>;
};

export interface BaseProvider<
  TInputs extends DefaultInputs,
  TOutputs extends DefaultOutputs
> extends pulumi.dynamic.ResourceProvider {
  check?: (olds: TInputs, news: TInputs) => Promise<pulumi.dynamic.CheckResult>;

  diff?: (
    id: string,
    previousOutput: TOutputs,
    news: TInputs
  ) => Promise<pulumi.dynamic.DiffResult>;

  create: (inputs: TInputs) => Promise<pulumi.dynamic.CreateResult>;

  read?: (id: string, props: TOutputs) => Promise<pulumi.dynamic.ReadResult>;

  update?: (
    id: string,
    olds: TOutputs,
    news: TInputs
  ) => Promise<pulumi.dynamic.UpdateResult>;

  delete?: (id: string, props: TOutputs) => Promise<void>;
}

export abstract class BaseResource<
  TInputs extends DefaultInputs,
  TOutputs extends DefaultOutputs
> extends pulumi.dynamic.Resource {
  constructor(
    provider: BaseProvider<TInputs, TOutputs>,
    name: string,
    args: BaseOptions<TInputs>,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(provider, name, args, opts);
  }
}
