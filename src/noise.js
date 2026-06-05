function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function vnoise(px, py) {
  const ix = Math.floor(px), iy = Math.floor(py);
  let fx = px - ix, fy = py - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  return (
    hash(ix,     iy    ) * (1 - fx) * (1 - fy) +
    hash(ix + 1, iy    ) *      fx  * (1 - fy) +
    hash(ix,     iy + 1) * (1 - fx) *      fy  +
    hash(ix + 1, iy + 1) *      fx  *      fy
  );
}

export function fbm(px, py) {
  let v = 0, a = 0.5, x = px, y = py;
  for (let i = 0; i < 4; i++) {
    v += a * vnoise(x, y);
    x  = x * 2.07 + 1.72;
    y  = y * 2.07 + 9.23;
    a *= 0.5;
  }
  return v;
}

export function noiseVec3(x, y, z, t) {
  const s = x * 0.7 + z * 0.3 + t;
  const u = y * 0.7 + z * 0.5 + t + 31.41;
  const v = x * 0.4 + y * 0.6 + t + 17.32;
  return {
    x: fbm(s,       u      ) - 0.5,
    y: fbm(s + 5.2, v      ) - 0.5,
    z: fbm(u + 1.7, v + 9.8) - 0.5,
  };
}
