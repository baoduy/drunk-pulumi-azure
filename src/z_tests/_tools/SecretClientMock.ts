import { createRequire } from 'node:module';

// `@azure/keyvault-secrets` ships dual ESM/CommonJS builds. KeyVault/Helper.ts
// reaches the SDK's SecretClient through `@drunk-pulumi/azure-providers`,
// which is compiled CommonJS and resolves the package via the `require`
// export condition. Importing the package here with a normal ESM `import`
// would resolve the *other* build and patch a different, unrelated class
// (the "dual package hazard") -- so we go through `createRequire` to land on
// the exact same module instance the production code uses.
const req = createRequire(import.meta.url);
const { SecretClient } = req('@azure/keyvault-secrets') as typeof import('@azure/keyvault-secrets');
const { CertificateClient } = req('@azure/keyvault-certificates') as typeof import('@azure/keyvault-certificates');

/**
 * Stubs `SecretClient.prototype.getSecret` so KeyVault/Helper.ts resolves
 * secrets from an in-memory map instead of calling real Azure Key Vault.
 * Vault name is ignored; callers key by the already vault-formatted secret
 * name (see `getVaultItemName`). A name missing from `secrets` throws, which
 * mirrors `KeyVaultBase.getSecret`'s real "not found" path -- it catches the
 * SDK error and resolves `undefined`.
 *
 * Returns a restore function; call it in an `after()` hook.
 */
export const mockSecretClient = (secrets: Record<string, string>) => {
  const original = SecretClient.prototype.getSecret;

  SecretClient.prototype.getSecret = async function (name: string) {
    if (!(name in secrets)) throw new Error(`SecretNotFound: ${name}`);
    return { name, value: secrets[name] } as Awaited<
      ReturnType<typeof original>
    >;
  };

  return () => {
    SecretClient.prototype.getSecret = original;
  };
};

/**
 * Same idea as `mockSecretClient`, for `CertificateClient.getCertificate`.
 * `getCert`/`getCertOutput` are deliberately not wrapped in `pulumi.secret`
 * (out of scope for PULUMI-SEC-009) -- this mock exists only so the coverage
 * gate can exercise them, not to assert secretness.
 */
export const mockCertClient = (certs: Record<string, string>) => {
  const original = CertificateClient.prototype.getCertificate;

  CertificateClient.prototype.getCertificate = async function (name: string) {
    if (!(name in certs)) throw new Error(`CertNotFound: ${name}`);
    return { name, cer: Buffer.from(certs[name]) } as Awaited<
      ReturnType<typeof original>
    >;
  };

  return () => {
    CertificateClient.prototype.getCertificate = original;
  };
};
