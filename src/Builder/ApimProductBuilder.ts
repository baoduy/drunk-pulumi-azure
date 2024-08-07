import * as apim from '@pulumi/azure-native/apimanagement';
import { interpolate } from '@pulumi/pulumi';
import { getPasswordName } from '../Common';
import { randomPassword } from '../Core/Random';
import { addCustomSecret, addCustomSecrets } from '../KeyVault/CustomHelper';
import { ResourceInfo } from '../types';
import ApimApiBuilder from './ApimApiBuilder';
import ApimPolicyBuilder from './ApimPolicyBuilder';
import {
  APimApiBuilderFunction,
  ApimApiPolicyType,
  ApimChildBuilderProps,
  ApimProductSubscriptionBuilderType,
  BuilderAsync,
  IApimProductBuilder,
  IBuilderAsync,
} from './types';

export class ApimProductBuilder
  extends BuilderAsync<ResourceInfo>
  implements IApimProductBuilder
{
  private _apis: APimApiBuilderFunction[] = [];
  private _requiredSubscription:
    | ApimProductSubscriptionBuilderType
    | undefined = undefined;

  private _productInstance: apim.Product | undefined = undefined;
  private _subInstance: apim.Subscription | undefined = undefined;
  private _productInstanceName: string;
  private _policyString: string;
  private _state: apim.ProductState = 'notPublished';

  public constructor(private props: ApimChildBuilderProps) {
    super(props);
    this._productInstanceName = `${props.name}-product`;
    //Empty Policy
    this._policyString = new ApimPolicyBuilder({
      ...props,
      name: this._productInstanceName,
    }).build();
  }

  public withPolicies(props: ApimApiPolicyType): IApimProductBuilder {
    this._policyString = props(
      new ApimPolicyBuilder({ ...this.props, name: this._productInstanceName }),
    ).build();
    return this;
  }
  public requiredSubscription(
    props: ApimProductSubscriptionBuilderType,
  ): IApimProductBuilder {
    this._requiredSubscription = props;
    return this;
  }
  public withApi(props: APimApiBuilderFunction): IApimProductBuilder {
    this._apis.push(props);
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

      serviceName: this.props.apimServiceName,
      resourceGroupName: this.props.group.resourceGroupName,

      state: this._state,
      subscriptionRequired: Boolean(this._requiredSubscription),
      approvalRequired: this._requiredSubscription
        ? this._requiredSubscription?.approvalRequired
        : undefined,
      subscriptionsLimit: this._requiredSubscription?.subscriptionsLimit ?? 5,
    });

    if (this._policyString) {
      new apim.ProductPolicy(`${this._productInstanceName}-policy`, {
        serviceName: this.props.apimServiceName,
        resourceGroupName: this.props.group.resourceGroupName,
        productId: this._productInstanceName,
        format: 'xml',
        policyId: 'policy',
        value: this._policyString,
      });
    }
  }
  private buildSubscription() {
    if (!this._productInstance) return;
    const subName = `${this.props.name}-sub`;
    const primaryKey = getPasswordName(subName, 'primary');
    const secondaryKey = getPasswordName(subName, 'secondary');

    const primaryPass = randomPassword({ name: primaryKey }).result;
    const secondaryPass = randomPassword({ name: secondaryKey }).result;

    this._subInstance = new apim.Subscription(
      subName,
      {
        sid: subName,
        displayName: subName,
        serviceName: this.props.apimServiceName,
        resourceGroupName: this.props.group.resourceGroupName,
        scope: interpolate`/products/${this._productInstance!.id}`,
        primaryKey: primaryPass,
        secondaryKey: secondaryPass,
      },
      { dependsOn: this._productInstance },
    );

    if (this.props.vaultInfo) {
      addCustomSecrets({
        contentType: subName,
        vaultInfo: this.props.vaultInfo,
        formattedName: true,
        dependsOn: this._subInstance,
        items: [
          { name: primaryKey, value: primaryPass },
          { name: secondaryKey, value: secondaryPass },
        ],
      });
    }
  }

  private async buildApis() {
    const tasks = this._apis.map((api) =>
      api(
        new ApimApiBuilder({
          ...this.props,
          productId: this._productInstanceName,
          requiredSubscription: Boolean(this._requiredSubscription),
          dependsOn: this._productInstance,
        }),
      ).build(),
    );
    await Promise.all(tasks);
  }

  public async build(): Promise<ResourceInfo> {
    this.buildProduct();
    this.buildSubscription();
    await this.buildApis();

    return {
      name: this._productInstanceName,
      group: this.props.group,
      id: this._productInstance!.id,
    };
  }
}
