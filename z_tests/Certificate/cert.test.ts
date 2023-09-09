import * as certs from '../../Certificate';
import { expect } from 'chai';
import { organization } from '../../Common/StackEnv';

describe('Certificate tests', () => {
  it('Create Self-Sign Certificate', async () => {
    const cert = certs.createSelfSignCert({
      dnsName: 'hbd.test',
      commonName: 'hbd',
      organization,
    });

    expect(cert.cert).not.undefined;
    expect(cert.privateKey).not.undefined;
  });
});
