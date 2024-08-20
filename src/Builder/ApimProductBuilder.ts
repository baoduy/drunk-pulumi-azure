import * as apim from '@pulumi/azure-native/apimanagement';
import { interpolate } from '@pulumi/pulumi';
import { getPasswordName, randomPassword } from '../Core/Random';
import { addCustomSecrets } from '../KeyVault/CustomHelper';
import { ResourceInfo } from '../types';
import ApimApiBuilder from './ApimApiBuilder';
import ApimPolicyBuilder from './ApimPolicyBuilder';
import {
  APimApiBuilderFunction,
  ApimApiPolicyType,
  ApimChildBuilderProps,
  ApimHookProxyBuilderType,
  ApimProductSubscriptionBuilderType,
  BuilderAsync,
  IApimProductBuilder,
  IBuilderAsync,
  SetHeaderTypes,
} from './types';

export class ApimProductBuilder
  extends BuilderAsync<ResourceInfo>
  implements IApimProductBuilder
{
  private _apis: Record<string, APimApiBuilderFunction> = {};
  private _requiredSubscription:
    | ApimProductSubscriptionBuilderType
    | undefined = undefined;

  private _productInstance: apim.Product | undefined = undefined;
  private _subInstance: apim.Subscription | undefined = undefined;
  private readonly _productInstanceName: string;
  private _policyString: string;
  private _state: apim.ProductState = 'notPublished';

  public constructor(private args: ApimChildBuilderProps) {
    super(args);
    this._productInstanceName = `${args.name}-product`;
    //Empty Policy
    this._policyString = new ApimPolicyBuilder({
      ...args,
      name: this._productInstanceName,
    }).build();
  }

  public withPolicies(props: ApimApiPolicyType): IApimProductBuilder {
    this._policyString = props(
      new ApimPolicyBuilder({ ...this.args, name: this._productInstanceName }),
    ).build();
    return this;
  }

  public requiredSubscription(
    props: ApimProductSubscriptionBuilderType,
  ): IApimProductBuilder {
    this._requiredSubscription = props;
    return this;
  }

  public withApi(
    name: string,
    props: APimApiBuilderFunction,
  ): IApimProductBuilder {
    this._apis[name] = props;
    return this;
  }

  public withHookProxy(
    name: string,
    props: ApimHookProxyBuilderType,
  ): IApimProductBuilder {
    this.withApi(name, (apiBuilder) =>
      apiBuilder
        .withServiceUrl({
          serviceUrl: 'https://hook.proxy.local',
          apiPath: '/',
        })
        .withKeys({ header: props.authHeaderKey })
        .withPolicies((p) =>
          p
            .setHeader({
              name: props.authHeaderKey,
              type: SetHeaderTypes.delete,
            })
            .checkHeader({ name: props.hookHeaderKey })
            .setBaseUrl({
              url: `@(context.Request.Headers.GetValueOrDefault("${props.hookHeaderKey}",""))`,
            }),
        )
        .withVersion('v1', (v) =>
          v.withRevision({
            revision: 1,
            operations: [{ name: 'Post', method: 'POST', urlTemplate: '/' }],
          }),
        ),
    );
    return this;
  }

  public published(): IBuilderAsync<ResourceInfo> {
    this._state = 'published';
    return this;
  }

  private buildProduct() {
    this._productInstance = new apim.Product(this._productInstanceName, {
      productId: this._productInstanceName,
      displayName: this._productInstanceName,
      description: this._productInstanceName,

      serviceName: this.args.apimServiceName,
      resourceGroupName: this.args.group.resourceGroupName,

      state: this._state,
      subscriptionRequired: Boolean(this._requiredSubscription),
      approvalRequired: this._requiredSubscription
        ? this._requiredSubscription?.approvalRequired
        : undefined,
      subscriptionsLimit: this._requiredSubscription?.subscriptionsLimit ?? 5,
    });

    if (this._policyString) {
      new apim.ProductPolicy(`${this._productInstanceName}-policy`, {
        serviceName: this.args.apimServiceName,
        resourceGroupName: this.args.group.resourceGroupName,
        productId: this._productInstanceName,
        format: 'xml',
        policyId: 'policy',
        value: this._policyString,
      });
    }
  }

  private buildSubscription() {
    if (!this._productInstance) return;
    const subName = `${this._productInstanceName}-sub`;
    const primaryKey = getPasswordName(subName, 'primary');
    const secondaryKey = getPasswordName(subName, 'secondary');
    const primaryPass = randomPassword({ name: primaryKey }).result;
    const secondaryPass = randomPassword({ name: secondaryKey }).result;

    this._subInstance = new apim.Subscription(
      subName,
      {
        sid: subName,
        displayName: subName,
        serviceName: this.args.apimServiceName,
        resourceGroupName: this.args.group.resourceGroupName,
        scope: interpolate`/products/${this._productInstance!.id}`,
        primaryKey: primaryPass,
        secondaryKey: secondaryPass,
      },
      { dependsOn: this._productInstance },
    );

    if (this.args.vaultInfo) {
      addCustomSecrets({
        contentType: subName,
        vaultInfo: this.args.vaultInfo,
        dependsOn: this._subInstance,
        items: [
          { name: primaryKey, value: primaryPass },
          { name: secondaryKey, value: secondaryPass },
        ],
      });
    }
  }

  private async buildApis() {
    const tasks = Object.keys(this._apis).map((k) => {
      const api = this._apis[k];
      api(
        new ApimApiBuilder({
          ...this.args,
          name: k,
          productId: this._productInstanceName,
          requiredSubscription: Boolean(this._requiredSubscription),
          dependsOn: this._productInstance,
        }),
      ).build();
    });

    await Promise.all(tasks);
  }

  public async build(): Promise<ResourceInfo> {
    this.buildProduct();
    this.buildSubscription();
    await this.buildApis();

    return {
      name: this._productInstanceName,
      group: this.args.group,
      id: this._productInstance!.id,
    };
  }
}
