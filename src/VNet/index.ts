export * as IpAddress from './IpAddress';
export * as Firewall from './Firewall';

export { StoragePrivateLink } from './PrivateEndpoint';
import links from './PrivateEndpoint';

export const VaultPrivateLink = links.VaultPrivateLink;
export const SqlPrivateLink = links.SqlPrivateLink;
export const SignalRPrivateLink = links.SignalRPrivateLink;
export const ServiceBusPrivateLink = links.ServiceBusPrivateLink;
export const RedisCachePrivateLink = links.RedisCachePrivateLink;
export const PostgreSqlPrivateLink = links.PostgreSqlPrivateLink;
export const MySqlPrivateLink = links.MySqlPrivateLink;
export const AppConfigPrivateLink = links.AppConfigPrivateLink;
export const ApimPrivateLink = links.ApimPrivateLink;
export const AcrPrivateLink = links.AcrPrivateLink;
