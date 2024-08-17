import { rules } from './Rulers';
import { ConventionProps } from '../../types';
import { getResourceName } from '../ResourceEnv';

type RulerTypes = typeof rules;

export type NamingType = string | { val: string; rule: ConventionProps };
export type NamingFunc = (name: NamingType) => string;

const namingCreator = (): Record<keyof RulerTypes, NamingFunc> => {
  const rs: Record<string, NamingFunc> = {};

  Object.keys(rules).forEach((r) => {
    const rule = (rules as any)[r] as ConventionProps;

    rs[r] = (name: NamingType) => {
      const n = typeof name === 'string' ? name : name.val;
      const c = typeof name === 'string' ? undefined : name.rule;
      return getResourceName(n, { ...c, ...rule });
    };
  });

  return rs as Record<keyof RulerTypes, NamingFunc>;
};

export default namingCreator();
