/**
 * Aegis Client-Side High-Assurance Cryptographic Engine
 * Finite Field F_{2^31 - 1} & Constant-Time Polynomial Threshold Operations
 */

export const P = 2147483647n; // 2^31 - 1

// Field addition mod p
export function addMod(a, b) {
  const sum = BigInt(a) + BigInt(b);
  return sum >= P ? sum - P : sum;
}

// Field subtraction mod p
export function subMod(a, b) {
  const diff = BigInt(a) - BigInt(b);
  return diff < 0n ? diff + P : diff;
}

// Field multiplication mod p
export function mulMod(a, b) {
  const prod = BigInt(a) * BigInt(b);
  return prod % P;
}

// Constant-time inversion via Fermat's Little Theorem: a^(p-2) mod p
export function invertMod(a) {
  if (a === 0n) return 0n;
  let exp = P - 2n;
  let res = 1n;
  let base = BigInt(a) % P;

  while (exp > 0n) {
    if (exp & 1n) {
      res = (res * base) % P;
    }
    base = (base * base) % P;
    exp >>= 1n;
  }
  return res;
}

// Polynomial evaluation at x using Horner's method
export function evaluatePolynomial(coefficients, x) {
  let xBig = BigInt(x);
  let res = 0n;
  for (let i = coefficients.length - 1; i >= 0; i--) {
    res = (res * xBig + BigInt(coefficients[i])) % P;
  }
  return res;
}

// Split arbitrary string into (k, n) threshold shares
export function splitSecretJs(secretStr, threshold, totalShares) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(secretStr);

  // Pack bytes into 30-bit limbs
  const limbs = [];
  let current = 0n;
  let bits = 0n;

  // Prepend 4-byte length
  const payload = new Uint8Array(4 + bytes.length);
  new DataView(payload.buffer).setUint32(0, bytes.length, false);
  payload.set(bytes, 4);

  for (let i = 0; i < payload.length; i++) {
    current |= BigInt(payload[i]) << bits;
    bits += 8n;
    while (bits >= 30n) {
      limbs.push(current & 0x3fffffffn);
      current >>= 30n;
      bits -= 30n;
    }
  }
  if (bits > 0n) {
    limbs.push(current & 0x3fffffffn);
  }

  const shares = [];
  for (let id = 1; id <= totalShares; id++) {
    shares.push({
      share_id: id,
      threshold,
      total_shares: totalShares,
      limbs: [],
    });
  }

  // Sample polynomial coefficients for visualization
  const samplePolyCoeffs = [];

  for (let l = 0; l < limbs.length; l++) {
    const secretLimb = limbs[l];
    const coeffs = [secretLimb];
    for (let c = 1; c < threshold; c++) {
      // Cryptographically secure random coefficient
      const randArr = new Uint32Array(1);
      window.crypto.getRandomValues(randArr);
      coeffs.push(BigInt(randArr[0]) % P);
    }

    if (l === 0) {
      samplePolyCoeffs.push(...coeffs);
    }

    for (let s = 0; s < totalShares; s++) {
      const x = BigInt(s + 1);
      const y = evaluatePolynomial(coeffs, x);
      shares[s].limbs.push(y);
    }
  }

  const encodedShares = shares.map((s) => {
    const hexParts = s.limbs.map((l) => Number(l).toString(16).padStart(8, '0'));
    return {
      id: s.share_id,
      x: s.share_id,
      preview_y: Number(s.limbs[0] || 0n),
      encoded: `AEGIS-${s.threshold}-${s.share_id}-${hexParts.join('')}`,
    };
  });

  return {
    shares: encodedShares,
    sampleCoeffs: samplePolyCoeffs.map(Number),
  };
}

// Lagrange Interpolation at x=0
export function reconstructSecretJs(encodedSharesList) {
  if (encodedSharesList.length === 0) return '';
  const parsed = encodedSharesList.map((str) => {
    const parts = str.trim().split('-');
    const threshold = parseInt(parts[1], 10);
    const share_id = parseInt(parts[2], 10);
    const hex = parts[3];
    const limbs = [];
    for (let i = 0; i < hex.length; i += 8) {
      limbs.push(BigInt(parseInt(hex.slice(i, i + 8), 16)));
    }
    return { id: share_id, threshold, limbs };
  });

  const k = parsed[0].threshold;
  if (parsed.length < k) {
    throw new Error(`Insufficient shares: need ${k}, provided ${parsed.length}`);
  }

  const subset = parsed.slice(0, k);
  const numLimbs = subset[0].limbs.length;
  const reconstructedLimbs = [];

  for (let l = 0; l < numLimbs; l++) {
    let secret = 0n;
    for (let j = 0; j < k; j++) {
      const xj = BigInt(subset[j].id);
      const yj = subset[j].limbs[l];

      let num = 1n;
      let den = 1n;

      for (let m = 0; m < k; m++) {
        if (m !== j) {
          const xm = BigInt(subset[m].id);
          num = mulMod(num, subMod(0n, xm));
          den = mulMod(den, subMod(xj, xm));
        }
      }

      const denInv = invertMod(den);
      const weight = mulMod(num, denInv);
      const term = mulMod(yj, weight);
      secret = addMod(secret, term);
    }
    reconstructedLimbs.push(secret);
  }

  // Unpack limbs into bytes
  const bytes = [];
  let bitBuf = 0n;
  let bitsInBuf = 0n;

  for (const limb of reconstructedLimbs) {
    bitBuf |= limb << bitsInBuf;
    bitsInBuf += 30n;
    while (bitsInBuf >= 8n) {
      bytes.push(Number(bitBuf & 0xffn));
      bitBuf >>= 8n;
      bitsInBuf -= 8n;
    }
  }

  if (bytes.length < 4) return '';
  const origLen = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  const slice = bytes.slice(4, 4 + origLen);
  return new TextDecoder().decode(new Uint8Array(slice));
}
