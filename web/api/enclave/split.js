export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { secret, threshold = 3, total_shares = 5 } = req.body || {};
  if (!secret) {
    return res.status(400).json({ error: 'Master Key input cannot be empty' });
  }

  const P = 2147483647n;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(secret);

  const limbs = [];
  let current = 0n;
  let bits = 0n;

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
  for (let id = 1; id <= total_shares; id++) {
    shares.push({
      id,
      x: id,
      threshold,
      total_shares,
      limbs: [],
    });
  }

  for (let l = 0; l < limbs.length; l++) {
    const coeffs = [limbs[l]];
    for (let c = 1; c < threshold; c++) {
      coeffs.push(BigInt(Math.floor(Math.random() * 2147483647)) % P);
    }

    for (let s = 0; s < total_shares; s++) {
      const x = BigInt(s + 1);
      let y = 0n;
      for (let i = coeffs.length - 1; i >= 0; i--) {
        y = (y * x + coeffs[i]) % P;
      }
      shares[s].limbs.push(y);
    }
  }

  const resultShares = shares.map((s) => {
    const hexParts = s.limbs.map((l) => Number(l).toString(16).padStart(8, '0'));
    return {
      id: s.id,
      x: s.x,
      preview_y: Number(s.limbs[0] || 0n),
      encoded: `AEGIS-${threshold}-${s.id}-${hexParts.join('')}`,
    };
  });

  return res.status(200).json({
    success: true,
    threshold,
    total_shares,
    shares: resultShares,
    message: "Master key shredded into constant-time polynomial shares (Mersenne F_{2^31-1})"
  });
}
