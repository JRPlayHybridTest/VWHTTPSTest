import JSBI from './node_modules/jsbi/dist/jsbi.mjs';
const JSZip = require('jszip');

let util = {};
util.hashU32 = function hashU32(a) {
  a = a | 0;
  a = a + 2127912214 + (a << 12) | 0;
  a = a ^ -949894596 ^ a >>> 19;
  a = a + 374761393 + (a << 5) | 0;
  a = a + -744332180 ^ a << 9;
  a = a + -42973499 + (a << 3) | 0;
  return a ^ -1252372727 ^ a >>> 16 | 0;
}

// Reads a 64-bit little-endian integer from an array.
util.readU64 = function readU64(b, n) {
  let x = 0;
  x |= b[n++] << 0;
  x |= b[n++] << 8;
  x |= b[n++] << 16;
  x |= b[n++] << 24;
  x |= b[n++] << 32;
  x |= b[n++] << 40;
  x |= b[n++] << 48;
  x |= b[n++] << 56;
  return x;
}

// Reads a 32-bit little-endian integer from an array.
util.readU32 = function readU32(b, n) {
  let x = 0;
  x |= b[n++] << 0;
  x |= b[n++] << 8;
  x |= b[n++] << 16;
  x |= b[n++] << 24;
  return x;
}

// Writes a 32-bit little-endian integer from an array.
util.writeU32 = function writeU32(b, n, x) {
  b[n++] = (x >> 0) & 0xff;
  b[n++] = (x >> 8) & 0xff;
  b[n++] = (x >> 16) & 0xff;
  b[n++] = (x >> 24) & 0xff;
}

// Multiplies two numbers using 32-bit integer multiplication.
// Algorithm from Emscripten.
util.imul = function imul(a, b) {
  let ah = a >>> 16;
  let al = a & 65535;
  let bh = b >>> 16;
  let bl = b & 65535;

  return al * bl + (ah * bl + al * bh << 16) | 0;
};

function PositionTable() {

  let TABLE_SIZE = 4096
  this.table = [this.TABLE_SIZE]

  this.hash = function(value) {
    // TODO: check this for correctness thoroughly.
    let tmp = JSBI.BigInt(value);
    tmp = JSBI.bitwiseAnd(tmp, JSBI.BigInt(0x0FFFFFFFF));
    tmp = JSBI.bitwiseAnd(JSBI.multiply(tmp, JSBI.BigInt(2654435761)), JSBI.BigInt(0x0FFF));
    return JSBI.toNumber(tmp);
  }
  this.getPosition = function(val) {
    let index = this.hash(val);
    return this.table[index]
  }

  this.setPosition = function(val, pos) {
    let index = this.hash(val);
    this.table[index] = pos
  }
}

function lz4() {
  let MAX_BLOCK_INPUT_SIZE = 0x7E000000

  let MAX_OFFSET = 65535
  let MIN_MATCH = 4
  let MFLIMIT = 12

  this.encode = function(src) {
    let dst = new Uint8Array(1);
    let inputSize = src.length;
    if (inputSize == 0)
      return dst
    if (inputSize > 127 * MAX_BLOCK_INPUT_SIZE)
      console.error('Buffer Too Large for LZ4 Compression')
    else if (inputSize <= MAX_BLOCK_INPUT_SIZE) {
      //dst.setUint8(0, 0, false);//MAGIC NUM?
      dst[0] = 0
      let dst2 = this.compressDefault(src)

      dst = this.concatBuffer(dst, dst2)
    } else {
      console.error("got bad SIZE in LZ4 compression")
    }
    return dst;
  }

  this.concatBuffer = function(buffer1, buffer2) {
    let tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  };
  this.compressDefault = function(src) {
    consoleHex((src.buffer))
    let srcLen = src.length;
    if (srcLen > MAX_BLOCK_INPUT_SIZE) {

      console.error("ERROR in LZ4 Compression")
      return '';
    }

    //let dst = new Uint8Array(this.worstCaseBlockLength(srcLen));
    let dst = new ArrayBuffer(this.worstCaseBlockLength(srcLen));
    let posTable = new PositionTable();
    let srcPtr = 0;
    let literalHead = 0;
    let dstPtr = 0;
    let MAX_INDEX = srcLen - MFLIMIT;
    while (srcPtr < MAX_INDEX) {
      let curValue = util.readU32(src, srcPtr)

      let matchPos = this.findMatch(posTable, curValue, src, srcPtr)
      if (matchPos != null) {
        let length = this.countMatch(src, matchPos, srcPtr, MAX_INDEX);
        if (length < MIN_MATCH)
          break
        dstPtr += this.copySequence(dst, dstPtr, src.slice(literalHead, srcPtr), [srcPtr - matchPos, length])
        srcPtr += length
        literalHead = srcPtr

      } else {
        posTable.setPosition(curValue, srcPtr)
        srcPtr++;
      }
      //console.error("errr in compress");//let curValue = readLeUint32(src, srcPtr)
    }
    dstPtr += this.copySequence(dst, dstPtr, src.slice(literalHead, srcLen), [0, 0])
    consoleHex(dst.slice(0, dstPtr))
    return dst.slice(0, dstPtr);

  }

  this.countMatch = function(buf, front, back, max) {
    let count = 0
    while (back <= max) {
      if (buf[front] == buf[back])
        count += 1
      else
        break
      front += 1
      back += 1

    }
    return count
  }

  this.findMatch = function(table, val, src, srcPtr) {
    let pos = table.getPosition(val);
    if (pos != undefined && (val == util.readU32(src, pos)))
      if (srcPtr - pos > MAX_OFFSET)
        return null;
      else
        return pos
    else
      return null
  }

  this.worstCaseBlockLength = function(srcLen) {
    return srcLen + Math.floor(srcLen / 255) + 16
  }
  this.copySequence = function(dst, dstHead, literal, match) {

    let dstView = new DataView(dst);

    let litLen = literal.length;
    let dstPtr = dstHead;

    let token = dstView.getUint8(dstPtr, false); //littleEndian=false
    let tokenPtr = dstPtr;

    dstPtr += 1
    if (litLen >= 15) {
      token = (15 << 4)
      let remLen = litLen - 15
      while (remLen >= 255) {
        //dst[dstPtr] = 255
        dstView.setUint8(dstPtr, 255, false);
        dstPtr += 1
        remLen -= 255
      }
      //dst[dstPtr] = remLen
      dstView.setUint8(dstPtr, remLen, false);

      dstPtr += 1
    } else
      token = (litLen << 4)
    //TOKEN PORINTER

    //dstPtr += 1
    for (let i = 0; i < litLen; i++) {
      dstView.setUint8(dstPtr, literal[i], false);
      dstPtr++;
    }

    let offset = match[0];
    let matchLen = match[1];
    if (matchLen > 0) {
      dstView.setUint16(dstPtr, offset, true)
      dstPtr += 2

      // Write the Match length
      matchLen -= MIN_MATCH

      if (matchLen >= 15) {
        token = token | 15
        matchLen -= 15
        while (matchLen >= 255) {
          dstView.setUint8(dstPtr, 255, false);
          //dst[dstPtr] = 255
          dstPtr += 1
          matchLen -= 255
        }

        dstView.setUint8(dstPtr, matchLen, false);
        //dst[dstPtr] = matchLen
        dstPtr += 1
      } else
        token = token | matchLen

    }

    dstView.setUint8(tokenPtr, token, false);
    return dstPtr - dstHead;
  }

}

function mode(array) {
  if (array.length == 0)
    return null;
  let modeMap = {};
  let maxEl = array[0],
    maxCount = 1;
  for (let i = 0; i < array.length; i++) {
    let el = array[i];
    if (modeMap[el] == null)
      modeMap[el] = 1;
    else
      modeMap[el]++;
    if (modeMap[el] > maxCount) {
      maxEl = el;
      maxCount = modeMap[el];
    }
  }
  return maxEl;
}

function usdInt32Compress(values) {
  if (values.length == 0)
    return [];
  let prevalue = 0;
  for (let i = 0; i < values.length; i++) {
    let value = values[i];
    values[i] = value - prevalue;
    prevalue = value;
  }
  let commonValue = mode(values)
  //let data=[];           //2
  let data = new ArrayBuffer(2 * values.length + 1);
  let dataView = new DataView(data);
  let dataPtr = 0;
  //Debug                                 
  dataView.setInt32(dataPtr, commonValue, true);
  dataPtr += 4;
  dataPtr += Math.floor((values.length * 2 + 7) / 8);

  for (let v = 0; v < values.length; v++) {
    let value = values[v];
    let i = v + 16;
    if (value != commonValue) {
      let bitLength = value === 0 ? 0 : Math.abs(value).toString(2).length;

      if (bitLength < 8) {
        let alterable = dataView.getInt8(Math.floor(i / 4));
        alterable |= (1 << ((i % 4) * 2));
        dataView.setUint8(Math.floor(i / 4), alterable, true)
        dataView.setUint8(dataPtr, value, true)
        dataPtr++;
      } else if (bitLength < 16) {

        let alterable = dataView.getInt8(Math.floor(i / 4));
        alterable |= (2 << ((i % 4) * 2));
        dataView.setUint8(Math.floor(i / 4), alterable, true)
        dataView.setUint16(dataPtr, value, true)
        dataPtr++;
        dataPtr++;
      } else {
        console.error("not implemented!!! @ usdInt32Compress Ints Bigger than 16 Byte (sheeesh)")
      }
    }

  }

  return new Int8Array(data.slice(0, dataPtr));
  //return data;
}

function split64Bit(integ) {
  let bigNumber = integ;
  let bigNumberAsBinaryStr = bigNumber.toString(2); // '100000000000000000000000000000000000000000000000000000'
  // Convert the above binary str to 64 bit (actually 52 bit will work) by padding zeros in the left
  let bigNumberAsBinaryStr2 = '';
  for (let i = 0; i < 64 - bigNumberAsBinaryStr.length; i++) {
    bigNumberAsBinaryStr2 += '0';
  };

  bigNumberAsBinaryStr2 += bigNumberAsBinaryStr;

  let lowInt = parseInt(bigNumberAsBinaryStr2.substring(0, 32), 2);
  let highInt = parseInt(bigNumberAsBinaryStr2.substring(32), 2);

  return [highInt, lowInt];
}

function encodeInts(ints, size, byteOrder = true /*'little'*/ , signed = false) {
  if (!signed && size == 8) {
    let arr = new ArrayBuffer(ints.length * 8); // an Int32 takes 4 bytes

    let view = new DataView(arr);
    for (let i = 0; i < ints.length; i++) {
      //view.setBigUint64(i*8, ints[i], byteOrder);//noSafari Support
      let highLow = split64Bit(ints[i]);
      view.setUint32(i * 8, highLow[0], byteOrder);
      view.setUint32((i * 8) + 4, highLow[1], byteOrder);
    }
    //return arr;
    return new Int8Array(arr);
  } else
    console.error("Error @EncodeInts")
}

let prime1 = 0x9e3779b1;
let prime2 = 0x85ebca77;
let prime3 = 0xc2b2ae3d;
let prime4 = 0x27d4eb2f;
let prime5 = 0x165667b1;

// Utility functions/primitives
// --

function rotl32(x, r) {
  x = x | 0;
  r = r | 0;

  return x >>> (32 - r | 0) | x << r | 0;
}

function rotmul32(h, r, m) {
  h = h | 0;
  r = r | 0;
  m = m | 0;

  return util.imul(h >>> (32 - r | 0) | h << r, m) | 0;
}

function shiftxor32(h, s) {
  h = h | 0;
  s = s | 0;

  return h >>> s ^ h | 0;
}

// Implementation
// --

function xxhapply(h, src, m0, s, m1) {
  return rotmul32(util.imul(src, m0) + h, s, m1);
}

function xxh1(h, src, index) {
  return rotmul32((h + util.imul(src[index], prime5)), 11, prime1);
}

function xxh4(h, src, index) {
  return xxhapply(h, util.readU32(src, index), prime3, 17, prime4);
}

function xxh16(h, src, index) {
  return [
    xxhapply(h[0], util.readU32(src, index + 0), prime2, 13, prime1),
    xxhapply(h[1], util.readU32(src, index + 4), prime2, 13, prime1),
    xxhapply(h[2], util.readU32(src, index + 8), prime2, 13, prime1),
    xxhapply(h[3], util.readU32(src, index + 12), prime2, 13, prime1)
  ];
}

function xxh32(seed, src, index, len) {
  let h, l;
  l = len;
  if (len >= 16) {
    h = [
      seed + prime1 + prime2,
      seed + prime2,
      seed,
      seed - prime1
    ];

    while (len >= 16) {
      h = xxh16(h, src, index);

      index += 16;
      len -= 16;
    }

    h = rotl32(h[0], 1) + rotl32(h[1], 7) + rotl32(h[2], 12) + rotl32(h[3], 18) + l;
  } else {
    h = (seed + prime5 + len) >>> 0;
  }

  while (len >= 4) {
    h = xxh4(h, src, index);

    index += 4;
    len -= 4;
  }

  while (len > 0) {
    h = xxh1(h, src, index);

    index++;
    len--;
  }

  h = shiftxor32(util.imul(shiftxor32(util.imul(shiftxor32(h, 15), prime2), 13), prime3), 16);

  return h >>> 0;
}

/*
let xxh32={};
xxh32.hash = xxh32;
*/
let xxhash = {};
xxhash.hash = xxh32;

// lz4.js - An implementation of Lz4 in plain JavaScript.
//
// TODO:
// - Unify header parsing/writing.
// - Support options (block size, checksums)
// - Support streams
// - Better error handling (handle bad offset, etc.)
// - HC support (better search algorithm)
// - Tests/benchmarking

// Constants
// --

// Compression format parameters/constants.

let minMatch = 4;
let minLength = 13;
let searchLimit = 5;
let skipTrigger = 6;
let hashSize = 1 << 16;

// Token constants.
let mlBits = 4;
let mlMask = (1 << mlBits) - 1;
let runBits = 4;
let runMask = (1 << runBits) - 1;

// Shared buffers
let blockBuf = makeBuffer(5 << 20);
let hashTable = makeHashTable();

// Frame constants.
let magicNum = 0; //0x184D2204;

// Frame descriptor flags.
let fdContentChksum = 0x4;
let fdContentSize = 0x8;
let fdBlockChksum = 0x10;
// let fdBlockIndep = 0x20;
let fdVersion = 0x40;
let fdVersionMask = 0xC0;

// Block sizes.
let bsUncompressed = 0x80000000;
let bsDefault = 7;
let bsShift = 4;
let bsMask = 7;
let bsMap = {
  4: 0x10000,
  5: 0x40000,
  6: 0x100000,
  7: 0x400000
};

// Utility functions/primitives
// --

// Makes our hashtable. On older browsers, may return a plain array.
function makeHashTable() {
  try {
    return new Uint32Array(hashSize);
  } catch (error) {
    let hashTable = new Array(hashSize);

    for (let i = 0; i < hashSize; i++) {
      hashTable[i] = 0;
    }

    return hashTable;
  }
}

// Clear hashtable.
function clearHashTable(table) {
  for (let i = 0; i < hashSize; i++) {
    hashTable[i] = 0;
  }
}

// Makes a byte buffer. On older browsers, may return a plain array.
function makeBuffer(size) {
  try {
    return new Uint8Array(size);
  } catch (error) {
    let buf = new Array(size);

    for (let i = 0; i < size; i++) {
      buf[i] = 0;
    }

    return buf;
  }
}

function sliceArray(array, start, end) {
  if (typeof array.buffer !== undefined) {
    if (Uint8Array.prototype.slice) {
      return array.slice(start, end);
    } else {
      // Uint8Array#slice polyfill.
      let len = array.length;

      // Calculate start.
      start = start | 0;
      start = (start < 0) ? Math.max(len + start, 0) : Math.min(start, len);

      // Calculate end.
      end = (end === undefined) ? len : end | 0;
      end = (end < 0) ? Math.max(len + end, 0) : Math.min(end, len);

      // Copy into new array.
      let arraySlice = new Uint8Array(end - start);
      for (let i = start, n = 0; i < end;) {
        arraySlice[n++] = array[i++];
      }

      return arraySlice;
    }
  } else {
    // Assume normal array.
    return array.slice(start, end);
  }
}

// Implementation
// --

let exports = {};
// Calculates an upper bound for lz4 compression.
exports.compressBound = function compressBound(n) {
  return (n + (n / 255) + 16) | 0;
};

// Calculates an upper bound for lz4 decompression, by reading the data.
exports.decompressBound = function decompressBound(src) {
  let sIndex = 0;

  // Read magic number
  if (util.readU32(src, sIndex) !== magicNum) {
    throw new Error('invalid magic number');
  }

  sIndex += 4;

  // Read descriptor
  let descriptor = src[sIndex++];

  // Check version
  if ((descriptor & fdVersionMask) !== fdVersion) {
    throw new Error('incompatible descriptor version ' + (descriptor & fdVersionMask));
  }

  // Read flags
  let useBlockSum = (descriptor & fdBlockChksum) !== 0;
  let useContentSize = (descriptor & fdContentSize) !== 0;

  // Read block size
  let bsIdx = (src[sIndex++] >> bsShift) & bsMask;

  if (bsMap[bsIdx] === undefined) {
    throw new Error('invalid block size ' + bsIdx);
  }

  let maxBlockSize = bsMap[bsIdx];

  // Get content size
  if (useContentSize) {
    return util.readU64(src, sIndex);
  }

  // Checksum
  sIndex++;

  // Read blocks.
  let maxSize = 0;
  while (true) {
    let blockSize = util.readU32(src, sIndex);
    sIndex += 4;

    if (blockSize & bsUncompressed) {
      blockSize &= ~bsUncompressed;
      maxSize += blockSize;
    } else if (blockSize > 0) {
      maxSize += maxBlockSize;
    }

    if (blockSize === 0) {
      return maxSize;
    }

    if (useBlockSum) {
      sIndex += 4;
    }

    sIndex += blockSize;
  }
};

// Creates a buffer of a given byte-size, falling back to plain arrays.
//exports.makeBuffer = makeBuffer;

// Decompresses a block of Lz4.
exports.decompressBlock = function decompressBlock(src, dst, sIndex, sLength, dIndex) {
  let mLength, mOffset, sEnd, n, i;
  let hasCopyWithin = dst.copyWithin !== undefined && dst.fill !== undefined;

  // Setup initial state.
  sEnd = sIndex + sLength;

  // Consume entire input block.
  while (sIndex < sEnd) {
    let token = src[sIndex++];

    // Copy literals.
    let literalCount = (token >> 4);
    if (literalCount > 0) {
      // Parse length.
      if (literalCount === 0xf) {
        while (true) {
          literalCount += src[sIndex];
          if (src[sIndex++] !== 0xff) {
            break;
          }
        }
      }

      // Copy literals
      for (n = sIndex + literalCount; sIndex < n;) {
        dst[dIndex++] = src[sIndex++];
      }
    }

    if (sIndex >= sEnd) {
      break;
    }

    // Copy match.
    mLength = (token & 0xf);

    // Parse offset.
    mOffset = src[sIndex++] | (src[sIndex++] << 8);

    // Parse length.
    if (mLength === 0xf) {
      while (true) {
        mLength += src[sIndex];
        if (src[sIndex++] !== 0xff) {
          break;
        }
      }
    }

    mLength += minMatch;

    // Copy match
    // prefer to use typedarray.copyWithin for larger matches
    // NOTE: copyWithin doesn't work as required by LZ4 for overlapping sequences
    // e.g. mOffset=1, mLength=30 (repeach char 30 times)
    // we special case the repeat char w/ array.fill
    if (hasCopyWithin && mOffset === 1) {
      dst.fill(dst[dIndex - 1] | 0, dIndex, dIndex + mLength);
      dIndex += mLength;
    } else if (hasCopyWithin && mOffset > mLength && mLength > 31) {
      dst.copyWithin(dIndex, dIndex - mOffset, dIndex - mOffset + mLength);
      dIndex += mLength;
    } else {
      for (i = dIndex - mOffset, n = i + mLength; i < n;) {
        dst[dIndex++] = dst[i++] | 0;
      }
    }
  }

  return dIndex;
};

// Compresses a block with Lz4.
exports.compressBlock = function compressBlock(src, dst, sIndex, sLength, hashTable) {
  let mIndex, mAnchor, mLength, mOffset, mStep;
  let literalCount, dIndex, sEnd, n;

  // Setup initial state.
  dIndex = 0;
  sEnd = sLength + sIndex;
  mAnchor = sIndex;

  // Process only if block is large enough.
  if (sLength >= minLength) {
    let searchMatchCount = (1 << skipTrigger) + 3;

    // Consume until last n literals (Lz4 spec limitation.)
    while (sIndex + minMatch < sEnd - searchLimit) {
      let seq = util.readU32(src, sIndex);
      let hash = util.hashU32(seq) >>> 0;

      // Crush hash to 16 bits.
      hash = ((hash >> 16) ^ hash) >>> 0 & 0xffff;

      // Look for a match in the hashtable. NOTE: remove one; see below.
      mIndex = hashTable[hash] - 1;

      // Put pos in hash table. NOTE: add one so that zero = invalid.
      hashTable[hash] = sIndex + 1;

      // Determine if there is a match (within range.)
      if (mIndex < 0 || ((sIndex - mIndex) >>> 16) > 0 || util.readU32(src, mIndex) !== seq) {
        mStep = searchMatchCount++ >> skipTrigger;
        sIndex += mStep;
        continue;
      }

      searchMatchCount = (1 << skipTrigger) + 3;

      // Calculate literal count and offset.
      literalCount = sIndex - mAnchor;
      mOffset = sIndex - mIndex;

      // We've already matched one word, so get that out of the way.
      sIndex += minMatch;
      mIndex += minMatch;

      // Determine match length.
      // N.B.: mLength does not include minMatch, Lz4 adds it back
      // in decoding.
      mLength = sIndex;
      while (sIndex < sEnd - searchLimit && src[sIndex] === src[mIndex]) {
        sIndex++;
        mIndex++;
      }
      mLength = sIndex - mLength;

      // Write token + literal count.
      let token = mLength < mlMask ? mLength : mlMask;
      if (literalCount >= runMask) {
        dst[dIndex++] = (runMask << mlBits) + token;
        for (n = literalCount - runMask; n >= 0xff; n -= 0xff) {
          dst[dIndex++] = 0xff;
        }
        dst[dIndex++] = n;
      } else {
        dst[dIndex++] = (literalCount << mlBits) + token;
      }

      // Write literals.
      for (let i = 0; i < literalCount; i++) {
        dst[dIndex++] = src[mAnchor + i];
      }

      // Write offset.
      dst[dIndex++] = mOffset;
      dst[dIndex++] = (mOffset >> 8);

      // Write match length.
      if (mLength >= mlMask) {
        for (n = mLength - mlMask; n >= 0xff; n -= 0xff) {
          dst[dIndex++] = 0xff;
        }
        dst[dIndex++] = n;
      }

      // Move the anchor.
      mAnchor = sIndex;
    }
  }

  // Nothing was encoded.
  if (mAnchor === 0) {
    return 0;
  }

  // Write remaining literals.
  // Write literal token+count.
  literalCount = sEnd - mAnchor;
  if (literalCount >= runMask) {
    dst[dIndex++] = (runMask << mlBits);
    for (n = literalCount - runMask; n >= 0xff; n -= 0xff) {
      dst[dIndex++] = 0xff;
    }
    dst[dIndex++] = n;
  } else {
    dst[dIndex++] = (literalCount << mlBits);
  }

  // Write literals.
  sIndex = mAnchor;
  while (sIndex < sEnd) {
    dst[dIndex++] = src[sIndex++];
  }

  return dIndex;
};

// Decompresses a frame of Lz4 data.
exports.decompressFrame = function decompressFrame(src, dst) {
  let useBlockSum, useContentSum, useContentSize, descriptor;
  let sIndex = 0;
  let dIndex = 0;

  // Read magic number
  if (util.readU32(src, sIndex) !== magicNum) {
    throw new Error('invalid magic number');
  }

  sIndex += 4;

  // Read descriptor
  descriptor = src[sIndex++];

  // Check version
  if ((descriptor & fdVersionMask) !== fdVersion) {
    throw new Error('incompatible descriptor version');
  }

  // Read flags
  useBlockSum = (descriptor & fdBlockChksum) !== 0;
  useContentSum = (descriptor & fdContentChksum) !== 0;
  useContentSize = (descriptor & fdContentSize) !== 0;

  // Read block size
  let bsIdx = (src[sIndex++] >> bsShift) & bsMask;

  if (bsMap[bsIdx] === undefined) {
    throw new Error('invalid block size');
  }

  if (useContentSize) {
    // TODO: read content size
    sIndex += 8;
  }

  sIndex++;

  // Read blocks.
  while (true) {
    let compSize;

    compSize = util.readU32(src, sIndex);
    sIndex += 4;

    if (compSize === 0) {
      break;
    }

    if (useBlockSum) {
      // TODO: read block checksum
      sIndex += 4;
    }

    // Check if block is compressed
    if ((compSize & bsUncompressed) !== 0) {
      // Mask off the 'uncompressed' bit
      compSize &= ~bsUncompressed;

      // Copy uncompressed data into destination buffer.
      for (let j = 0; j < compSize; j++) {
        dst[dIndex++] = src[sIndex++];
      }
    } else {
      // Decompress into blockBuf
      dIndex = exports.decompressBlock(src, dst, sIndex, compSize, dIndex);
      sIndex += compSize;
    }
  }

  if (useContentSum) {
    // TODO: read content checksum
    sIndex += 4;
  }

  return dIndex;
};

// Compresses data to an Lz4 frame.
exports.compressFrame = function compressFrame(src, dst) {
  let dIndex = 0;

  // Write magic number.
  util.writeU32(dst, dIndex, magicNum);
  dIndex += 4;

  // Descriptor flags.
  dst[dIndex++] = fdVersion;
  dst[dIndex++] = bsDefault << bsShift;

  // Descriptor checksum.
  dst[dIndex] = xxhash.hash(0, dst, 4, dIndex - 4) >> 8;
  dIndex++;

  // Write blocks.
  let maxBlockSize = bsMap[bsDefault];
  let remaining = src.length;
  let sIndex = 0;

  // Clear the hashtable.
  clearHashTable(hashTable);

  // Split input into blocks and write.
  while (remaining > 0) {
    let compSize = 0;
    let blockSize = remaining > maxBlockSize ? maxBlockSize : remaining;

    compSize = exports.compressBlock(src, blockBuf, sIndex, blockSize, hashTable);

    if (compSize > blockSize || compSize === 0) {
      // Output uncompressed.
      util.writeU32(dst, dIndex, 0x80000000 | blockSize);
      dIndex += 4;

      for (let z = sIndex + blockSize; sIndex < z;) {
        dst[dIndex++] = src[sIndex++];
      }

      remaining -= blockSize;
    } else {
      // Output compressed.
      util.writeU32(dst, dIndex, compSize);
      dIndex += 4;

      for (let j = 0; j < compSize;) {
        dst[dIndex++] = blockBuf[j++];
      }

      sIndex += blockSize;
      remaining -= blockSize;
    }
  }

  // Write blank end block.
  util.writeU32(dst, dIndex, 0);
  dIndex += 4;

  return dIndex;
};

// Decompresses a buffer containing an Lz4 frame. maxSize is optional; if not
// provided, a maximum size will be determined by examining the data. The
// buffer returned will always be perfectly-sized.
exports.decompress = function decompress(src, maxSize) {
  let dst, size;

  if (maxSize === undefined) {
    maxSize = exports.decompressBound(src);
  }
  dst = exports.makeBuffer(maxSize);
  size = exports.decompressFrame(src, dst);

  if (size !== maxSize) {
    dst = sliceArray(dst, 0, size);
  }

  return dst;
};

// Compresses a buffer to an Lz4 frame. maxSize is optional; if not provided,
// a buffer will be created based on the theoretical worst output size for a
// given input size. The buffer returned will always be perfectly-sized.
exports.compress = function compress(src, maxSize) {
  let dst, size;
  if (maxSize === undefined) {
    maxSize = exports.compressBound(src.length); //src.length
  }

  dst = makeBuffer(maxSize);
  size = exports.compressFrame(src, dst);

  if (size !== maxSize) {
    dst = sliceArray(dst, 0, size);
  }

  return dst;
};

const rechk = /^([<>])?(([1-9]\d*)?([xcbB?hHiIfdsp]))*$/
const refmt = /([1-9]\d*)?([xcbB?hHiIfdsp])/g
const str = (v, o, c) => String.fromCharCode(
  ...new Uint8Array(v.buffer, v.byteOffset + o, c))
const rts = (v, o, c, s) => new Uint8Array(v.buffer, v.byteOffset + o, c)
  .set(s.split('').map(str => str.charCodeAt(0)))
const pst = (v, o, c) => str(v, o + 1, Math.min(v.getUint8(o), c - 1))
const tsp = (v, o, c, s) => {
  v.setUint8(o, s.length);
  rts(v, o + 1, c - 1, s)
}
const lut = le => ({
  x: c => [1, c, 0],
  c: c => [c, 1, o => ({
    u: v => str(v, o, 1),
    p: (v, c) => rts(v, o, 1, c)
  })],
  '?': c => [c, 1, o => ({
    u: v => Boolean(v.getUint8(o)),
    p: (v, B) => v.setUint8(o, B)
  })],
  b: c => [c, 1, o => ({
    u: v => v.getInt8(o),
    p: (v, b) => v.setInt8(o, b)
  })],
  B: c => [c, 1, o => ({
    u: v => v.getUint8(o),
    p: (v, B) => v.setUint8(o, B)
  })],
  h: c => [c, 2, o => ({
    u: v => v.getInt16(o, le),
    p: (v, h) => v.setInt16(o, h, le)
  })],
  H: c => [c, 2, o => ({
    u: v => v.getUint16(o, le),
    p: (v, H) => v.setUint16(o, H, le)
  })],
  i: c => [c, 4, o => ({
    u: v => v.getInt32(o, le),
    p: (v, i) => v.setInt32(o, i, le)
  })],
  I: c => [c, 4, o => ({
    u: v => v.getUint32(o, le),
    p: (v, I) => v.setUint32(o, I, le)
  })],
  f: c => [c, 4, o => ({
    u: v => v.getFloat32(o, le),
    p: (v, f) => v.setFloat32(o, f, le)
  })],
  d: c => [c, 8, o => ({
    u: v => v.getFloat64(o, le),
    p: (v, d) => v.setFloat64(o, d, le)
  })],
  s: c => [1, c, o => ({
    u: v => str(v, o, c),
    p: (v, s) => rts(v, o, c, s.slice(0, c))
  })],
  p: c => [1, c, o => ({
    u: v => pst(v, o, c),
    p: (v, s) => tsp(v, o, c, s.slice(0, c - 1))
  })]
})
const errbuf = new RangeError("Structure larger than remaining buffer")
const errval = new RangeError("Not enough values for structure")
const struct = format => {
  let fns = [],
    size = 0,
    m = rechk.exec(format)
  if (!m) {
    throw new RangeError("Invalid format string")
  }
  const t = lut('<' === m[1]),
    lu = (n, c) => t[c](n ? parseInt(n, 10) : 1)
  while ((m = refmt.exec(format))) {
    ((r, s, f) => {
      for (let i = 0; i < r; ++i, size += s) {
        if (f) {
          fns.push(f(size))
        }
      }
    })(...lu(...m.slice(1)))
  }
  const unpack_from = (arrb, offs) => {
    if (arrb.byteLength < (offs | 0) + size) {
      throw errbuf
    }
    let v = new DataView(arrb, offs | 0)
    return fns.map(f => f.u(v))
  }
  const pack_into = (arrb, offs, ...values) => {
    if (values.length < fns.length) {
      throw errval
    }
    if (arrb.byteLength < offs + size) {
      throw errbuf
    }
    const v = new DataView(arrb, offs)
    new Uint8Array(arrb, offs, size).fill(0)
    fns.forEach((f, i) => f.p(v, values[i]))
  }
  const pack = (...values) => {
    let b = new ArrayBuffer(size)
    pack_into(b, 0, ...values)
    return b
  }
  const unpack = arrb => unpack_from(arrb, 0)

  function* iter_unpack(arrb) {
    for (let offs = 0; offs + size <= arrb.byteLength; offs += size) {
      yield unpack_from(arrb, offs);
    }
  }
  return Object.freeze({
    unpack,
    pack,
    unpack_from,
    pack_into,
    iter_unpack,
    format,
    size
  })
}

function USDZExporter() {
  this.exportScene = function(threeScene, options) {
    let usdScene = new Scene();
    if (options.scale !== undefined) {
      usdScene.scale = options.scale;
    }
    if (options.rotation !== undefined) {
      usdScene.rotation = options.rotation;
    }
    usdScene.loadContext(threeScene)
    usdScene.exportBakedTextures();
    
    let usdData = usdScene.exportUsd();
    let crate = new Crate(usdScene.textureFilePaths);
    return crate.writeUsd(usdData);
  }
}

/////////////////////////SCENE//////////////////////////////////

function Scene() {
  this.context = null
  this.objects = []
  this.objMap = {}
  this.meshObjs = {}
  this.collections = {}
  this.usdCollections = {}
  this.exportMaterials = true;
  this.materials = {}
  this.exportPath = ''
  this.bakeAO = false
  this.bakeTextures = true;
  this.textureFilePaths = []
  this.bakeSamples = 8
  this.bakeSize = 1024
  this.sharedMeshes = true
  this.scale = 1
  this.rotation = [0, 0, 0]
  this.animated = false
  this.startFrame = 0
  this.endFrame = 0
  this.curFrame = 0
  this.fps = 30
  this.customLayerData = {
    'creator': 'VisCirle USDZ Xporter'
  }
  this.collection = null

  this.exportUsd = function() {
    let data = new UsdData();

    data.setItem("upAxis", "Y");
    data.setItem("customLayerData", this.customLayerData);

    if (this.exportMaterials)
      this.exportSharedMaterials(data);

    //TODO: Export Collections? Maybe to fix highest hierarchy level :-)    
    this.exportSharedMeshes(data);

    for (let i = 0; i < this.objects.length; i++) {
      this.objects[i].exportUsd(data);
    }

    return data;
  }

  this.exportSharedMeshes = function(data) {}

  this.exportSharedMaterials = function(data) {
    if (Object.entries(this.materials).length > 0) {
      let looks = data.createChild('Looks', ClassType.Scope);
      for (const [key, mat] of Object.entries(this.materials)) {
        mat.exportUsd(looks);
      }
    }
  }

  this.loadContext = function(context) {
    this.context = context;
    this.renderEngine = "Three"
    //getSceneScale!
    //load Objs
    this.loadObjects();
  }

  this.exportBakedTextures = function() {
    for (const [key, value] of Object.entries(this.objMap)) {
      if (value.type == "Mesh") {
        value.bakeTextures();
      }
    }
  }

  this.loadObjects = function() {
    let count = 0;

    this.context.traverseVisible((obj) => {
      count++;

      if (obj.name == "")
        obj.name = "" + obj.uuid.replace(/[^a-zA-Z]+/g, '');
      
      if (obj.name[0] >= '0' && obj.name[0] <= '9')
        obj.name = "Obj" + obj.name

      if (obj.type === 'Mesh') {
        if (obj.geometry.name == "")
          obj.geometry.name = "GeometryOf" + obj.uuid.replace(/[^a-zA-Z]+/g, '');
        this.addThreeObject(obj, obj.type)
      } else if (obj.type === 'Group' || obj.type === 'Object3D') {
        this.addThreeCollection(obj)
        //this.addThreeObject(obj.type)
      }

    });
  }

  this.addThreeObject = function(object, type) {
    let obj = new USDObject(object, this);

    if (this.objMap[obj.name] != undefined) {
      obj = this.objMap[obj.name];
    } else if (obj.hasParent()) {
      obj.parent = this.addThreeObject(object.parent)
      obj.parent.children.push(obj);
      this.objMap[obj.name] = obj;
    } else {
      this.objects.push(obj);
      this.objMap[obj.name] = obj;
    }

    if (type == "Mesh")
      obj.setAsMesh();
    
    return obj;
  }

  this.addThreeCollection = function(collection) {
    let name = collection.name.replace(/[^a-zA-Z]+/g, '');
    let obj = new USDObject(collection, this);

    obj.collection = name;

    if (this.objMap[obj.name] != undefined) {
      obj = this.objMap[obj.name];
    } else if (obj.hasParent()) {
      obj.parent = this.addThreeObject(collection.parent) //!!!!WHAT IF PARENT IS ALSO COLLECTION? mh
      obj.parent.children.push(obj);
      this.objMap[obj.name] = obj;
    } else {
      this.objects.push(obj);
      this.objMap[obj.name] = obj;
    }

    if (this.collections[obj.name] == undefined) {
      let children = obj.children;
      let objs = [];
      for (let i = 0; i < children.length; i++) {
        let type = children[i].type;
        let childObj = new USDObject(children[i], this)
        if (this.objMap[childObj.name] != undefined)
          childObj = this.objMap[childObj.name];
        else
          this.objMap[childObj.name] = childObj;
        objs.push(childObj)
        if (type == "Mesh")
          childObj.setAsMesh();
      }
      this.collections[name] = objs;
    }

  }

}

function USDMesh(object, scene) {
  this.createCopies = function() {
    //DEBUG SPEED
    let SPEEDDEBUG = true;
    if (!SPEEDDEBUG)
      this.objectCopy = this.object.clone();
    else
      this.objectCopy = this.object;
    if (this.objectCopy.geometry.isGeometry) {
      let name = this.objectCopy.geometry.name;
      this.objectCopy.geometry = new THREE.BufferGeometry().fromGeometry(this.objectCopy.geometry)
      this.objectCopy.geometry.name = name;
    }
  }

  this.name = object.name.replace(/[^a-zA-Z0-9]+/g, ''); //.replace('.', '_')
  this.object = object
  this.scene = scene
  this.objectCopy = null
  this.armatueCopy = null
  this.shared = false
  this.usdMesh = null
  this.createCopies();

  this.exportToObject = function(usdObj, classType = ClassType.Mesh) {
    let mesh = this.objectCopy.geometry;
    let name = this.objectCopy.geometry.name;
    let usdMesh = usdObj.createChild(name, classType)

    usdMesh.setItem("extent", exportThreeExtents(this.objectCopy)); // Bounding Box
    usdMesh.setItem("faceVertexCounts", exportThreeMeshVertexCounts(mesh));
    
    let points = exportThreeMeshVertices(mesh);
    let indices = exportThreeMeshIndices(mesh);
    usdMesh.setItem("faceVertexIndices", indices);
    usdMesh.setItem("points", points);
    usdMesh.getItem("points").valueTypeStr = "point3f";

    //DEBUG DEBUG this should be activated with UV's!! MAYBE PROBLWMS WITH INDICES? 
    if (this.objectCopy.geometry.attributes.uv != undefined)
      this.exportMeshUvs(usdMesh);
    // DEBUG FOR ALL OTHER NOT WORKING STUFF...
    let normals = exportThreeMeshNormals(mesh)
    let normalIndices = exportThreeMeshNormalIndices(mesh)
    usdMesh.setItem("primlets:normals", normals);
    usdMesh.getItem("primlets:normals").valueTypeStr = "normal3f";
    usdMesh.getItem("primlets:normals").setItem("interpolation", "faceletying");

    //DEBUG NO INDICES MAYBE NO PROBLEM? :D 'CAUSE FALLBACK TO POLY INDICES?
    usdMesh.setItem("primlets:normals:indices", indices);
    //DEBUG NEEDED TO DISABLE ALSO FOLLOWING 2 LINES 
    usdMesh.setItem("subdivisionScheme", "none");
    usdMesh.getItem("subdivisionScheme").addQualifier('uniform');
    return usdMesh;
  }

  this.exportMeshUvs = function(usdMesh) {
    let mesh = this.objectCopy.geometry;
    //indices, uvs = exportBpyMeshUvs(mesh, layer)
    let indices = [];
    let uvs = [];
    uvs = exportThreeMeshUVs(mesh);
    //for(let i=0;i<uvs.length/2;i++)
    //  indices.push(i);
    indices = [];
    indices = exportThreeMeshIndices(mesh);
    let name = "UVMap"; //layer.name.replace('.', '_')

    usdMesh.setItem('primlets:' + name, uvs);
    usdMesh.getItem('primlets:' + name).valueTypeStr = 'texCoord2f';
    //usdMesh.getItem('primlets:'+name).setItem("valueTypeStr", 'texCoord2f');
    //usdMesh.getItem('primlets:'+name).interpolation='faceletying';
    usdMesh.getItem('primlets:' + name).setItem("interpolation", 'faceletying')

    usdMesh.setItem('primlets:' + name + ':indices', indices);

    ///TODOOO!!!!!!!!!
    /*
    let mesh=this.objectCopy.geometry;
    //using just 1 UV Layer...
    let uvs=
    let indices=
    let name="UVMap"
    */
  }
  /*
      def exportMeshUvs(self, usdMesh):
      mesh = self.objectCopy.data
      for layer in mesh.uv_layers:
          indices, uvs = exportBpyMeshUvs(mesh, layer)
          name = layer.name.replace('.', '_')
          usdMesh['primlets:'+name] = uvs
          usdMesh['primlets:'+name].valueTypeStr = 'texCoord2f'
          usdMesh['primlets:'+name]['interpolation'] = 'faceletying'
          usdMesh['primlets:'+name+':indices'] = indices
          */

}

function ShaderInput(type, name, defaultVal) { //default as third arg???
  this.type = type
  this.name = name
  this.name = this.name.replace(/_/g, "");
  this.name = this.name.replace(/_/g, "");
  this.value = defaultVal
  this.image = null
  this.uvMap = null
  this.usdAtt = null

  this.exportShaderInput = function(material, usdShader) {

    if (this.usdAtt != undefined)
      usdShader.setItem("inputs:" + this.name, this.usdAtt)
    else {
      usdShader.setItem("inputs:" + this.name, this.value)

      if (usdShader.getItem("inputs:" + this.name).getValueType().name != this.type)
        usdShader.getItem("inputs:" + this.name).valueTypeStr = this.type;
    }
  }

  this.exportShader = function(material, usdMaterial) {

    if (this.image != undefined && this.uvMap != undefined) {
      let v = this.value;
      if (this.type == "float")
        defaultVal = new THREE.Vector4(v.x, v.y, v.z, 1.);
      else {
        defaultVal = new THREE.Vector4(v.x, v.y, v.z, 1.);
      }

      let usdShader = usdMaterial.createChild(this.name + "Map", ClassType.Shader)
      usdShader.setItem('info:id', "UsdUVTexture");
      usdShader.getItem('info:id').addQualifier("uniform");
      usdShader.setItem('inputs:fallback', defaultVal);
      usdShader.setItem('inputs:file', this.image);
      usdShader.getItem('inputs:file').valueType = ValueType.asset;

      let primUsdShader = usdMaterial.getChild("primlet_" + this.uvMap);

      if (primUsdShader != undefined) {
        usdShader.setItem('inputs:st', primUsdShader.getItem("outputs:result"))
      }

      //DEBUG ERRROR FOLLOWING DESTOY EVERYTHING               //return;
      usdShader.setItem("inputs:wrapS", "repeat");
      usdShader.setItem("inputs:wrapT", "repeat");

      /////////

      if (this.type == "float") {

        usdShader.setItem('outputs:r', ValueType.float);
        if (usdShader.getItem('outputs:r').valueType.name != this.type)
          usdShader.getItem('outputs:r').valueTypeStr = this.valueTypeStr
        this.usdAtt = usdShader.getItem('outputs:r');

      } else {

        usdShader.setItem('outputs:rgb') //, ValueType.vec3f          

        if (usdShader.getItem('outputs:rgb').valueTypeToString() != this.type)
          usdShader.getItem('outputs:rgb').valueTypeStr = this.type;
        this.usdAtt = usdShader.getItem('outputs:rgb')
      }

      /*
          default = (v, v, v, 1.0) if self.type == 'float' else v+(1.0,)
          usdShader = usdMaterial.createChild(self.name+'_map', ClassType.Shader)
          usdShader['info:id'] = 'UsdUVTexture'
          usdShader['info:id'].addQualifier('uniform')
          usdShader['inputs:fallback'] = default
          usdShader['inputs:file'] = self.image
          usdShader['inputs:file'].valueType = ValueType.asset
          primUsdShader = usdMaterial.getChild('primlet_'+self.uvMap)
          if primUsdShader != None:
              usdShader['inputs:st'] = primUsdShader['outputs:result']
          usdShader['inputs:wrapS'] = 'repeat'
          usdShader['inputs:wrapT'] = 'repeat'
          if self.type == 'float':
              usdShader['outputs:r'] = ValueType.float
              if usdShader['outputs:r'].valueType.name != self.type:
                  usdShader['outputs:r'].valueTypeStr = self.type
              self.usdAtt = usdShader['outputs:r']
          else:
              usdShader['outputs:rgb'] = ValueType.vec3f
              if usdShader['outputs:rgb'].valueType.name != self.type:
                  usdShader['outputs:rgb'].valueTypeStr = self.type
              self.usdAtt = usdShader['outputs:rgb']
              */
    }
  }

}

function Material(material) {

  this.createInputs = function() {

    let defDiffuseColor = this.material.color;
    let defRoughness = this.material.roughness
    let diffuse = this.material.color;
    let specular = 1 - this.material.metalness;
    let emissive = this.material.emissive //Vec3
    if (this.material.clearcoat) {
      var clearcoat = this.material.clearcoat;
      var clearcoatRoughness = this.material.clearcoatRoughness;
    } else {
      var clearcoat = 0;
      var clearcoatRoughness = 0;
    }
    let metallic = this.material.metalness
    let roughness = this.material.roughness
    let opacity = this.material.opacity
    let opacityThreshold = this.material.alphaTest
    opacityThreshold = 0;
    let ior = this.material.ior
    let useSpecular = 0 //0 if metallic > 0.0 else 1
    if (ior == undefined)
      ior = 0;

    /* 
        emissive.r=0;
        emissive.g=0;
        emissive.b=0;
      */

    this.inputs = {
      /*
       */
      'clearcoat': new ShaderInput('float', 'clearcoat', clearcoat),
      'clearcoatRoughness': new ShaderInput('float', 'clearcoatRoughness', clearcoatRoughness),
      'diffuseColor': new ShaderInput('color3f', 'diffuseColor', new THREE.Vector3(diffuse.r, diffuse.g, diffuse.b)),

      'displacement': new ShaderInput('float', 'displacement', 0),

      'emissiveColor': new ShaderInput('color3f', 'emissiveColor', new THREE.Vector3(emissive.r, emissive.g, emissive.b)),

      'ior': new ShaderInput('float', 'ior', ior),

      'metallic': new ShaderInput('float', 'metallic', metallic),

      'normal': new ShaderInput('normal3f', 'normal', new THREE.Vector3(0.0, 0.0, 1.0)),

      'occlusion': new ShaderInput('float', 'occlusion', 0.0),

      'opacity': new ShaderInput('float', 'opacity', opacity),

      'opacityThreshold': new ShaderInput('float', 'opacityThreshold', opacityThreshold),

      'roughness': new ShaderInput('float', 'roughness', roughness),

      //'specularColor':        new ShaderInput('color3f', 'specularColor', specular),

      //'useSpecularWorkflow':  new ShaderInput('int', 'useSpecularWorkflow', useSpecular)

    }

  }

  this.exportPbrShader = function(usdMaterial) {
    let usdShader = usdMaterial.createChild('pbr', ClassType.Shader);

    usdShader.setItem("info:id", "UsdPreviewSurface")

    for (const [key, value] of Object.entries(this.inputs))
      value.exportShaderInput(this, usdShader);

    usdShader.setItem('outputs:displacement', null, ValueType.token)
    usdShader.setItem('outputs:surface', null, ValueType.token)

    return usdShader
  }

  this.getUVMaps = function() {
    let uvMaps = [];
    for (const [key, value] of Object.entries(this.inputs)) {
      if (value.uvMap != null)
        uvMaps.push(value.uvMap);
    }
    return uvMaps;
  }

  this.exportPrimlet = function(usdMaterial) {

    let uvMaps = this.getUVMaps();
    for (let i = 0; i < uvMaps.length; i++) {
      let map = uvMaps[i];
      usdMaterial.setItem('inputs:frame:stPrimlet_' + map, map);
      let usdShader = usdMaterial.createChild('primlet_' + map, ClassType.Shader)
      usdShader.setItem('info:id', 'UsdPrimletReader_float2');

      usdShader.getItem('info:id').addQualifier('uniform')
      usdShader.setItem('inputs:fallback', new THREE.Vector2(0., 0.));
      usdShader.setItem("inputs:letname", usdMaterial.getItem('inputs:frame:stPrimlet_' + map));
      usdShader.setItem("outputs:result");
      usdShader.getItem("outputs:result").valueTypeStr = "float2"
    }

  }
  this.exportInputs = function(usdMaterial) {

    for (const [key, value] of Object.entries(this.inputs)) {
      value.exportShader(this, usdMaterial);
    }
  }

  this.setupBakeDiffuse = function(asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
    {
      this.inputs.diffuseColor.image = asset;
      this.inputs.diffuseColor.uvMap = object.bakeUVMap;
      return true;
    }
    return false;
  }

  this.setupBakeNormal = function(asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
    {
      this.inputs.normal.image = asset;
      this.inputs.normal.uvMap = object.bakeUVMap;
      return true;
    }
    return false;
  }

  this.setupBakeMetalness = function(asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
    {
      this.inputs.metallic.image = asset;
      this.inputs.metallic.uvMap = object.bakeUVMap;
      return true;
    }
    return false;
  }

  this.setupBakeRoughness = function(asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
    {
      this.inputs.roughness.image = asset;
      this.inputs.roughness.uvMap = object.bakeUVMap;
      return true;
    }
    return false;
  }

  this.setupBakeAo = function(asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
    {
      this.inputs.occlusion.image = asset;
      this.inputs.occlusion.uvMap = object.bakeUVMap;
      return true;
    }
    return false;
  }

  this.setupBakeAlpha = function(asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
    {
      this.inputs.opacity.image = asset;
      this.inputs.opacity.uvMap = object.bakeUVMap;
      return true;
    }
    return false;
  }

  this.setupBakeEmissive = function(asset, object) {

    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
    {
      this.inputs.emissiveColor.image = asset;
      this.inputs.emissiveColor.uvMap = object.bakeUVMap;
      return true;
    }
    return false;
  }

  this.exportUsd = function(parent) {
    this.usdMaterial = parent.createChild(this.name, ClassType.Material);

    this.exportPrimlet(this.usdMaterial);

    this.exportInputs(this.usdMaterial);

    let pbrShader = this.exportPbrShader(this.usdMaterial);

    this.usdMaterial.setItem("outputs:displacement", pbrShader.getItem("outputs:displacement"))
    this.usdMaterial.setItem("outputs:surface", pbrShader.getItem("outputs:surface"))

  }

  if (material.type != "MeshPhysicalMaterial") {
    //console.error("Only MeshPhysicalMaterial supported!!!")

  }

  this.material = material
  this.usdMaterial = null;
  this.name = material.name.replace(/[^a-zA-Z0-9]+/g, ''); //.replace('.', '_');

  this.outputnode = null //???????
  this.shaderNode = null //??????
  this.inputs = {};
  this.createInputs();

}

function USDObject(object, scene, type = 'EMPTY') {
  this.name = object.name.replace(/[^a-zA-Z0-9]+/g, ''); //.replace('.', '_')
  this.object = object
  this.scene = scene
  this.type = type
  this.mesh = null
  this.parent = null
  this.children = []
  this.materials = [];
  this.bakeUVMap = '';
  this.hidden = false
  this.collection = null

  this.hasParent = function() {
    return (this.object.parent.type != "Scene");
  }
  this.setAsMesh = function() {
    if (this.type != "Mesh" && this.object.type == "Mesh")
      this.type = "Mesh";

    this.createMaterials();
    this.createMesh();
  }

  this.createMaterials = function() {
    if (this.object.material.name == "")
      //this.object.material.name=this.object.material.type;
      this.object.material.name = this.object.uuid.replace(/[^a-zA-Z]+/g, ''); //.replace('-', '');

    this.materials = []

    //DEBUG T
    if (this.scene.exportMaterials || Object.keys(this.scene.materials).length < 999) { //8 is the last
      let material;
      this.object.material.name = this.object.material.uuid.replace(/[^a-zA-Z]+/g, '');
      if (this.scene.materials[this.object.material.name])
        material = this.scene.materials[this.object.material.name];
      else {
        material = new Material(this.object.material)
        this.scene.materials[this.object.material.name] = material;
      }
      this.materials.push(material);
    }
  }

  this.createMesh = function() {
    if (this.mesh == undefined) {
      /* ignore SHARED MESHES /INstances?
      if self.object.data.name in self.scene.meshObjs:
          self.mesh = self.scene.meshObjs[self.object.data.name].mesh
          self.mesh.shared = True
      else:
      */
      this.mesh = new USDMesh(this.object, this.scene);
      this.scene.meshObjs[this.name] = this;
    }
  }

  this.bakeToFile = function(type, file) {
    let texUrl;
    let image //New Parsing technology :D
    switch (type) {
      case "diff":
        texUrl = this.object.material.map.image.src;
        image = this.object.material.map.image;
        //image.name=file;
        this.materials[0].inputs.diffuseColor.image = file; //SET REFERENCE NAME IN MATERIAL
        break;
      case "norm":
        texUrl = this.object.material.normalMap.image.src;
        image = this.object.material.normalMap.image;
        image.scale = this.object.material.normalScale.x;
        //image.name=file;
        this.materials[0].inputs.normal.image = file; //SET REFERENCE NAME IN MATERIAL
        break;
      case "metal":
        texUrl = this.object.material.metalnessMap.image.src;
        image = this.object.material.metalnessMap.image;
        //image.name=file;
        this.materials[0].inputs.metallic.image = file; //SET REFERENCE NAME IN MATERIAL
        break;
      case "rough":
        texUrl = this.object.material.roughnessMap.image.src;
        image = this.object.material.roughnessMap.image;
        //image.name=file;
        this.materials[0].inputs.roughness.image = file; //SET REFERENCE NAME IN MATERIAL
        break;
      case "ao":
        texUrl = this.object.material.aoMap.image.src;
        image = this.object.material.aoMap.image;
        //image.name=file;
        this.materials[0].inputs.occlusion.image = file; //SET REFERENCE NAME IN MATERIAL
        break;
      case "alpha":
        //texUrl=this.object.material.alphaMap.image.src;
        //image=this.object.material.alphaMap.image;
        texUrl = this.object.material.map.image.src;
        image = this.object.material.map.image;
        //image.name=file;
        this.materials[0].inputs.opacity.image = file; //SET REFERENCE NAME IN MATERIAL

        /*
                            usdShader.setItem('outputs:rgba')//, ValueType.vec3f          

                            if(usdShader.getItem('outputs:rgba').valueTypeToString()!=this.type)
                                usdShader.getItem('outputs:rgba').valueTypeStr = this.type;
                            this.usdAtt = usdShader.getItem('outputs:rgba')
        */

        break;
      case "emissive":
        texUrl = this.object.material.emissiveMap.image.src;
        image = this.object.material.emissiveMap.image;
        //image.name=file;
        this.materials[0].inputs.emissiveColor.image = file; //SET REFERENCE NAME IN MATERIAL
        break;

      default:
        alert('Default case');
    }

    /*
    for(let i=0;i<this.scene.textureFilePaths.length;i++){
        if(this.scene.textureFilePaths[i].src==image.src){
            //if texture is allready referenced by other Mat, reference to this tex and return instead of adding again and again and again and again and again and again
            if(type=="diff")       
                for(let j=0;j<this.materials.length;j++){
                    this.materials[j].inputs.diffuseColor.image=this.scene.textureFilePaths[i].name;
                }
            else if(type=="norm")
                for(let j=0;j<this.materials.length;j++){
                    this.materials[j].inputs.normal.image=this.scene.textureFilePaths[i].name;
                }
          
            return;
        }
    }
    */

    //ADD NEW TEXTURE IF NOT ALLREADY IN ARRAY :-)
    let add = true;
    for (let i = 0; i < this.scene.textureFilePaths.length; i++)
      if (this.scene.textureFilePaths[i][1] === file)
        add = false;
    if (add)
      this.scene.textureFilePaths.push([image, file]);

    /*
    self.setupBakeImage(file)
    bpy.ops.object.bake(type=type, use_clear=True)
    self.bakeImage.save()
    self.scene.textureFilePaths.append(file)
    self.cleanupBakeImage()
    */
  }

  this.bakeDiffuseTexture = function() {
    if (this.materials[0] == undefined)
      return;
    let bake = false;
    let asset = this.object.material.map.uuid + "Diffuse.png"
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeDiffuse(asset, this);

    if (bake) {
      this.bakeToFile('diff', asset)
    }
  }

  this.bakeNormalTexture = function() {
    if (this.materials[0] == undefined)
      return;

    let bake = false;
    let asset = this.object.material.normalMap.uuid + "Normal.png"
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeNormal(asset, this);
    if (bake) {
      this.bakeToFile('norm', asset)
    }
  }

  this.bakeMetalnessTexture = function() {
    if (this.materials[0] == undefined)
      return;
    let bake = false;
    let asset = this.object.material.metalnessMap.uuid + "Metallic.png"
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeMetalness(asset, this);

    if (bake) {
      this.bakeToFile('metal', asset)
    }
  }

  this.bakeRoughnessTexture = function() {
    if (this.materials[0] == undefined)
      return;
    let bake = false;
    let asset = this.object.material.roughnessMap.uuid + "Roughness.png"
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeRoughness(asset, this);

    if (bake) {
      this.bakeToFile('rough', asset)
    }
  }

  this.bakeAoTexture = function() {
    if (this.materials[0] == undefined)
      return;
    let bake = false;
    let asset = this.object.material.aoMap.uuid + "AmbientOcclusion.png"
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeAo(asset, this);

    if (bake) {
      this.bakeToFile('ao', asset)
    }
  }

  this.bakeAlphaTexture = function() {
    if (this.materials[0] == undefined && this.materials[0].material != undefined)
      return;
    let bake = false;
    let asset = this.object.material.map.uuid + "Alpha.png"
    //let asset=this.object.material.map.uuid+"Diffuse.png"//Diffuse not Alpha, therefore no additional adding
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeAlpha(asset, this);

    if (bake) {
      this.bakeToFile('alpha', asset)
    }
  }

  this.bakeEmissiveTexture = function() {
    if (this.materials[0] == undefined)
      return;
    let bake = false;
    let asset = this.object.material.emissiveMap.uuid + "Emissive.png"
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeEmissive(asset, this);

    if (bake) {
      this.bakeToFile('emissive', asset)
    }
  }

  this.bakeTextures = function() {

    /*
    this.setupBakeOutputNodes()
    following Line is out of function setupBakeOutputNodes
    */
    this.bakeUVMap = "UVMap";
    //DEBUG M
    if (this.scene.bakeTextures) {
      if (this.object.material.map != null) {
        this.bakeDiffuseTexture()
        //if(this.object.material.alphaMap!=null)
        if (this.object.material.transparent)
          this.bakeAlphaTexture();
      }
      if (this.object.material.normalMap != null)
        this.bakeNormalTexture()
      if (this.object.material.metalnessMap != null)
        this.bakeMetalnessTexture();
      if (this.object.material.roughnessMap != null)
        this.bakeRoughnessTexture();
      if (this.object.material.aoMap != null)
        this.bakeAoTexture();
      if (this.object.material.emissiveMap)
        this.bakeEmissiveTexture();
      //emissive, alphaMap? 

      /*
      self.bakeEmissionTexture()
      self.bakeRoughnessTexture()
      self.bakeOpacityTexture()
      self.bakeMetallicTexture()
      */
    }
    if (this.scene.bakeAO) {
      self.bakeOcclusionTexture()
    }
    //self.cleanupBakeOutputNodes()

  }

  this.getTransform = function() {
    this.object.updateMatrix();

    // TODO: use actual matrix from the scene root node. will require more work though,
    // Three input scene has multiple stacked empty nodes under the root node.
    // The USDZ Exporter doesn't handle this currently.
    if (this.parent == undefined) {
      const scaleMatrix = new THREE.Matrix4().makeScale(this.scene.scale, this.scene.scale, this.scene.scale);
      const rotateMatrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
        this.scene.rotation[0],
        this.scene.rotation[1],
        this.scene.rotation[2]));
      return convertThreeMatrix(scaleMatrix.multiply(rotateMatrix));
    }

    return convertThreeMatrix(new THREE.Matrix4().compose(this.object.position, this.object.quaternion, this.object.scale));
  }

  this.exportUsd = function(parent) {
    let usdObj = {};

    // Export Ridgid Object / creating USDPRIM
    usdObj = parent.createChild(this.name, ClassType.Xform)
    usdObj.setItem("xformOp:transform", this.getTransform())
    usdObj.getItem("xformOp:transform").addQualifier('custom');
    usdObj.setItem("xformOpOrder", ["xformOp:transform"]);
    usdObj.getItem("xformOpOrder").addQualifier('uniform');
    if (this.type == "Mesh")
      this.exportMesh(usdObj);
    for (let i = 0; i < this.children.length; i++) {
      //HELP
      this.children[i].exportUsd(usdObj);
    }
    if ((this.collection != null) && (this.scene.usdCollections[this.collection.name] != undefined)) {
      usdObj.metadata['inherits'] = this.scene.usdCollections[this.collection.name]
      usdObj.metadata['instanceable'] = true
    }

  }
  this.exportMaterialSubsets = function(usdMesh) {
    if (this.materials.length == 1) {
      usdMesh.setItem('material:binding', this.materials[0].usdMaterial, ValueType.token)
      usdMesh.getItem("material:binding").addQualifier('uniform');
      //                self.writeUsdRelationship(attribute)!!!!!!!!!!!
    } else if (this.materials.length > 1)
      console.warn("exportMaterialSubsets: MultiMat not supported yet :p(not even by Three...")
  }

  this.exportMesh = function(usdObj) {
    if (this.mesh != undefined) {
      if (this.mesh.usdMesh != undefined) {
        let usdMesh = usdObj.createChild(this.mesh.name, ClassType.Mesh);
        usdMesh.setItem("inherits", this.mesh.usdMesh);
        usdMesh.setItem("instanceable", true);
      } else {
        let usdMesh = this.mesh.exportToObject(usdObj);

        this.exportMaterialSubsets(usdMesh);
      }
    }
  }
}

///////////////////////////////////////////////////////////

function UsdData() {

  this.metadata = {}
  this.children = []
  this.attributes = []
  this.pathIndex = 0
  this.pathJump = -1

  this.setItem = function(key, value) {

    this.metadata[key] = value;
  }

  this.toString = function() {
    return '#usda 1.0\n' + this.metadataToString() + "\n";
  }
  this.metadataToString = function() {
    let ret = '(\n';
    Object.entries(this.metadata).forEach(([key, value]) => {
      ret += `${key} = `;
      ret += JSON.stringify(value)
      ret += '\n'
    });
    ret += ')\n';
    return ret;
  }
  this.addChild = function(child) {
    child.parent = this;
    this.children.push(child);
    return child;

  }
  this.createChild = function(name, type) {
    return this.addChild(new UsdPrim(name, type))
  }

  //for Crating
  this.updatePathIndices = function() {
    let pathIndex = 1;
    for (let i = 0; i < this.children.length; i++) {
      pathIndex = this.children[i].updatePathIndices(1); //pathIndex
    }
  }

  this.getPathJump = function() {
    if (this.children.length > 0)
      this.pathJump = -1;
    else
      this.pathJump = -2;
    return this.pathJump
  }

}

function UsdPrim(name, type) {
  this.name = name
  this.specifierType = SpecifierType.Def
  this.classType = type
  this.metadata = {}
  this.attributes = []
  this.children = []
  this.parent = null
  this.pathIndex = -1
  this.pathJump = -1
  this.isUsdPrim = 1;

  this.setItem = function(key, item, type) {
    /*
        TODO: how to get the Type..
        like here:
            if type(item) is ValueType:
                self.createAttribute(key, type=item)
            else:
                self.createAttribute(key, item)
        need to get this for Example Matrix
        */

    //if(ValueType[typeof(item)]!=undefined){//TODO!!!! CHECK VALUETYPES(ENUM) OF JS!!
    //           this.createAttribute(key,type=item)
    //       }
    if (item == null)
      this.createAttribute(key, null, type)
    else {
      this.createAttribute(key, item)
    }
  }
  this.getItem = function(key) {
    for (let i = 0; i < this.attributes.length; i++) {
      if (this.attributes[i].name == key)
        return this.attributes[i];
    }
    return null;
    //return next((att for att in self.attributes if att.name == key), None)
  }

  this.createAttribute = function(name, value = null, type = ValueType.Invalid) {
    return this.addAttribute(new UsdAttribute(name, value, type));
  }
  this.addAttribute = function(attribute) {
    attribute.parent = this;
    this.attributes.push(attribute);
    return attribute;
  }

  this.addChild = function(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  this.createChild = function(name, type) {
    return this.addChild(new UsdPrim(name, type));
  }

  this.getChild = function(name) {
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].name === name) {
        return this.children[i];
      }
    }
    return null;
  }

  this.toString = function() {
    let ret = name;
    ret += "huihui"
    return ret;
  }

  //for Crating

  this.updatePathIndices = function(pathIndexx) {
    this.pathIndex = pathIndexx;
    pathIndexx += 1;
    for (let i = 0; i < this.children.length; i++)
      pathIndexx = this.children[i].updatePathIndices(pathIndexx);
    for (let i = 0; i < this.attributes.length; i++) {
      this.attributes[i].pathIndex = pathIndexx;
      pathIndexx += 1;
    }
    //this.pathIndex=0;
    return pathIndexx;
  }

  this.getPathJump = function() {
    if (this.parent == undefined || ((this.parent.children[this.parent.children.length - 1] === this) && this.parent.attributes.length == 0))
      this.pathJump = -1;
    else
      this.pathJump = this.countItems() + 1;
    return this.pathJump;
  }
  this.countItems = function() {
    let count = this.attributes.length + this.children.length;
    for (let i = 0; i < this.children.length; i++)
      count += this.children[i].countItems();
    return count;
  }

}

function UsdAttribute(name = '', value = null, type = ValueType.Invalid) {

  this.isRelationship = function() {
    if (this.value && this.value.isUsdPrim === 1)
      return true;
    return false;
  }
  this.getValueType = function() {

    if (this.isConnection()) {
      //return getValueType(this.value)
      return this.value.getValueType() //this line is the real //DEBUG
    } else if (this.isRelationship())
      return ValueType.Invalid
    return getValueType(this.value)
  }

  this.isConnection = function() {
    if (this.value && this.value.isUsdAttribue) {
      return true;
    }
    if (this.value && this.value.isUsdPrim) {
      return 0;
    }

    return false;
    /*
        if(typeof(this.value)==UsdAttribute) //HÄÄÄÄ
            return true;
        return false
        */
  }

  this.addQualifier = function(qualifier) {
    this.qualifiers.push(qualifier);
  }

  this.setItem = function(key, value) {
    this.metadata[key] = value;
  }

  this.valueTypeToString = function() {
    if (this.valueTypeStr != undefined) {

      let ret = this.valueTypeStr
      if (this.isArray())
        ret += "[]"
      return ret;
    }
    let ret = ValueType.getName(this.valueType);
    if (this.isArray())
      ret += "[]"
    return ret;

  }
  //CHeck for unproblematic export for last Prims if last Attribute is pathJump=-2 and if not => :) analyze if condidition
  this.getPathJump = function() {
    this.pathJump = 0;
    if (this.parent != undefined && (this.parent.attributes[this.parent.attributes.length - 1] === this)) {
      //DEBUG DEBUG DEBUG this line may indicates ERROR but LEADS to ERROR but is ORIGINALLY SO MAY KEEP!!!!
      this.pathJump = -2;
    }
    return this.pathJump
  }

  this.isArray = function() {

    return Array.isArray(this.value);

  }

  this.name = name
  this.value = value
  this.frames = []
  this.qualifiers = []
  this.metadata = {}
  this.valueType = type
  this.valueTypeStr = null
  this.parent = null
  this.pathIndex = -1
  this.pathJump = 0
  this.isUsdAttribue = 1;
  if (type == ValueType.Invalid)
    this.valueType = this.getValueType();
  //maybe do Debugging here for TypeShit
  if (this.isRelationship())
    this.valueTypeStr = 'rel'
}

function consoleHex(buff) {
  if (true) //DEBUG OFF
    return;
  const view = new DataView(buff);
  let out = "";
  for (let i = 0; i < view.byteLength; i++)
    if (view.getUint8(i) > 31 && (127 > view.getUint8(i)))
      out += String.fromCharCode(view.getUint8(i).toString())
  else
    out += "\\x" + view.getUint8(i).toString(16)
}

function Crate(file) {
  this.textureFilePaths = file;
  this.version = 6
  this.toc = []
  this.tokenMap = {}
  this.tokens = []
  this.strings = []
  this.fields = []
  this.reps = []
  this.repsMap = {}
  this.fsets = []
  this.paths = []
  this.specs = []
  this.specsMap = {}
  this.writenData = {}
  this.framesRef = -1
  this.usdc = "";
  this.buffer = new ArrayBuffer(2);
  this.lseek = 0;

  this.writeInt = function(num, sizeInBytes, byteOrder = true /*true=littleE*/ , signed = false) {

    if (signed)
      console.warn("WriteInt for signed Integers not implemented!!")
    let arr = new ArrayBuffer(sizeInBytes); // an Int32 takes 4 bytes
    let view = new DataView(arr);
    if (sizeInBytes * 8 == 64) {
      if (!signed) {
        view.setUint32(0, num, byteOrder);
        view.setUint32(4, 0, byteOrder);
      } else {
        view.setInt32(0, num, byteOrder);
        view.setInt32(4, 0, byteOrder);
      }
    } else if (sizeInBytes * 8 == 32)
      if (!signed)
        view.setUint32(0, num, byteOrder); // byteOffset = 0; litteEndian = true
      else
        view.setInt32(0, num, byteOrder); // byteOffset = 0; litteEndian = true
    else if (sizeInBytes * 8 == 16)
      if (!signed)
        view.setUint16(0, num, byteOrder); // byteOffset = 0; litteEndian = true
      else
        view.setInt16(0, num, byteOrder);
    else if (sizeInBytes * 8 == 8)
      if (!signed)
        view.setUint8(0, num, byteOrder);
      else
        view.setInt8(0, num, byteOrder);

    this.appendBuffer(arr);
    return arr;
  }

  this.writeInt32Compressed = function(data) {
    let compi = new lz4();
    let buffer = compi.encode(usdInt32Compress(data)); //DEBUG SPEED
    //buffer=compi.encode(usdInt32Compress([...data]));
    this.writeInt(buffer.byteLength, 8)
    this.appendBuffer(buffer)
  }

  this.write = function(str) {
    let buf = new ArrayBuffer(str.length); // 2 bytes for each char
    let bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    this.appendBuffer(buf)
    return buf;

  }

  //https://stackoverflow.com/questions/51452398/how-to-use-arraybuffers-with-dataviews-in-javascript
  this.writeUsd = function(usdData) {
    usdData.updatePathIndices();
    this.writeBootStrap();

    //Add Root Metadata
    let fset = []; //fieldSet
    for (const [name, value] of Object.entries(usdData.metadata)) {

      if (!isNaN(value))
        fset.push(this.addFieldDouble(name, value))
      else
        fset.push(this.addField(name, value))
    }
    if (usdData.children.length > 0) {
      let tokens = [];
      for (let i = 0; i < usdData.children.length; i++)
        tokens.push(usdData.children[i].name)
      fset.push(this.addFieldTokenVector('primChildren', tokens))
    }

    fset = this.addFieldSet(fset)

    usdData.pathIndex = this.addSpec(fset, SpecType.PseudoRoot)
    let nameToken = this.getTokenIndex('');
    let pathJump = usdData.getPathJump();

    this.addPath(usdData.pathIndex, nameToken, pathJump, false)

    for (let i = 0; i < usdData.children.length; i++) {
      this.writeUsdPrim(usdData.children[i]);
    }

    this.writeSections();
    this.writeTableOfContents();

    return this.generateZip();
  }
  this.writeSections = function() {
    this.writeTokensSection();
    this.writeStringsSection()
    this.writeFieldsSection()

    this.writeFieldSetsSection()

    this.writePathsSection()

    this.writeSpecsSection()

  }
  this.writeTokensSection = function() {

    //DEBUG:
    this.tokens[4] = "Blender USDZ Plugin"
    //NO: this.tokens[7]="Cube"

    let start = this.lseek;

    this.writeInt(this.tokens.length, 8)
    let buffer = "";
    for (let i = 0; i < this.tokens.length; i++)
      buffer += this.tokens[i] + "\0";

    let bufferLength = buffer.length;
    let buf = new ArrayBuffer(bufferLength); //+this.tokens.length // 2 bytes for each char
    let bufView = new Uint8Array(buf);
    for (let i = 0, strLen = buffer.length; i < strLen; i++) {
      bufView[i] = buffer.charCodeAt(i);
    }

    //buffer=buf;
    buffer = bufView;

    consoleHex(buf)

    this.writeInt(bufferLength, 8)

    let compi = new lz4();
    let compbuffer = compi.encode(buffer);

    consoleHex(compbuffer)

    this.writeInt(compbuffer.byteLength, 8)
    ////DEBUG
    //this.writeInt(65535, 4)
    this.appendBuffer(compbuffer)
    //this.writeInt(65535, 4)

    let size = this.lseek - start;
    this.toc.push(['TOKENS', start, size]);
  }
  this.writeStringsSection = function() {
    let start = this.lseek;
    this.writeInt(this.strings.length, 8)
    for (let i = 0; i < this.strings.length; i++) {
      this.writeInt(this.strings[i], 4)
    }
    let size = this.lseek - start;
    this.toc.push(['STRINGS', start, size]);

  }
  this.writeFieldsSection = function() {
    let start = this.lseek;
    this.writeInt(this.fields.length, 8)
    this.writeInt32Compressed(this.fields)

    let compi = new lz4();
    let buffer = compi.encode(encodeInts(this.reps, 8))
    this.writeInt(buffer.byteLength, 8)
    this.appendBuffer(buffer);
    let size = this.lseek - start;
    this.toc.push(['FIELDS', start, size]);

  }
  this.writeFieldSetsSection = function() {
    let start = this.lseek;
    this.writeInt(this.fsets.length, 8)
    this.writeInt32Compressed(this.fsets)
    let size = this.lseek - start;
    this.toc.push(['FIELDSETS', start, size]);
  }
  this.writePathsSection = function() {
    let start = this.lseek;
    let paths = [];
    let tokens = [];
    let jumps = [];
    for (let i = 0; i < this.paths.length; i++) {
      paths.push(this.paths[i][0])
      tokens.push(this.paths[i][1])
      jumps.push(this.paths[i][2])
    }
    this.writeInt(this.paths.length, 8)
    this.writeInt(this.paths.length, 8)
    this.writeInt32Compressed(paths)
    this.writeInt32Compressed(tokens)
    this.writeInt32Compressed(jumps)
    let size = this.lseek - start;
    this.toc.push(['PATHS', start, size]);

  }
  this.writeSpecsSection = function() {
    let start = this.lseek;
    let paths = []
    let fsets = []
    let types = []
    for (let i = 0; i < this.specs.length; i++) {
      paths.push(this.specs[i][0])
      fsets.push(this.specs[i][1])
      types.push(this.specs[i][2])
    }
    this.writeInt(this.specs.length, 8)
    this.writeInt32Compressed(paths)
    this.writeInt32Compressed(fsets)
    this.writeInt32Compressed(types)
    let size = this.lseek - start;
    this.toc.push(['SPECS', start, size]);
  }

  this.writeUsdPrim = function(usdPrim) {
    let fset = [];
    fset.push(this.addField('specifier', usdPrim.specifierType))
    if (usdPrim.classType != undefined) {
      fset.push(this.addField("typeName", ClassType.getName(usdPrim.classType)))
    }
    for (const [key, value] of Object.entries(usdPrim.metadata)) {
      console.error("primitive Metadata not supported yet");
    }

    if (usdPrim.attributes.length > 0) {
      let tokens = [];
      for (let i = 0; i < usdPrim.attributes.length; i++)
        tokens.push(usdPrim.attributes[i].name)
      fset.push(this.addFieldTokenVector('properties', tokens))
    }

    if (usdPrim.children.length > 0) {
      let tokens = [];
      for (let i = 0; i < usdPrim.children.length; i++)
        tokens.push(usdPrim.children[i].name)
      fset.push(this.addFieldTokenVector('primChildren', tokens))
    }

    fset = this.addFieldSet(fset);
    usdPrim.pathIndex = this.addSpec(fset, SpecType.Prim)
    let nameToken = this.getTokenIndex(usdPrim.name)
    let pathJump = usdPrim.getPathJump()
    // Add Prim Path
    this.addPath(usdPrim.pathIndex, nameToken, pathJump, false)
    // Write Prim Children
    //this.writeInt(65535,4)

    for (let i = 0; i < usdPrim.children.length; i++)
      this.writeUsdPrim(usdPrim.children[i]);

    // Write Prim Attributes

    for (let i = 0; i < usdPrim.attributes.length; i++) {
      if (usdPrim.attributes[i].isConnection())
        this.writeUsdConnection(usdPrim.attributes[i])
      else if (usdPrim.attributes[i].isRelationship())
        this.writeUsdRelationship(usdPrim.attributes[i])
      else
        this.writeUsdAttribute(usdPrim.attributes[i])
    }

    //this.writeUsdAttribute(usdPrim.attributes[0])
    /*
        if(usdPrim.attributes.length>5)
            for(let i=3;i<4;i++)
                this.writeUsdAttribute(usdPrim.attributes[i])
    */

  }

  this.writeUsdAttribute = function(usdAtt) {
    let fset = [];
    let type = usdAtt.valueTypeToString();
    fset.push(this.addField('typeName', type))
    for (let i = 0; i < usdAtt.qualifiers.length; i++) {
      if (usdAtt.qualifiers[i] == "uniform")
        fset.push(this.addField('letiability', true, ValueType.letiability))
      else if (usdAtt.qualifiers[i] == "custom")
        fset.push(this.addField('custom', true))
    }

    for (const [name, value] of Object.entries(usdAtt.metadata)) {
      fset.push(this.addField(name, value))
    }

    if (usdAtt.value != undefined) {
      fset.push(this.addField('default', usdAtt.value, usdAtt.valueType))
    }

    fset = this.addFieldSet(fset)

    usdAtt.pathIndex = this.addSpec(fset, SpecType.Attribute)
    let nameToken = this.getTokenIndex(usdAtt.name)
    let pathJump = usdAtt.getPathJump()
    this.addPath(usdAtt.pathIndex, nameToken, pathJump, true)

  }

  this.writeUsdConnection = function(usdAtt) {
    let fset = []
    let pathIndex = usdAtt.value.pathIndex
    fset.push(this.addField('typeName', usdAtt.valueTypeToString())) //LASTDEBUG
    /*
    for(let i=0;i<usdAtt.value.qualifiers.length;i++){
        if(usdAtt.value.qualifiers[i]=='uniform')
            fset.push(this.addField('letiability', true, ValueType.letiability))
        else if(usdAtt.value.qualifiers[i]=='custom')
            fset.push(this.addField('custom', true))
    }
    */
    //console.error(usdAtt.value.qualifiers.length)
    if (usdAtt.value.qualifiers)
      for (let i = 0; i < usdAtt.value.qualifiers.length; i++) {
        if (usdAtt.value.qualifiers[i] == 'uniform')
          fset.push(this.addField('letiability', true, ValueType.letiability))
        else if (usdAtt.value.qualifiers[i] == 'custom')
          fset.push(this.addField('custom', true))
      }
    fset.push(this.addFieldPathListOp('connectionPaths', pathIndex))
    fset.push(this.addFieldPathVector('connectionChildren', pathIndex))
    fset = this.addFieldSet(fset)

    usdAtt.pathIndex = this.addSpec(fset, SpecType.Attribute)
    let nameToken = this.getTokenIndex(usdAtt.name)
    let pathJump = usdAtt.getPathJump()
    this.addPath(usdAtt.pathIndex, nameToken, pathJump, true)

  }

  this.writeUsdRelationship = function(usdAtt) {
    let fset = []
    let pathIndex = usdAtt.value.pathIndex
    fset.push(this.addField('letiability', true, ValueType.letiability)) //LASTDEBUG
    fset.push(this.addFieldPathListOp('targetPaths', pathIndex)) //LASTDEBUG
    fset.push(this.addFieldPathVector('targetChildren', pathIndex)) //LASTDEBUG
    fset = this.addFieldSet(fset)
    usdAtt.pathIndex = this.addSpec(fset, SpecType.Relationship)
    let nameToken = this.getTokenIndex(usdAtt.name)
    let pathJump = usdAtt.getPathJump()
    this.addPath(usdAtt.pathIndex, nameToken, pathJump, true)
  }

  this.addSpec = function(fset, sType) {
    let path = this.specs.length;
    this.specs.push([path, fset, sType])
    this.specsMap[path] = [fset, sType]
    return path;

  }

  this.addFieldSet = function(fset) {
    let index = this.fsets.length;
    this.fsets = this.fsets.concat(fset);
    this.fsets.push(-1)
    return index;
  }

  this.addField = function(field, value, vType = ValueType.UnregisteredValue) {
    if (vType == ValueType.UnregisteredValue)
      vType = getValueType(value);

    if (vType == ValueType.token) {
      return this.addFieldToken(field, value)
    }
    if (vType == ValueType.asset)
      return this.addFieldAsset(field, value)
    if (vType == ValueType.TokenVector)
      return this.addFieldTokenVector(field, value)

    if (field == "specifier")
      return this.addFieldSpecifier(field, value)
    if (field == "letiability" || (vType == ValueType.letiability))
      return this.addFieldletiability(field, value) ///hotfix: field should be = ValueType.letiability
    if (vType == ValueType.int)
      return this.addFieldInt(field, value)

    if (vType == ValueType.float)
      return this.addFieldFloat(field, value)

    let vTypeName = Object.keys(ValueType).find(key => ValueType[key] === vType)
    if (vTypeName.substring(0, 3) == 'vec')
      return this.addFieldVector(field, value, vType)
    if (vTypeName.substring(0, 6) == 'matrix')
      return this.addFieldMatrix(field, value, vType)

    if (vType == ValueType.bool)
      return this.addFieldBool(field, value)
    if (vType == ValueType.Dictionary)
      return this.addFieldDictionary(field, value)
    //print('type: ', vType.name, value)
    //return null;
    console.error("Error: TypeOf FieldItem not found!")
    return this.addFieldItem(field, vType, false, true, false, value)

  }
  this.addFieldAsset = function(field, data) {

    field = this.getTokenIndex(field)
    let token = this.getTokenIndex(data.replace('@', ''))
    return this.addFieldItem(field, ValueType.asset, false, true, false, token)

  }

  this.addFieldFloat = function(field, data) {
    var field = this.getTokenIndex(field)
    if (Array.isArray(data)) {
      var ref = this.getDataRefrence(data, ValueType.float)
      if (ref < 0) {
        ref = this.lseek;
        this.addWritenData(data, ValueType.float, ref);
        this.writeInt(data.length, 8);
        for (let i = 0; i < data.length; i++)
          //this.writeFloat(data[i]);
          this.writeInt(data[i]);
      }
      return this.addFieldItem(field, ValueType.float, true, false, false, ref)
    }

    let packStr = '<f'
    let s = struct(packStr)
    data = s.pack(data);
    let dv = new DataView(data, 0);
    data = dv.getInt32(0, true)
    return this.addFieldItem(field, ValueType.float, false, true, false, data)

  }
  this.addFieldVector = function(field, data, vType) {
    var field = this.getTokenIndex(field)
    let vTypeName = Object.keys(ValueType).find(key => ValueType[key] === vType)
    let packStr = '<' + vTypeName.substring(3, 5);
    if (Array.isArray(data)) {
      var ref = this.getDataRefrence(data, vType)
      if (ref < 0) {
        ref = this.lseek;
        this.addWritenData(data, vType, ref);
        this.writeInt(data.length, 8);
        let s = struct(packStr)
        for (let i = 0; i < data.length; i++)
          this.appendBuffer(s.pack(data[i].x, data[i].y, data[i].z));
      }
      return this.addFieldItem(field, vType, true, false, false, ref)

    } else {

      ref = this.getDataRefrence(data, vType)
      if (ref < 0) {
        ref = this.lseek;
        this.addWritenData(data, vType, ref)

        let s = struct(packStr)

        if (data.isVector2)
          this.appendBuffer(s.pack(data.x, data.y));
        if (data.isVector3) {
          this.appendBuffer(s.pack(data.x, data.y, data.z));
        }
        if (data.isVector4)
          this.appendBuffer(s.pack(data.x, data.y, data.z, data.w));
      }

      return this.addFieldItem(field, vType, false, false, false, ref)
    }

  }
  this.getTokenIndex = function(token) {
    if (this.tokenMap[token] == undefined) {
      this.tokenMap[token] = this.tokens.length;
      this.tokens.push(token);
    }
    return this.tokenMap[token]
  }

  this.getStringIndex = function(str) {
    let tokenIndex = this.getTokenIndex(str)
    if (!this.strings.includes(tokenIndex))
      this.strings.push(tokenIndex)
    return this.strings.indexOf(tokenIndex)
  }

  this.addFieldInt = function(field, data) {
    var field = this.getTokenIndex(field);
    if (Array.isArray(data)) {
      let compress = (data.length >= 16);
      compress = false;
      var ref = this.getDataRefrence(data, ValueType.int)
      if (ref < 0) {
        var ref = this.lseek;
        this.addWritenData(data, ValueType.int, ref)
        this.writeInt(data.length, 8)
        if (compress) {
          this.writeInt32Compressed(data);
        } else {
          for (let i = 0; i < data.length; i++) {
            // TODO(fleroviux):
            this.writeInt(data[i], 4, true);
            // this.writeInt(data[i], 4, signed = true)
          }
        }
      }
      return this.addFieldItem(field, ValueType.int, true, false, compress, ref)
    }
    return this.addFieldItem(field, ValueType.int, false, true, false, data)
  }

  this.addFieldSpecifier = function(field, spec) {
    field = this.getTokenIndex(field)
    return this.addFieldItem(field, ValueType.Specifier, false, true, false, spec)

  }
  this.addFieldMatrix = function(field, data, vType) {
    field = this.getTokenIndex(field);
    var ref = this.getDataRefrence(data, vType)
    //ADDED ALWAYS TRUE DUE TO PROBLEMS IN HASHFunc: this.getDataRefrence(data, vType) with ARRAYS!! #DEBUG
    if (1 || ref < 0) {
      ////!!!!!!!!!!!!!!!!!!
      ref = this.lseek;
      this.addWritenData(data, vType, ref);
      let vTypeName = Object.keys(ValueType).find(key => ValueType[key] === vType)
      let packStr = '<' + vTypeName.substring(6, 8);

      if (Array.isArray(data)) {
        console.error("Mat4 Array not supported yet")
        this.writeInt(data.length, 8)
      } else {
        let s = struct(packStr)
        for (let i = 0; i < Math.sqrt(data.elements.length); i++) {
          let row = data.elements.slice(i * Math.sqrt(data.elements.length), i * Math.sqrt(data.elements.length) + Math.sqrt(data.elements.length));
          this.appendBuffer(s.pack(row[0], row[1], row[2], row[3]))
        }
      }
    }

    if (Array.isArray(data))
      return this.addFieldItem(field, vType, false, true, false, ref)
    return this.addFieldItem(field, vType, false, false, false, ref)
  }

  this.addFieldDictionary = function(field, data) {
    var field = this.getTokenIndex(field);
    var ref = this.lseek;
    this.writeInt(Object.keys(data).length, 8);
    for (const [key, value] of Object.entries(data)) {
      this.writeInt(this.getStringIndex(key), 4)
      this.writeInt(8, 8)
      this.writeInt(this.getStringIndex(value), 4)
      this.writeInt(1074397184, 4)
    }
    return this.addFieldItem(field, ValueType.Dictionary, false, false, false, ref)
  }

  this.addFieldletiability = function(field, data) {

    field = this.getTokenIndex(field);
    if (data)
      data = "1";
    else
      data = "0"

    return this.addFieldItem(field, ValueType.letiability, false, true, false, data)
  }
  this.addFieldBool = function(field, data) {
    var field = this.getTokenIndex(field);
    if (data)
      data = 1;
    else
      data = 0
    return this.addFieldItem(field, ValueType.bool, false, true, false, data)
  }
  this.addFieldToken = function(field, data) {

    var field = this.getTokenIndex(field);
    if (Array.isArray(data)) {

      let tokens = [];
      for (let i = 0; i < data.length; i++) {
        let token = data[i].replace('"', '');
        tokens.push(this.getTokenIndex(token))
      }
      var ref = this.getDataRefrence(tokens, ValueType.token)
      if (ref < 0) {
        ref = this.lseek;
        this.addWritenData(tokens, ValueType.token, ref);
        this.writeInt((tokens.length), 8)
        for (let i = 0; i < tokens.length; i++) {
          this.writeInt(tokens[i], 4)
        }
      }
      return this.addFieldItem(field, ValueType.token, true, false, false, ref)

    }

    let token = this.getTokenIndex(data.replace('"', ''))

    return this.addFieldItem(field, ValueType.token, false, true, false, token)
  }

  this.addFieldTokenVector = function(field, tokens) {
    field = this.getTokenIndex(field);
    let data = [];
    for (let i = 0; i < tokens.length; i++) {
      tokens[i] = tokens[i].replace('"', '')
      data.push(this.getTokenIndex(tokens[i]))
    }
    var ref = this.getDataRefrence(data, ValueType.TokenVector)
    if (ref < 0) {
      ref = this.lseek;
      this.addWritenData(data, ValueType.TokenVector, ref);
      this.writeInt(data.length, 8)
      for (let i = 0; i < data.length; i++) {
        this.writeInt(data[i], 4)
      }
      for (let i = 0; i < 4; i++) {
        this.write('\x00');
      }
    }
    return this.addFieldItem(field, ValueType.TokenVector, false, false, false, ref)
  }

  this.addFieldPathListOp = function(field, pathIndex) {
    field = this.getTokenIndex(field)
    var ref = this.lseek
    let op = 259
    this.writeInt(op, 8)
    this.write('\x00');
    this.writeInt(pathIndex, 4)
    return this.addFieldItem(field, ValueType.PathListOp, false, false, false, ref)
  }
  this.addFieldPathVector = function(field, pathIndex) {
    field = this.getTokenIndex(field)
    var ref = this.lseek
    this.writeInt(1, 8)
    this.writeInt(pathIndex, 4)
    return this.addFieldItem(field, ValueType.PathVector, false, false, false, ref)
  }

  this.addWritenData = function(data, vType, ref) {
    //key = [data, vType]
    let dataHash = JSON.stringify(data) + "" + vType
    let key = dataHash;
    this.writenData[key] = ref
  }

  this.getDataRefrence = function(data, vType) {
    //key = [data, vType]
    let dataHash = JSON.stringify(data) + "" + vType
    let key = dataHash;
    if (this.writenData[key] != undefined) {
      return this.writenData[key];
    }
    return -1
  }

  /*
  function AND(v1, v2) {
      //fuuuu js 
      let hi = 0x80000000;
      let low = 0x7fffffff;
      let hi1 = ~~(v1 / hi);
      let hi2 = ~~(v2 / hi);
      let low1 = v1 & low;
      let low2 = v2 & low;
      let h = hi1 & hi2;
      let l = low1 & low2;
      return h*hi + l;
  }


  function OR(v1, v2) {
      //fuuuu js 
      let hi = 0x80000000;
      let low = 0x7fffffff;
      let hi1 = ~~(v1 / hi);
      let hi2 = ~~(v2 / hi);
      let low1 = v1 & low;
      let low2 = v2 & low;
      let h = hi1 | hi2;
      let l = low1 | low2;
      return h*hi + l;
  }
  */

  // let ARRAY_BIT = BigInt(1) << BigInt(63)
  // let INLINE_BIT = BigInt(1) << BigInt(62)
  // let COMPRESSED_BIT = BigInt(1) << BigInt(61)
  // let PAYLOAD_MASK = (BigInt(1) << BigInt(48)) - BigInt(1)

  const ARRAY_BIT = JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(63));
  const INLINE_BIT = JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(62));
  const COMPRESSED_BIT = JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(61));
  const PAYLOAD_MASK = JSBI.subtract(JSBI.leftShift(JSBI.BigInt(1), JSBI.BigInt(48)), JSBI.BigInt(1));

  this.addFieldItem = function(field, vType, array, inline, compressed, payload = 0) {

    let repIndex = this.reps.length;

    // rep = (vType << 48) | (payload & PAYLOAD_MASK)
    let rep = JSBI.bitwiseOr(
      JSBI.leftShift(
        JSBI.BigInt(vType),
        JSBI.BigInt(48)),
      JSBI.bitwiseAnd(
        JSBI.BigInt(payload),
        PAYLOAD_MASK));

    if (array) {
      rep = JSBI.bitwiseOr(rep, ARRAY_BIT);
    }
    if (compressed) {
      rep = JSBI.bitwiseOr(rep, COMPRESSED_BIT);
    }
    if (inline) {
      rep = JSBI.bitwiseOr(rep, INLINE_BIT);
    }

    //key= [field,rep];//hacky way of tuple :-D
    let key = field + "  " + rep
    if (this.repsMap[key] != undefined)
      return this.repsMap[key];
    this.repsMap[key] = repIndex
    this.fields.push(field);
    this.reps.push(rep);

    return repIndex;
  }

  this.getImage = async function(url) {
    let code;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = 'blob';
    xhr.onload = await
    function(e) {
      code = xhr.response;
      return code;

    };
    xhr.onerror = function() {
      console.error("** An error occurred during the Texture requests");
    };
    xhr.send();

  }

  this.getIimage = async function(url) {
    let xhr = new XMLHttpRequest();
    return new Promise(function(resolve, reject) {
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status >= 300) {
            reject("Error, status code = " + xhr.status)
          } else {
            resolve(xhr.response);
          }
        }
      }
      xhr.open('GET', url, true)
      xhr.responseType = 'blob';
      xhr.send();
    });
  }

  this.redImgBlob = async function(image) {
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    //operation Red
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 1] = imageData.data[i]
      imageData.data[i + 2] = imageData.data[i]
    }
    ctx.putImageData(imageData, 0, 0);

    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        resolve(blob)
      });
    })
  }

  this.greenImgBlob = async function(image) {
    //image.width=512;
    //image.height=512;
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    //operation Green
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = imageData.data[i + 1]
      imageData.data[i + 2] = imageData.data[i + 1]
    }
    ctx.putImageData(imageData, 0, 0);

    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        resolve(blob)
      });
    })
  }

  this.blueImgBlob = async function(image) {
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    //operation Blue
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = imageData.data[i + 2]
      imageData.data[i + 1] = imageData.data[i + 2]
    }
    ctx.putImageData(imageData, 0, 0);

    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        resolve(blob)
      });
    })
  }

  this.normalImgBlob = async function(image) {
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    //operation NormalScale
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = ((imageData.data[i] - 128) * image.scale) + 128;
      imageData.data[i + 1] = ((imageData.data[i + 1] - 128) * image.scale) + 128;
    }
    ctx.putImageData(imageData, 0, 0);

    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        resolve(blob)
      });
    })
  }

  this.alphaImgBlob = async function(image) {
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    //operation NormalScale
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = imageData.data[i + 3];
      imageData.data[i + 1] = imageData.data[i + 3];
      imageData.data[i + 2] = imageData.data[i + 3];
    }
    ctx.putImageData(imageData, 0, 0);

    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        resolve(blob)
      });
    })
  }

  this.imgBlob = async function(image) {
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    return new Promise(function(resolve, reject) {
      canvas.toBlob(function(blob) {
        resolve(blob)
      });
    })
  }

  this.generateZip = async function() {
    // TODO: write uncompressed Zip container directly instead of relying on JSZip,
    // which is designed to be general purpose. This could hypothetically be faster.
    let zip = new JSZip();

    zip.file("untitled.usdc", this.buffer);

    for (let i = 0; i < this.textureFilePaths.length; i++) {
      let image = this.textureFilePaths[i][0]
      let name = this.textureFilePaths[i][1]
      let blob;
      if (name.substring(name.length - 6, name.length - 4) == "on") //RED CHANNEL ambient occ
        blob = await this.redImgBlob(image);
      else if (name.substring(name.length - 6, name.length - 4) == "ss") //Green Channel Roughness
        blob = await this.greenImgBlob(image);
      else if (name.substring(name.length - 6, name.length - 4) == "ic") //Blue Channel Metallic
        blob = await this.blueImgBlob(image);
      else if (name.substring(name.length - 6, name.length - 4) == "al") //Normal Scale
        blob = await this.normalImgBlob(image);
      else if (name.substring(name.length - 6, name.length - 4) == "ha") //Alpha Map from Diffuse
        blob = await this.alphaImgBlob(image);
      else
        blob = await this.imgBlob(image);

      zip.file(name, blob)
    }

    return zip.generateAsync({
      type: "blob",
      mimeType: "model/vnd.usdz+zip"
    });
  }

  this.appendBuffer = function(newBuff) {
    while (this.buffer.byteLength < (this.lseek + newBuff.byteLength)) {
      let tmp = new Uint8Array(this.buffer.byteLength * 2);
      tmp.set(new Uint8Array(this.buffer), 0);
      this.buffer = tmp;
    }
    this.buffer.set(new Uint8Array(newBuff), this.lseek)
    this.lseek += newBuff.byteLength;

  }
  this.updateToc = function(toc) {

    let arr = new ArrayBuffer(8); // an Int32 takes 4 bytes
    let view = new DataView(arr);
    view.setUint32(0, toc, true);
    view.setUint32(4, 0, true);

    this.buffer[16] = view.getUint8(0);
    this.buffer[17] = view.getUint8(1);
    this.buffer[18] = view.getUint8(2);
    this.buffer[19] = view.getUint8(3);
    this.buffer[20] = view.getUint8(4);
    this.buffer[21] = view.getUint8(5);
    this.buffer[22] = view.getUint8(6);
    this.buffer[23] = view.getUint8(7);
  }

  this.addPath = function(path, token, jump, prim) {
    if (prim)
      token *= -1;
    this.paths.push([path, token, jump]);
  }

  this.writeTableOfContents = function() {
    let tocStart = this.lseek;
    this.writeInt(this.toc.length, 8)
    for (let i = 0; i < this.toc.length; i++) {
      this.write(unescape(encodeURIComponent(this.toc[i][0])));
      //this.write(this.toc[i][0])
      let spaces = 16 - this.toc[i][0].length;
      for (let j = 0; j < spaces; j++) {
        this.write('\x00');
      }
      this.writeInt(this.toc[i][1], 8)
      this.writeInt(this.toc[i][2], 8)
    }
    this.updateToc(tocStart);
  }
  
  this.writeBootStrap = function(tocOffset = 0) {
    this.write("PXR-USDC");
    this.write('\x00\x07\x00\x00\x00\x00\x00\x00');
    this.writeInt(tocOffset, 8);
    for (let i = 0; i < 64; i++) {
      this.write('\x00');
    }
  }

}

///////////////TYPES//////////////////

const SpecifierType = {
  "Def": 0,
  "Over": 1,
  "Class": 2
};
Object.freeze(SpecifierType)

const ClassType = {
  "Scope": 0,
  "Xform": 1,
  "Mesh": 2,
  "SkelRoot": 3,
  "Skeleton": 4,
  "SkelAnimation": 5,
  "Material": 6,
  "Shader": 7,
  "GeomSubset": 8
}
ClassType.getName = function(value) {
  return Object.keys(this).find(key => this[key] === value);
}

Object.freeze(ClassType)

const SpecType = {
  "Attribute": 1,
  "Connection": 2,
  "Expression": 3,
  "Mapper": 4,
  "MapperArg": 5,
  "Prim": 6,
  "PseudoRoot": 7,
  "Relationship": 8,
  "RelationshipTarget": 9,
  "letiant": 10,
  "letiantSet": 11
}
Object.freeze(SpecType)

const ValueType = {
  "Invalid": 0,
  "bool": 1,
  "uchar": 2,
  "int": 3,
  "uint": 4,
  "int64": 5,
  "uint64": 6,
  "half": 7,
  "float": 8,
  "double": 9,
  "string": 10,
  "token": 11,
  "asset": 12,
  "matrix2d": 13,
  "matrix3d": 14,
  "matrix4d": 15,
  "quatd": 16,
  "quatf": 17,
  "quath": 18,
  "vec2d": 19,
  "vec2f": 20,
  "vec2h": 21,
  "vec2i": 22,
  "vec3d": 23,
  "vec3f": 24,
  "vec3h": 25,
  "vec3i": 26,
  "vec4d": 27,
  "vec4f": 28,
  "vec4h": 29,
  "vec4i": 30,
  "Dictionary": 31,
  "TokenListOp": 32,
  "StringListOp": 33,
  "PathListOp": 34,
  "ReferenceListOp": 35,
  "IntListOp": 36,
  "Int64ListOp": 37,
  "UIntListOp": 38,
  "UInt64ListOp": 39,
  "PathVector": 40,
  "TokenVector": 41,
  "Specifier": 42,
  "Permission": 43,
  "letiability": 44,
  "letiantSelectionMap": 45,
  "TimeSamples": 46,
  "Payload": 47,
  "DoubleVector": 48,
  "LayerOffsetVector": 49,
  "StringVector": 50,
  "ValueBlock": 51,
  "Value": 52,
  "UnregisteredValue": 53,
  "UnregisteredValueListOp": 54,
  "PayloadListOp": 55
}
ValueType.getName = function(value) {
  if (value == ValueType.vec2f)
    return 'float2'
  if (value == ValueType.vec3f)
    return 'float3'
  if (value == ValueType.vec4f)
    return 'float4'
  return Object.keys(this).find(key => this[key] === value);
}

Object.freeze(ValueType);
//////////////UTILS////////////////

function convertThreeMatrix(matrix) {
  //matrix=matrix.clone().transpose();
  return matrix;
  /*
  matrix = mathutils.Matrix.transposed(matrix)
  return (matrix[0][:], matrix[1][:], matrix[2][:], matrix[3][:])
  */
}

function getValueType(value) {

  let t = typeof(value)
  if (t == "boolean") {
    return ValueType.bool
  }

  if (t == "number") {
    if (value % 1 === 0) {
      return ValueType.int;
    } else {
      return ValueType.float;
    }
  }
  if (t == "string") {
    if (value.length > 0 && value[0] == '@') {
      return ValueType.asset
    }
    return ValueType.token;
  }
  if (t == "object") {
    if (value == null)
      return ValueType.Invalid

    if (Array.isArray(value)) {
      return getValueType(value[0]);
    }

    if (value.isVector4) {
      return ValueType.vec4f;
    }
    if (value.isVector3) {
      return ValueType.vec3f;
    }
    if (value.isVector2) {
      return ValueType.vec2f;
    }
    if (value.isMatrix4) {
      return ValueType.matrix4d;
    }

    return ValueType.Dictionary
  }
  return ValueType.Invalid
}

function exportThreeMeshVertexCounts(mesh) {
  let vertexCounts = [];
  for (let i = 0; i < (mesh.index.array.length / 3); i++) {
    vertexCounts.push(3);
  }
  return vertexCounts;
}

function exportThreeMeshVertices(mesh) {
  let vertices = [];
  for (let i = 0; i < mesh.attributes.position.array.length; i += 3) {
    vertices.push(new THREE.Vector3(mesh.attributes.position.array[i], mesh.attributes.position.array[i + 1], mesh.attributes.position.array[i + 2]))
  }

  return vertices;
}

function exportThreeMeshIndices(mesh) {
  let indices = [];

  for (let i = 0; i < mesh.index.array.length; i++) {
    indices.push(mesh.index.array[i]);
  }

  return indices;
}

function exportThreeMeshNormals(mesh) {
  let normals = [];
  for (let i = 0; i < mesh.attributes.normal.array.length; i += 3) {
    //normals.push(mesh.attributes.normal.array[i])
    normals.push(new THREE.Vector3(mesh.attributes.normal.array[i], mesh.attributes.normal.array[i + 1], mesh.attributes.normal.array[i + 2]));

  }
  return normals;
}

function exportThreeMeshUVs(mesh) {

  let uvs = [];
  let layer = 0;
  for (let i = 0; i < mesh.attributes.uv.array.length; i += 2) {
    uvs.push(new THREE.Vector2(mesh.attributes.uv.array[i], (mesh.attributes.uv.array[i + 1] - 1) * -1))
  }
  return uvs;
}

function exportThreeMeshNormalIndices(mesh) {
  return exportThreeMeshIndices(mesh);
}

function exportThreeExtents(object) {
  object.geometry.computeBoundingBox();
  return [object.geometry.boundingBox.min, object.geometry.boundingBox.max]
}

export { USDZExporter }