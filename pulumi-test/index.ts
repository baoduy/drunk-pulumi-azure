import * as pulumi from '@pulumi/pulumi';
import {
  EnvRoleBuilder,
  ResourceBuilder,
  StorageBuilder,
  AFDBuilder,
} from '@drunk-pulumi/azure';

const rs = (async () => {
  const rs = await ResourceBuilder('az-test')
    .createRoles()
    .createRG({ enableVaultRoles: true })
    .createVault('az-test-vault')
    .build();

  const roles = EnvRoleBuilder.loadForm(rs.vaultInfo!).admin;

  // const storage = StorageBuilder({ ...rs, name: 'testStaticWebDrunk' })
  //   .asStaticWebStorage()
  //   .build();

  // const afd = AFDBuilder({
  //   ...rs,
  // })
  //   .withCustomDomain('test.drunkcoding.net')
  //   .withEndpoint({
  //     name: 'test-static-web',
  //     origin: storage.endpoints.web,
  //   })
  //   .build();

  return { group: rs.group, roles };
})();

export default pulumi.output(rs);
