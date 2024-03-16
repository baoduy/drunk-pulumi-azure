import { getSecretName } from "../Common/Naming";

export enum BusConnectionTypes {
  Listen = "Listen",
  Send = "Send",
  Both = "Both",
  Manage = "Manage",
}

const getVersioningName = (shortName: string, version: number) =>
  `${shortName.toLowerCase()}-v${version}`;

/** ShortName: wallet and version is 1 => wallet-v1-tp */
export const getTopicName = (topicShortName: string, version: number) =>
  `${getVersioningName(topicShortName, version)}-tp`;

/** ShortName: Submersible => Submersible-sub */
export const getSubscriptionName = (subShortName: string) =>
  `${subShortName}-sub`;

/** ShortName: Notify and version is 1 => Notify-v1-que */
export const getQueueName = (queueShortName: string, version: number) =>
  `${getVersioningName(queueShortName, version)}-que`;

interface BusVaultNameProps {
  fullName: string;
  namespaceFullName: string;
  connectionType: BusConnectionTypes;
}

/** Get Key vault name for Topic or Queue */
export const getTopicOrQueueVaultName = ({
  connectionType,
  fullName,
  namespaceFullName,
}: BusVaultNameProps) => {
  if (connectionType === BusConnectionTypes.Both)
    throw `the ${connectionType} is not supported`;

  return `${getSecretName(
    `${namespaceFullName}-${fullName}`
  )}-${connectionType.toLocaleLowerCase()}`;
};

export const getNamespaceVaultName = ({
  connectionType,
  namespaceFullName,
}: Omit<BusVaultNameProps, "fullName">) => {
  if (connectionType === BusConnectionTypes.Both)
    throw `the ${connectionType} is not supported`;

  return `${getSecretName(
    namespaceFullName
  )}-${connectionType.toLocaleLowerCase()}`;
};
