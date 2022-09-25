import { ConventionProps } from '../types';
import { testMode, projectName, stack } from './StackEnv';

//This configuration will be shared across all the projects
//TODO: Update this value when copy for other project

//This will be added after the suffix of Resource Group
export const organizationName = testMode ? 'hbd' : projectName.split('-')[1];

export const apimHeaderKey = `x-${organizationName.toLowerCase()}-key`;
export const apimHookHeaderKey = `x-${organizationName.toLowerCase()}-hook`;

export const globalKeyName = 'global';

/**The Global resource group name.*/
export const globalConvention: ConventionProps = {
  prefix: globalKeyName,
  suffix: organizationName ? `grp-${organizationName}` : 'grp',
};

export const resourceConvention = {
  prefix: stack.toLowerCase(),
  suffix: undefined, //This may me specified by each resource name
};

//TODO: update default alert emails
export const defaultAlertEmails = ['drunkcoding@outlook.com'];
