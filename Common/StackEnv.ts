import { Config, runtime, getProject } from '@pulumi/pulumi';

export const projectName = getProject();
console.log(`Current Pulumi Project:`, projectName);

const getStack = (): {
  stack: string;
  config: Config | undefined;
  testMode: boolean;
} => {
  let stack: string = 'test-stack';
  let config: Config | undefined = undefined;
  let testMode = true;

  if (!process.env.TEST_MODE) {
    //Config
    config = new Config();
    stack = runtime.getStack().toLowerCase();
    testMode = false;
  } else console.log('TEST_MODE', process.env.TEST_MODE);

  return { config, stack, testMode };
};

export const { config, stack, testMode } = getStack();
