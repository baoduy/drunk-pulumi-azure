import * as pulumi from '@pulumi/pulumi';
import { EnvRoleBuilder, ResourceBuilder } from '@drunk-pulumi/azure/Builder';

const rs = (async () => {
  const rs = await ResourceBuilder('az-test')
    .createRoles()
    .createRG({ enableVaultRoles: true })
    .createVault('az-test-vault')
    .build();

  var roles = EnvRoleBuilder.loadForm(rs.vaultInfo!).admin;
  return { group: rs.group, roles };
})();

export default pulumi.output(rs);
