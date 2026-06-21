/**
 * Minimal, dependency-free ZIP writer (store method — no compression).
 *
 * Produces a spec-valid `.zip` (local file headers + central directory + EOCD)
 * that any OS archive tool can open. We avoid pulling in a zip dependency: the
 * workspace is a small set of text files, so uncompressed storage is fine and
 * keeps the client bundle lean.
 *
 * Filenames are written as UTF-8 (general-purpose bit 11 set).
 */

/** Precomputed CRC-32 lookup table (IEEE polynomial 0xEDB88320). */
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] ?? 0;
    const idx = (crc ^ byte) & 0xff;
    crc = (CRC_TABLE[idx] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(v: number): Uint8Array {
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
}

function u32(v: number): Uint8Array {
  return new Uint8Array([
    v & 0xff,
    (v >>> 8) & 0xff,
    (v >>> 16) & 0xff,
    (v >>> 24) & 0xff,
  ]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

/**
 * Bundle a flat path→content map into a ZIP {@link Blob}.
 * Paths are normalized to use forward slashes and sorted for deterministic
 * output.
 */
export function zipFiles(files: Record<string, string>): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  let count = 0;

  const paths = Object.keys(files).sort();
  for (const rawPath of paths) {
    const path = rawPath.replace(/^\/+/, "").replace(/\\/g, "/");
    if (!path) continue;
    const nameBytes = encoder.encode(path);
    const data = encoder.encode(files[rawPath] ?? "");
    const crc = crc32(data);
    const size = data.length;

    // Local file header.
    const localHeader = concat([
      u32(0x04034b50),
      u16(20), // version needed to extract
      u16(0x0800), // general purpose flags: UTF-8 filename
      u16(0), // compression method: store
      u16(0), // last mod time
      u16(0), // last mod date
      u32(crc),
      u32(size), // compressed size
      u32(size), // uncompressed size
      u16(nameBytes.length),
      u16(0), // extra field length
      nameBytes,
    ]);
    localParts.push(localHeader, data);

    // Central directory record (references the local header offset).
    centralParts.push(
      concat([
        u32(0x02014b50),
        u16(20), // version made by
        u16(20), // version needed to extract
        u16(0x0800), // flags: UTF-8
        u16(0), // compression: store
        u16(0), // time
        u16(0), // date
        u32(crc),
        u32(size),
        u32(size),
        u16(nameBytes.length),
        u16(0), // extra length
        u16(0), // comment length
        u16(0), // disk number start
        u16(0), // internal attributes
        u32(0), // external attributes
        u32(offset), // relative offset of local header
        nameBytes,
      ]),
    );

    offset += localHeader.length + data.length;
    count += 1;
  }

  const centralDir = concat(centralParts);
  const eocd = concat([
    u32(0x06054b50),
    u16(0), // number of this disk
    u16(0), // disk with central directory
    u16(count), // entries on this disk
    u16(count), // total entries
    u32(centralDir.length),
    u32(offset), // offset of central directory
    u16(0), // comment length
  ]);

  const archive = concat([...localParts, centralDir, eocd]);
  // Copy into a fresh ArrayBuffer-backed view so the Blob part is unambiguous.
  return new Blob([archive], { type: "application/zip" });
}
