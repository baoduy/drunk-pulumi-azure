import crypto from 'crypto';

export const dhparam = (bits?: number) => {
  // Create a Diffie-Hellman key exchange object
  const dh = crypto.createDiffieHellman(bits || 2048);

  // Generate the private key using the generator and prime
  const privateKey = dh.generateKeys();

  // Get the prime and generator
  const prime = dh.getPrime();
  const generator = dh.getGenerator();

  // Convert the private key to a PEM formatted string
  const privateKeyPem = `
-----BEGIN PRIVATE KEY-----
${privateKey.toString('base64')}
-----END PRIVATE KEY-----
`;

  // Combine the prime and generator into a PEM formatted string
  const dhparamPem = `
-----BEGIN DH PARAMETERS-----
${prime.toString('base64')}
${generator.toString('base64')}
-----END DH PARAMETERS-----
`;

  return { dhparamPem, privateKeyPem };
};
