# `SqlBuilder` Class Overview

The `SqlBuilder` class is designed to build and configure an Azure SQL instance with specific configurations such as login, authentication options, network settings, elastic pool, databases, and vulnerability assessment.

### Constructor
#### Purpose:
Initializes the `SqlBuilder` with the provided arguments.

#### Sample Usage:
```typescript
const sqlBuilder = new SqlBuilder({
  name: 'mySqlInstance',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
});
```



### `withVulnerabilityAssessmentIf`
#### Purpose:
Conditionally sets the vulnerability assessment properties for the SQL instance.

#### Sample Usage:
```typescript
sqlBuilder.withVulnerabilityAssessmentIf(true, {
  // SqlBuilderVulnerabilityAssessmentType properties
});
```



### `withVulnerabilityAssessment`
#### Purpose:
Sets the vulnerability assessment properties for the SQL instance.

#### Sample Usage:
```typescript
sqlBuilder.withVulnerabilityAssessment({
  // SqlBuilderVulnerabilityAssessmentType properties
});
```



### `withElasticPool`
#### Purpose:
Sets the elastic pool properties for the SQL instance.

#### Sample Usage:
```typescript
sqlBuilder.withElasticPool({
  // SqlElasticPoolType properties
});
```



### `withTier`
#### Purpose:
Sets the default SKU for the SQL databases.

#### Sample Usage:
```typescript
sqlBuilder.withTier('S1');
```



### `withDatabases`
#### Purpose:
Sets the databases for the SQL instance.

#### Sample Usage:
```typescript
sqlBuilder.withDatabases({
  name: 'myDatabase',
  // other FullSqlDbPropsType properties
});
```



### `copyDb`
#### Purpose:
Copies an existing database to a new database.

#### Sample Usage:
```typescript
sqlBuilder.copyDb({
  name: 'newDatabase',
  fromDbId: 'existingDatabaseId',
  // other SqlFromDbType properties
});
```



### `replicaDb`
#### Purpose:
Creates a replica of an existing database.

#### Sample Usage:
```typescript
sqlBuilder.replicaDb({
  name: 'replicaDatabase',
  fromDbId: 'existingDatabaseId',
  // other SqlFromDbType properties
});
```



### `withNetwork`
#### Purpose:
Sets the network properties for the SQL instance.

#### Sample Usage:
```typescript
sqlBuilder.withNetwork({
  // SqlNetworkType properties
});
```



### `withAuthOptions`
#### Purpose:
Sets the authentication options for the SQL instance.

#### Sample Usage:
```typescript
sqlBuilder.withAuthOptions({
  // SqlBuilderAuthOptionsType properties
});
```



### `generateLogin`
#### Purpose:
Enables the generation of a random login for the SQL instance.

#### Sample Usage:
```typescript
sqlBuilder.generateLogin();
```



### `withLoginInfo`
#### Purpose:
Sets the login information for the SQL instance.

#### Sample Usage:
```typescript
sqlBuilder.withLoginInfo({
  adminLogin: 'adminUser',
  password: 'securePassword',
});
```



### `ignoreChangesFrom`
#### Purpose:
Specifies properties to ignore changes for.

#### Sample Usage:
```typescript
sqlBuilder.ignoreChangesFrom('property1', 'property2');
```



### `lock`
#### Purpose:
Enables or disables locking of the SQL instance.

#### Sample Usage:
```typescript
sqlBuilder.lock(true);
```



### `buildLogin`
#### Purpose:
Generates a random login if enabled.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `buildSql`
#### Purpose:
Creates the SQL instance with the specified configurations.

#### Sample Usage:
This method is called internally by the `build` method and is not typically called directly.

### `build`
#### Purpose:
Builds the SQL instance and returns the results.

#### Sample Usage:
```typescript
const sqlResults = sqlBuilder.build();
console.log(sqlResults);
```



### Full Example
Here is a full example demonstrating how to use the `SqlBuilder` class:

```typescript
import SqlBuilder from './Builder/SqlBuilder';
import { SqlBuilderArgs } from './types';

const args: SqlBuilderArgs = {
  name: 'mySqlInstance',
  group: { resourceGroupName: 'myResourceGroup' },
  // other necessary arguments
};

const sqlBuilder = new SqlBuilder(args);

sqlBuilder
  .withVulnerabilityAssessmentIf(true, {
    // SqlBuilderVulnerabilityAssessmentType properties
  })
  .withElasticPool({
    // SqlElasticPoolType properties
  })
  .withTier('S1')
  .withDatabases({
    name: 'myDatabase',
    // other FullSqlDbPropsType properties
  })
  .copyDb({
    name: 'newDatabase',
    fromDbId: 'existingDatabaseId',
    // other SqlFromDbType properties
  })
  .replicaDb({
    name: 'replicaDatabase',
    fromDbId: 'existingDatabaseId',
    // other SqlFromDbType properties
  })
  .withNetwork({
    // SqlNetworkType properties
  })
  .withAuthOptions({
    // SqlBuilderAuthOptionsType properties
  })
  .generateLogin()
  .withLoginInfo({
    adminLogin: 'adminUser',
    password: 'securePassword',
  })
  .ignoreChangesFrom('property1', 'property2')
  .lock(true);

const sqlResults = sqlBuilder.build();
console.log(sqlResults);
```



### Summary
- **Constructor**: Initializes the builder with necessary arguments.
- **withVulnerabilityAssessmentIf**: Conditionally sets vulnerability assessment properties.
- **withVulnerabilityAssessment**: Sets vulnerability assessment properties.
- **withElasticPool**: Configures the elastic pool properties.
- **withTier**: Sets the default SKU for the SQL databases.
- **withDatabases**: Configures the databases for the SQL instance.
- **copyDb**: Copies an existing database to a new database.
- **replicaDb**: Creates a replica of an existing database.
- **withNetwork**: Configures the network properties for the SQL instance.
- **withAuthOptions**: Sets authentication options for the SQL instance.
- **generateLogin**: Enables the generation of a random login.
- **withLoginInfo**: Sets the login information.
- **ignoreChangesFrom**: Specifies properties to ignore changes for.
- **lock**: Enables or disables locking of the SQL instance.
- **buildLogin**: Internally generates a random login if enabled.
- **buildSql**: Internally creates the SQL instance.
- **build**: Executes the build process and returns the results.

This guideline should help developers understand and reuse the methods in the `SqlBuilder` class effectively.