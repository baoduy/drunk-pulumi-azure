import * as apim from "@pulumi/azure-native/apimanagement";
import { interpolate } from "@pulumi/pulumi";
import { getPasswordName } from "../Common/Naming";
import { randomPassword } from "../Core/Random";
import { addCustomSecret } from "../KeyVault/CustomHelper";
import { ResourceInfo } from "../types";
import ApimApiBuilder from "./ApimApiBuilder";
import ApimPolicyBuilder from "./ApimPolicyBuilder";
import {
  APimApiBuilderFunction,
  ApimApiPolicyType,
  ApimChildBuilderProps,
  ApimProductSubscriptionBuilderType,
  BuilderAsync,
  IApimProductBuilder,
  IBuilderAsync,
} from "./types";

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
  private _productInstanceName: string | undefined = undefined;
  private _policyString: string | undefined = undefined;
  private _state: apim.ProductState = "notPublished";

  public constructor(private props: ApimChildBuilderProps) {
    super(props);
  }

  public withPolicies(props: ApimApiPolicyType): IApimProductBuilder {
    this._policyString = props(new ApimPolicyBuilder()).build();
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
    this._state = "published";
    return this;
  }

  private buildProduct() {
    this._productInstanceName = `${this.props.name}-product`;
    this._productInstance = new apim.Product(this._productInstanceName!, {
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
  }
  private buildSubscription() {
    if (!this._productInstance) return;
    const subName = `${this.props.name}-sub`;
    const primaryKey = getPasswordName(subName, "primary");
    const secondaryKey = getPasswordName(subName, "secondary");

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

    addCustomSecret({
      name: primaryKey,
      formattedName: true,
      value: primaryPass,
      contentType: subName,
      vaultInfo: this.props.vaultInfo,
      dependsOn: this._subInstance,
    });

    addCustomSecret({
      name: secondaryKey,
      formattedName: true,
      value: secondaryPass,
      contentType: subName,
      vaultInfo: this.props.vaultInfo,
      dependsOn: this._subInstance,
    });
  }

  private async buildApis() {
    const tasks = this._apis.map((api) =>
      api(
        new ApimApiBuilder({
          ...this.props,
          productId: this._productInstance!.id,
          requiredSubscription: Boolean(this._requiredSubscription),
          policyString: this._policyString,
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
      resourceName: this._productInstanceName!,
      group: this.props.group,
      id: this._productInstance!.id,
    };
  }
}
