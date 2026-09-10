import { NetworkRuleDefaultActionType } from '../types';

/**
 * Derives the network rule-set default action.
 *
 * An explicit `defaultAction` always wins; otherwise any caller-supplied
 * IP/VNet rule implies `Deny`, and no rules keeps `Allow`.
 */
export const getNetworkDefaultAction = (
  hasRules: boolean,
  defaultAction?: NetworkRuleDefaultActionType
): NetworkRuleDefaultActionType => defaultAction ?? (hasRules ? 'Deny' : 'Allow');
