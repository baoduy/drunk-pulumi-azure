'use strict';
import crypto from 'crypto';
import asn1js from 'asn1js';
import { toBase64 } from 'pvutils';

export function dhparam(bits?: number): string {
  const dh = crypto.createDiffieHellman(bits || 2048);

  const p = new asn1js.Integer({ valueHex: dh.getPrime() });
  const g = new asn1js.Integer({ value: 2 });
  const seq = new asn1js.Sequence({
    value: [p, g],
  });

  const asn1Value = seq.toBER(false);
  const asn1Base64 = toBase64(asn1js.fromBER(asn1Value).result.toString());

  return asn1Base64;
}
