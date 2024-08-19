# ApimProductBuilder Class Documentation

## Overview

The `ApimProductBuilder` class is designed to facilitate the creation and management of API Management (APIM) products in Azure using Pulumi. It extends the `BuilderAsync` class and implements the `IApimProductBuilder` interface.

## Imports

```typescript
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
```

## Class Definition

### Constructor

```typescript
public constructor(private args: ApimChildBuilderProps) {
  super(args);
  this._productInstanceName = `${args.name}-product`;
  this._policyString = new ApimPolicyBuilder({
    ...args,
    name: this._productInstanceName,
  }).build();
}
```

- **Parameters**: 
  - `args`: An object of type `ApimChildBuilderProps` containing necessary properties for building the APIM product.
- **Description**: Initializes the class with the provided arguments and sets up the initial state, including an empty policy string.

### Methods

#### withPolicies

```typescript
public withPolicies(props: ApimApiPolicyType): IApimProductBuilder {
  this._policyString = props(
    new ApimPolicyBuilder({ ...this.args, name: this._productInstanceName }),
  ).build();
  return this;
}
```

- **Parameters**: 
  - `props`: A function that takes an `ApimPolicyBuilder` and returns a policy string.
- **Returns**: `IApimProductBuilder`
- **Description**: Sets the policy string for the product.

#### requiredSubscription

```typescript
public requiredSubscription(
  props: ApimProductSubscriptionBuilderType,
): IApimProductBuilder {
  this._requiredSubscription = props;
  return this;
}
```

- **Parameters**: 
  - `props`: An object of type `ApimProductSubscriptionBuilderType` containing subscription details.
- **Returns**: `IApimProductBuilder`
- **Description**: Sets the required subscription details for the product.

#### withApi

```typescript
public withApi(
  name: string,
  props: APimApiBuilderFunction,
): IApimProductBuilder {
  this._apis[name] = props;
  return this;
}
```

- **Parameters**: 
  - `name`: The name of the API.
  - `props`: A function that takes an `ApimApiBuilder` and returns an API configuration.
- **Returns**: `IApimProductBuilder`
- **Description**: Adds an API to the product.

#### withHookProxy

```typescript
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
```

- **Parameters**: 
  - `name`: The name of the hook proxy.
  - `props`: An object of type `ApimHookProxyBuilderType` containing hook proxy details.
- **Returns**: `IApimProductBuilder`
- **Description**: Configures a hook proxy for the product.

#### published

```typescript
public published(): IBuilderAsync<ResourceInfo> {
  this._state = 'published';
  return this;
}
```

- **Returns**: `IBuilderAsync<ResourceInfo>`
- **Description**: Sets the product state to 'published'.

### Private Methods

#### buildProduct

```typescript
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
```

- **Description**: Builds the APIM product and its associated policy.

#### buildSubscription

```typescript
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
      formattedName: true,
      dependsOn: this._subInstance,
      items: [
        { name: primaryKey, value: primaryPass },
        { name: secondaryKey, value: secondaryPass },
      ],
    });
  }
}
```

- **Description**: Builds the subscription for the APIM product and stores the keys in a Key Vault if provided.

#### buildApis

```typescript
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
```

- **Description**: Builds all the APIs associated with the product.

### Public Method

#### build

```typescript
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
```

- **Returns**: `Promise<ResourceInfo>`
- **Description**: Orchestrates the building of the product, subscription, and APIs, and returns the resource information.

