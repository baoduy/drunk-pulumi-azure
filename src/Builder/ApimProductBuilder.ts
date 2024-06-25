import * as apim from "@pulumi/azure-native/apimanagement";
import { interpolate } from "@pulumi/pulumi";
import { getPasswordName } from "../Common/Naming";
import { randomPassword } from "../Core/Random";
import { addCustomSecret } from "../KeyVault/CustomHelper";
import { ResourceInfo } from "../types";
import {
  APimApiBuilderFunction,
  ApimChildBuilderProps,
  ApimProductSubscriptionBuilderType,
  Builder,
  IApimProductBuilder,
} from "./types";

export class ApimProductBuilder
  extends Builder<ResourceInfo>
  implements IApimProductBuilder
{
  private _apis: APimApiBuilderFunction[] = [];
  private _requiredSubscription:
    | ApimProductSubscriptionBuilderType
    | undefined = undefined;

  private _productInstance: apim.Product | undefined = undefined;
  private _subInstance: apim.Subscription | undefined = undefined;
  private _productInstanceName: string | undefined = undefined;

  public constructor(private props: ApimChildBuilderProps) {
    super(props);
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

  private buildProduct() {
    this._productInstanceName = `${this.props.name}-product`;
    this._productInstance = new apim.Product(this._productInstanceName!, {
      productId: this._productInstanceName,
      displayName: this._productInstanceName,
      description: this._productInstanceName,
      serviceName: this.props.apimServiceName,
      resourceGroupName: this.props.group.resourceGroupName,

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
  private buildApis() {
    this._apis.map((api) => {
      const apiBuilder = ApimAPi;
    });
  }

  public build(): ResourceInfo {
    this.buildProduct();
    this.buildSubscription();
    this.buildApis();

    return {
      resourceName: this._productInstanceName!,
      group: this.props.group,
      id: this._productInstance!.id,
    };
  }
}
