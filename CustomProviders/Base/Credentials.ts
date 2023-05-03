import {
  ClientSecretCredential,
  TokenCredential,
  getDefaultAzureCredential,
  GetTokenOptions,
} from '@azure/identity';
import { Config } from '@pulumi/pulumi';

type WebResource = { headers: { set: (key: string, value: string) => void } };

export class ClientCredential implements TokenCredential {
  public subscriptionID: string | undefined = undefined;

  private getCredentials() {
    const config = new Config('azure-native');

    const clientID = process.env['ARM_CLIENT_ID'] || config.get('clientId');
    const clientSecret =
      process.env['ARM_CLIENT_SECRET'] || config.get('clientSecret');
    const tenantID = process.env['ARM_TENANT_ID'] || config.get('clientId');
    this.subscriptionID =
      process.env['ARM_SUBSCRIPTION_ID'] || config.get('subscriptionId');

    if (!this.subscriptionID) throw new Error('subscriptionId is not found.');

    return tenantID && clientID && clientSecret
      ? new ClientSecretCredential(tenantID, clientID, clientSecret)
      : getDefaultAzureCredential();
  }

  public async getToken(
    scopes: string | string[] = 'https://management.azure.com/.default',
    options?: GetTokenOptions | undefined
  ) {
    const credential = this.getCredentials();
    return await credential.getToken(scopes, options);
  }

  public async signRequest(webResource: WebResource): Promise<WebResource> {
    const tokenResponse = await this.getToken();
    if (tokenResponse)
      webResource.headers.set('Authorization', `Brear ${tokenResponse.token}`);
    return webResource;
  }
}
