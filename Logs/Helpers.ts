import * as azure from "@pulumi/azure";
import * as native from "@pulumi/azure-native";

import { DiagnosticProps, KeyVaultInfo } from "../types";
import * as global from "../Common/GlobalEnv";
import { Input } from "@pulumi/pulumi";
import { getResourceInfoFromId } from "../Common/ResourceEnv";
import { getSecret } from "../KeyVault/Helper";
import { getKeyName, getLogWpName } from "../Common/Naming";

export const createDiagnostic = async ({
  name,
  targetResourceId,
  logWpId,
  logStorageId,
  metricsCategories = ["AllMetrics"],
  logsCategories,
  dependsOn,
}: DiagnosticProps) => {
  //Ensure logWpId or logStorageId is provided
  if (!logWpId && !logStorageId) {
    console.error(
      `Diagnostic for "${name}" must have either a "logWpId" or "logStorageId".`
    );
    return undefined;
  }

  //Ensure targetResourceId is valid
  if (!targetResourceId) {
    console.error(`Target resource of "${name}" must beprovided .`);
    return undefined;
  }

  const n = `${name}-diag`;
  return new native.insights.DiagnosticSetting(
    n,
    {
      name: n,
      resourceUri: targetResourceId,
      logAnalyticsDestinationType: "AzureDiagnostics",

      workspaceId: logWpId,
      storageAccountId: logWpId ? undefined : logStorageId,

      //Metric
      metrics: metricsCategories
        ? metricsCategories.map((c) => ({
            category: c,
            retentionPolicy: { enabled: false, days: 7 },
            enabled: true,
          }))
        : undefined,
      //Logs
      logs: logsCategories
        ? logsCategories.map((c) => ({
            category: c,
            retentionPolicy: { enabled: false, days: 7 },
            enabled: true,
          }))
        : undefined,
    },
    { dependsOn }
  );
};

interface ThreatProtectionProps {
  name: string;
  targetResourceId: Input<string>;
}

export const createThreatProtection = ({
  name,
  targetResourceId,
}: ThreatProtectionProps) => {
  return new azure.securitycenter.AdvancedThreatProtection(name, {
    enabled: true,
    targetResourceId,
  });
};

export const getLogWpSecrets = async (id: string, vaultInfo: KeyVaultInfo) => {
  const info = getResourceInfoFromId(id);
  if (!info) return undefined;

  let name = getLogWpName(info.name);
  if (name.includes("global-")) {
    name = name.replace("global-", "");
    vaultInfo = global.keyVaultInfo;
  }

  const workspaceIdKeyName = `${name}-Id`;
  const primaryKeyName = getKeyName(name, "primary");
  const secondaryKeyName = getKeyName(name, "secondary");

  const [wpId, primaryKey, secondaryKey] = await Promise.all([
    getSecret({ name: workspaceIdKeyName, vaultInfo }),
    getSecret({ name: primaryKeyName, nameFormatted: true, vaultInfo }),
    getSecret({ name: secondaryKeyName, nameFormatted: true, vaultInfo }),
  ]);

  return { wpId, primaryKey, secondaryKey, info };
};
