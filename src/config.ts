/** The environment configuration fro drunk-pulumi-azure with prefix is DPA*/
export interface EnvConfig {
  DPA_NAMING_DISABLE_REGION: boolean | undefined;
}

export declare namespace NodeJS {
  export interface ProcessEnv extends EnvConfig {}
}

export const env: EnvConfig = {
  DPA_NAMING_DISABLE_REGION: Boolean(process.env.DPA_NAMING_DISABLE_REGION),
};
