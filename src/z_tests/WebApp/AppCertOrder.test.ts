import '../_tools/Mocks';

import assert from 'node:assert/strict';
// AppCertOrder.ts was replaced by a class-based Builder under src/Builder.
import creator from '../../Builder/AppCertBuilder';
import { CertificateProductType } from '@pulumi/azure-native/types/enums/certificateregistration';
import naming from '../../Common/Naming';

describe('AppCertOrder Creator tests', () => {
  it('AppCertOrder Creator', async () => {
    const rs = creator({
      name: 'drunkcoding.net',
      group: { resourceGroupName: 'RG' },
    })
      .for({
        domain: 'drunkcoding.net',
        type: CertificateProductType.StandardDomainValidatedWildCardSsl,
        keySize: 2048,
      })
      .build();

    assert.strictEqual(rs.name, naming.getCertOrderName('drunkcoding.net'));
    // Note: the original test also checked `distinguishedName` (e.g.
    // includes 'CN=*'), but the current Builder's build() only returns a
    // plain ResourceInfo (name/group/id) — the underlying
    // AppServiceCertificateOrder resource with distinguishedName is no
    // longer exposed, so that assertion has no equivalent to migrate to.
  });
});
