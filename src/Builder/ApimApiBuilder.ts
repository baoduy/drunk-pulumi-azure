import * as apim from "@pulumi/azure-native/apimanagement";
import { enums } from "@pulumi/azure-native/types";
import { ResourceInfo } from "../types";
import { ApimPolicyBuilder } from "./index";
import {
  ApimApiKeysType,
  ApimApiPolicyType,
  ApimApiServiceUrlType,
  ApimChildBuilderProps,
  Builder,
  BuilderProps,
  IApimApiBuilder,
  IApimApiServiceBuilder,
} from "./types";

class ApimApiBuilder
  extends Builder<ResourceInfo>
  implements IApimApiServiceBuilder, IApimApiBuilder
{
  private _serviceUrl: ApimApiServiceUrlType | undefined = undefined;
  private _keyParameters: ApimApiKeysType | undefined = undefined;
  private _policies: ApimApiPolicyType | undefined = undefined;
  private _apis: Record<string, any> = {};

  private _apiSets: Record<string, apim.ApiVersionSet> = {};
  private _policyString: string | undefined = undefined;

  public constructor(private props: ApimChildBuilderProps) {
    super(props);
  }
  public withServiceUrl(props: ApimApiServiceUrlType): IApimApiBuilder {
    this._serviceUrl = props;
    return this;
  }
  public withVersion(version: string, builder: any): IApimApiBuilder {
    this._apis[version] = builder;
    return this;
  }

  public withKeys(props: ApimApiKeysType): IApimApiBuilder {
    this._keyParameters = props;
    return this;
  }
  public withPolicies(props: ApimApiPolicyType): IApimApiBuilder {
    this._policies = props;
    return this;
  }
  private buildApis() {
    Object.keys(this._apis).forEach((k) => {
      const setName = `${k}-apiSet`;
      this._apiSets[k] = new apim.ApiVersionSet(setName, {
        versionSetId: setName,
        displayName: setName,
        description: setName,
        serviceName: this.props.apimServiceName,
        resourceGroupName: this.props.group.resourceGroupName,
        versioningScheme: enums.apimanagement.VersioningScheme.Segment,
      });
    });
  }
  private buildPolicies() {
    if (!this._policies) return;
    this._policyString = this._policies(new ApimPolicyBuilder()).build();
  }
  public build(): ResourceInfo {
    throw new Error("Method not implemented.");
  }
}
