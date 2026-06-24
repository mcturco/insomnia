// Browser-compatible polyfill for Node.js `crypto` / `node:crypto`.
// Provides the subset bundled code uses: sync `createHash` (SHA-1 / SHA-256),
// plus `randomBytes` / `randomUUID` (Web Crypto).
//
// IMPORTANT: this module must stay import-free. Pulling in a CommonJS lib like
// crypto-js makes Rollup co-bundle it here and wrap the chunk with
// `getAugmentedNamespace`, which eagerly reads this module's `default` export at
// init → "Cannot access 'Ue' before initialization" TDZ crash at app boot.

type HashEncoding = 'hex' | 'base64';

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

function toBytes(data: string | ArrayBuffer | Uint8Array): Uint8Array {
  if (typeof data === 'string') {
    return utf8(data);
  }
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

// Big-endian padding shared by SHA-1 and SHA-256.
function pad(bytes: Uint8Array): DataView {
  const bitLen = bytes.length * 8;
  const total = Math.ceil((bytes.length + 1 + 8) / 64) * 64;
  const msg = new Uint8Array(total);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  const dv = new DataView(msg.buffer);
  dv.setUint32(total - 4, bitLen >>> 0, false);
  dv.setUint32(total - 8, Math.floor(bitLen / 0x1_00_00_00_00), false);
  return dv;
}

function sha1(bytes: Uint8Array): Uint8Array {
  const dv = pad(bytes);
  let h0 = 0x67_45_23_01;
  let h1 = 0xef_cd_ab_89;
  let h2 = 0x98_ba_dc_fe;
  let h3 = 0x10_32_54_76;
  let h4 = 0xc3_d2_e1_f0;
  const w = new Uint32Array(80);
  for (let i = 0; i < dv.byteLength; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = dv.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 80; j++) {
      const v = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (v << 1) | (v >>> 31);
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let j = 0; j < 80; j++) {
      let f: number;
      let k: number;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a_82_79_99;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6e_d9_eb_a1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f_1b_bc_dc;
      } else {
        f = b ^ c ^ d;
        k = 0xca_62_c1_d6;
      }
      const tmp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) >>> 0;
      e = d;
      d = c;
      c = (b << 30) | (b >>> 2);
      b = a;
      a = tmp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  new DataView(out.buffer).setUint32(0, h0, false);
  new DataView(out.buffer).setUint32(4, h1, false);
  new DataView(out.buffer).setUint32(8, h2, false);
  new DataView(out.buffer).setUint32(12, h3, false);
  new DataView(out.buffer).setUint32(16, h4, false);
  return out;
}

const K256 = new Uint32Array([
  0x42_8a_2f_98, 0x71_37_44_91, 0xb5_c0_fb_cf, 0xe9_b5_db_a5, 0x39_56_c2_5b, 0x59_f1_11_f1, 0x92_3f_82_a4, 0xab_1c_5e_d5, 0xd8_07_aa_98,
  0x12_83_5b_01, 0x24_31_85_be, 0x55_0c_7d_c3, 0x72_be_5d_74, 0x80_de_b1_fe, 0x9b_dc_06_a7, 0xc1_9b_f1_74, 0xe4_9b_69_c1, 0xef_be_47_86,
  0x0f_c1_9d_c6, 0x24_0c_a1_cc, 0x2d_e9_2c_6f, 0x4a_74_84_aa, 0x5c_b0_a9_dc, 0x76_f9_88_da, 0x98_3e_51_52, 0xa8_31_c6_6d, 0xb0_03_27_c8,
  0xbf_59_7f_c7, 0xc6_e0_0b_f3, 0xd5_a7_91_47, 0x06_ca_63_51, 0x14_29_29_67, 0x27_b7_0a_85, 0x2e_1b_21_38, 0x4d_2c_6d_fc, 0x53_38_0d_13,
  0x65_0a_73_54, 0x76_6a_0a_bb, 0x81_c2_c9_2e, 0x92_72_2c_85, 0xa2_bf_e8_a1, 0xa8_1a_66_4b, 0xc2_4b_8b_70, 0xc7_6c_51_a3, 0xd1_92_e8_19,
  0xd6_99_06_24, 0xf4_0e_35_85, 0x10_6a_a0_70, 0x19_a4_c1_16, 0x1e_37_6c_08, 0x27_48_77_4c, 0x34_b0_bc_b5, 0x39_1c_0c_b3, 0x4e_d8_aa_4a,
  0x5b_9c_ca_4f, 0x68_2e_6f_f3, 0x74_8f_82_ee, 0x78_a5_63_6f, 0x84_c8_78_14, 0x8c_c7_02_08, 0x90_be_ff_fa, 0xa4_50_6c_eb, 0xbe_f9_a3_f7,
  0xc6_71_78_f2,
]);

function sha256(bytes: Uint8Array): Uint8Array {
  const dv = pad(bytes);
  const h = new Uint32Array([
    0x6a_09_e6_67, 0xbb_67_ae_85, 0x3c_6e_f3_72, 0xa5_4f_f5_3a, 0x51_0e_52_7f, 0x9b_05_68_8c, 0x1f_83_d9_ab, 0x5b_e0_cd_19,
  ]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < dv.byteLength; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = dv.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K256[j] + w[j]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) {
    odv.setUint32(i * 4, h[i], false);
  }
  return out;
}

function encode(bytes: Uint8Array, encoding: HashEncoding): string {
  if (encoding === 'base64') {
    return btoa(String.fromCodePoint(...bytes));
  }
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

class Hash {
  private chunks: Uint8Array[] = [];

  constructor(private readonly algorithm: string) {}

  update(data: string | ArrayBuffer | Uint8Array): this {
    this.chunks.push(toBytes(data));
    return this;
  }

  digest(encoding: HashEncoding = 'hex'): string {
    const input = concat(this.chunks);
    // sha1 for sha1; everything else (sha256/sha512/unknown) maps to sha256.
    const bytes = this.algorithm.toLowerCase() === 'sha1' ? sha1(input) : sha256(input);
    return encode(bytes, encoding);
  }
}

export function createHash(algorithm: string): Hash {
  return new Hash(algorithm);
}

// Returns a Uint8Array augmented with the Buffer-ish toString('hex'|'base64') callers expect.
export function randomBytes(size: number) {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  const toString = (encoding: HashEncoding = 'hex') => encode(bytes, encoding);
  return Object.assign(bytes, { toString });
}

export function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}

export default { createHash, randomBytes, randomUUID };
