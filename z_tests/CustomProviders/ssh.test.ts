import { generateKeys } from '../../CustomProviders/SshKeyGenerator';
import '../_tools/Mocks';
import { expect } from 'chai';

describe('Generate ssh Keys tests', () => {
  it('GenerateKeys test', async () => {
    const rs = await generateKeys({
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: '1234567890',
      },
    });

    expect(rs.publicKey).to.be.a('string').and.not.empty;
    expect(rs.privateKey).to.be.a('string').and.not.empty;
  });
});
