import { IEnvRoleBuilder } from '../../Builder/types';
import { EnvRoleInfoType } from '../../types';

/**
 * Minimal stand-in for an IEnvRoleBuilder instance.
 *
 * `envRoles` is an IEnvRoleBuilder (Builder/EnvRoleBuilder.ts), not a plain
 * role-name lookup, so builders under test that only read `envRoles.<role>`
 * and call `envRoles.addMember(...)` need a fake that satisfies the shape
 * without pulling in the real AzureAD group creation.
 */
export const createEnvRoleBuilderStub = (): IEnvRoleBuilder => {
  const roles: Record<'readOnly' | 'contributor' | 'admin', EnvRoleInfoType> = {
    readOnly: { objectId: 'readonly-object-id', displayName: 'readonly-group' },
    contributor: { objectId: 'contributor-object-id', displayName: 'contributor-group' },
    admin: { objectId: 'admin-object-id', displayName: 'admin-group' },
  };

  const stub = {
    ...roles,
    grant: () => stub,
    addMember: () => stub,
    addIdentity: () => stub,
    pushTo: () => stub,
    info: () => roles,
  } as unknown as IEnvRoleBuilder;

  return stub;
};
