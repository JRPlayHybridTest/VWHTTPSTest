import * as THREE from 'https://cdn.skypack.dev/three@0.129.0';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/exporters/GLTFExporter.js';

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":4,"timers":5}],6:[function(require,module,exports){
"use strict";

var _USDZExporter = require("./USDZExporter.js");

// import * as THREE from 'https://cdn.skypack.dev/three@0.129.0';
// import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';
// import { OrbitControls } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js';
// import { GLTFExporter } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/exporters/GLTFExporter.js';
let camera, scene, renderer;
const script = document.createElement("script");
script.type = "module";
script.src = "https://unpkg.com/@google/model-viewer@1.6.0/dist/model-viewer.min.js";
let modelviewer;
init();

function init() {
  modelviewer = document.createElement("model-viewer");
  modelviewer.setAttribute("style", "width: 0; height: 0;");
  modelviewer.setAttribute("ar", "");
  modelviewer.setAttribute("ar-modes", "scene-viewer");
  document.head.appendChild(script); // Prepend instead of append so that the shitty, broken template HTML
  // cannot mess with the modelviewer. Yay.

  document.body.prepend(modelviewer);
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0a0a0);
  scene.fog = new THREE.Fog(0xa0a0a0, 10, 500);
  camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 500);
  camera.position.set(-30, 20, 80);
  scene.add(camera); //

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
  hemiLight.position.set(0, 100, 0);
  scene.add(hemiLight);
  const dirLight = new THREE.DirectionalLight(0xffffff);
  dirLight.position.set(-0, 40, 50);
  dirLight.castShadow = true;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -25;
  dirLight.shadow.camera.left = -25;
  dirLight.shadow.camera.right = 25;
  dirLight.shadow.camera.near = 0.1;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.mapSize.set(1024, 1024);
  scene.add(dirLight); // scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );
  //

  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);
  loader.load( // resource URL
  'rooster.glb', // called when the resource is loaded
  function (gltf) {
    gltf.scene.scale.set(15, 15, 15);
    scene.add(gltf.scene);
    gltf.animations; // Array<THREE.AnimationClip>

    gltf.scene; // THREE.Group

    gltf.scenes; // Array<THREE.Group>

    gltf.cameras; // Array<THREE.Camera>

    gltf.asset; // Object
    // There is a bug in Google Chrome 87 which causes the browser to crash
    // when activating an AR session with a DOM overlay in some cases.
    // It seems to be related to the scrolling content of the website.
    // I don't know why exactly, but setting 'overflow' to 'hidden' circumvents this bug.
    // Sources:
    // - https://github.com/google/model-viewer/issues/1694
    // - https://bugs.chromium.org/p/chromium/issues/detail?id=1149708#c6

    const originalOverflowProp = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // Uncomment and fix relative link for environment map
    //modelviewer.setAttribute("environment-image", `./${HASH}/android_ar.hdr`);

    modelviewer.setAttribute("src", `http://jrplayhybridtest.github.io/aframe-test/AnimatedMorphCube.glb`);
    modelviewer.activateAR().then(() => {
      // Restore original overflow style.
      document.body.style.overflow = originalOverflowProp;
      new GLTFExporter().parse(scene, function (res) {
        setTimeout(function (res) {
          // At this point 'canActivateAR' hopefully should contain the real value.
          // If we were to check it right after the 'activateAR' promise resolved,
          // then the value would somehow always be false...
          const canActivateAR = modelviewer.canActivateAR;

          if (canActivateAR === false) {
            console.log("Error: Can't activate AR");
          } else if (canActivateAR !== true) {
            console.log("canActivateAR is not a boolean.");
          }

          const url = URL.createObjectURL(new Blob([res]));
          modelviewer.setAttribute("src", url);
        }, 2000, res);
      });
    }); // new GLTFExporter().parse(scene, function(res) {
    //     let blob;
    //     let filename = "scene";
    //     if ( res instanceof ArrayBuffer ) {
    //         blob = new Blob([res], {type: 'application/octet-stream'});
    //         filename += ".glb";
    //     } else {
    //         const output = JSON.stringify( res, null, 2 );
    //         console.log( output );
    //         blob = new Blob([output], {type: 'text/plain'});
    //         filename += ".gltf";
    //     }
    //     const link = document.createElement("a");
    //     link.href = URL.createObjectURL(blob);
    //     link.download = filename;
    //     link.click();
    // }, {binary: true});
    // new USDZExporter().exportScene(scene, {scale: 100, rotation: [0, Math.PI, 0]}).then((blob) => {
    //     // This makes Safari not reload the website when we return from AR.
    //     history.pushState({}, "");
    //     const url = URL.createObjectURL(blob);
    //     const link = document.createElement("a");
    //     link.rel = "ar";
    //     link.href = url;
    //     // https://cwervo.com/writing/quicklook-web/#launching-without-a-preview-image-using-javascript
    //     link.appendChild(document.createElement("img"));
    //     link.click();
    //     console.log(blob);
    // });    
  }, // called while loading is progressing
  function (xhr) {
    console.log(xhr.loaded / xhr.total * 100 + '% loaded');
  }, // called when loading has errors
  function (error) {
    console.log('An error happened');
  });

  manager.onLoad = function () {
    render();
  }; //


  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshPhongMaterial({
    color: 0x999999,
    depthWrite: false
  }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 11;
  ground.receiveShadow = true;
  scene.add(ground); //

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement); //

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('change', render);
  controls.minDistance = 50;
  controls.maxDistance = 200;
  controls.enablePan = false;
  controls.target.set(0, 20, 0);
  controls.update();
  window.addEventListener('resize', onWindowResize);
  render();
}

function save(blob, filename) {
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click(); // URL.revokeObjectURL( url ); breaks Firefox...
}

function saveString(text, filename) {
  save(new Blob([text], {
    type: 'text/plain'
  }), filename);
}

function saveArrayBuffer(buffer, filename) {
  save(new Blob([buffer], {
    type: 'application/octet-stream'
  }), filename);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function render() {
  renderer.render(scene, camera);
}

},{"./USDZExporter.js":7}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.USDZExporter = USDZExporter;

var _jsbi = _interopRequireDefault(require("./node_modules/jsbi/dist/jsbi.mjs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
}; // Reads a 64-bit little-endian integer from an array.


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
}; // Reads a 32-bit little-endian integer from an array.


util.readU32 = function readU32(b, n) {
  let x = 0;
  x |= b[n++] << 0;
  x |= b[n++] << 8;
  x |= b[n++] << 16;
  x |= b[n++] << 24;
  return x;
}; // Writes a 32-bit little-endian integer from an array.


util.writeU32 = function writeU32(b, n, x) {
  b[n++] = x >> 0 & 0xff;
  b[n++] = x >> 8 & 0xff;
  b[n++] = x >> 16 & 0xff;
  b[n++] = x >> 24 & 0xff;
}; // Multiplies two numbers using 32-bit integer multiplication.
// Algorithm from Emscripten.


util.imul = function imul(a, b) {
  let ah = a >>> 16;
  let al = a & 65535;
  let bh = b >>> 16;
  let bl = b & 65535;
  return al * bl + (ah * bl + al * bh << 16) | 0;
};

function PositionTable() {
  let TABLE_SIZE = 4096;
  this.table = [this.TABLE_SIZE];

  this.hash = function (value) {
    // TODO: check this for correctness thoroughly.
    let tmp = _jsbi.default.BigInt(value);

    tmp = _jsbi.default.bitwiseAnd(tmp, _jsbi.default.BigInt(0x0FFFFFFFF));
    tmp = _jsbi.default.bitwiseAnd(_jsbi.default.multiply(tmp, _jsbi.default.BigInt(2654435761)), _jsbi.default.BigInt(0x0FFF));
    return _jsbi.default.toNumber(tmp);
  };

  this.getPosition = function (val) {
    let index = this.hash(val);
    return this.table[index];
  };

  this.setPosition = function (val, pos) {
    let index = this.hash(val);
    this.table[index] = pos;
  };
}

function lz4() {
  let MAX_BLOCK_INPUT_SIZE = 0x7E000000;
  let MAX_OFFSET = 65535;
  let MIN_MATCH = 4;
  let MFLIMIT = 12;

  this.encode = function (src) {
    let dst = new Uint8Array(1);
    let inputSize = src.length;
    if (inputSize == 0) return dst;
    if (inputSize > 127 * MAX_BLOCK_INPUT_SIZE) console.error('Buffer Too Large for LZ4 Compression');else if (inputSize <= MAX_BLOCK_INPUT_SIZE) {
      //dst.setUint8(0, 0, false);//MAGIC NUM?
      dst[0] = 0;
      let dst2 = this.compressDefault(src);
      dst = this.concatBuffer(dst, dst2);
    } else {
      console.error("got bad SIZE in LZ4 compression");
    }
    return dst;
  };

  this.concatBuffer = function (buffer1, buffer2) {
    let tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
    return tmp.buffer;
  };

  this.compressDefault = function (src) {
    consoleHex(src.buffer);
    let srcLen = src.length;

    if (srcLen > MAX_BLOCK_INPUT_SIZE) {
      console.error("ERROR in LZ4 Compression");
      return '';
    } //let dst = new Uint8Array(this.worstCaseBlockLength(srcLen));


    let dst = new ArrayBuffer(this.worstCaseBlockLength(srcLen));
    let posTable = new PositionTable();
    let srcPtr = 0;
    let literalHead = 0;
    let dstPtr = 0;
    let MAX_INDEX = srcLen - MFLIMIT;

    while (srcPtr < MAX_INDEX) {
      let curValue = util.readU32(src, srcPtr);
      let matchPos = this.findMatch(posTable, curValue, src, srcPtr);

      if (matchPos != null) {
        let length = this.countMatch(src, matchPos, srcPtr, MAX_INDEX);
        if (length < MIN_MATCH) break;
        dstPtr += this.copySequence(dst, dstPtr, src.slice(literalHead, srcPtr), [srcPtr - matchPos, length]);
        srcPtr += length;
        literalHead = srcPtr;
      } else {
        posTable.setPosition(curValue, srcPtr);
        srcPtr++;
      } //console.error("errr in compress");//let curValue = readLeUint32(src, srcPtr)

    }

    dstPtr += this.copySequence(dst, dstPtr, src.slice(literalHead, srcLen), [0, 0]);
    consoleHex(dst.slice(0, dstPtr));
    return dst.slice(0, dstPtr);
  };

  this.countMatch = function (buf, front, back, max) {
    let count = 0;

    while (back <= max) {
      if (buf[front] == buf[back]) count += 1;else break;
      front += 1;
      back += 1;
    }

    return count;
  };

  this.findMatch = function (table, val, src, srcPtr) {
    let pos = table.getPosition(val);
    if (pos != undefined && val == util.readU32(src, pos)) {
      if (srcPtr - pos > MAX_OFFSET) return null;else return pos;
    } else return null;
  };

  this.worstCaseBlockLength = function (srcLen) {
    return srcLen + Math.floor(srcLen / 255) + 16;
  };

  this.copySequence = function (dst, dstHead, literal, match) {
    let dstView = new DataView(dst);
    let litLen = literal.length;
    let dstPtr = dstHead;
    let token = dstView.getUint8(dstPtr, false); //littleEndian=false

    let tokenPtr = dstPtr;
    dstPtr += 1;

    if (litLen >= 15) {
      token = 15 << 4;
      let remLen = litLen - 15;

      while (remLen >= 255) {
        //dst[dstPtr] = 255
        dstView.setUint8(dstPtr, 255, false);
        dstPtr += 1;
        remLen -= 255;
      } //dst[dstPtr] = remLen


      dstView.setUint8(dstPtr, remLen, false);
      dstPtr += 1;
    } else token = litLen << 4; //TOKEN PORINTER
    //dstPtr += 1


    for (let i = 0; i < litLen; i++) {
      dstView.setUint8(dstPtr, literal[i], false);
      dstPtr++;
    }

    let offset = match[0];
    let matchLen = match[1];

    if (matchLen > 0) {
      dstView.setUint16(dstPtr, offset, true);
      dstPtr += 2; // Write the Match length

      matchLen -= MIN_MATCH;

      if (matchLen >= 15) {
        token = token | 15;
        matchLen -= 15;

        while (matchLen >= 255) {
          dstView.setUint8(dstPtr, 255, false); //dst[dstPtr] = 255

          dstPtr += 1;
          matchLen -= 255;
        }

        dstView.setUint8(dstPtr, matchLen, false); //dst[dstPtr] = matchLen

        dstPtr += 1;
      } else token = token | matchLen;
    }

    dstView.setUint8(tokenPtr, token, false);
    return dstPtr - dstHead;
  };
}

function mode(array) {
  if (array.length == 0) return null;
  let modeMap = {};
  let maxEl = array[0],
      maxCount = 1;

  for (let i = 0; i < array.length; i++) {
    let el = array[i];
    if (modeMap[el] == null) modeMap[el] = 1;else modeMap[el]++;

    if (modeMap[el] > maxCount) {
      maxEl = el;
      maxCount = modeMap[el];
    }
  }

  return maxEl;
}

function usdInt32Compress(values) {
  if (values.length == 0) return [];
  let prevalue = 0;

  for (let i = 0; i < values.length; i++) {
    let value = values[i];
    values[i] = value - prevalue;
    prevalue = value;
  }

  let commonValue = mode(values); //let data=[];           //2

  let data = new ArrayBuffer(2 * values.length + 1);
  let dataView = new DataView(data);
  let dataPtr = 0; //Debug                                 

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
        alterable |= 1 << i % 4 * 2;
        dataView.setUint8(Math.floor(i / 4), alterable, true);
        dataView.setUint8(dataPtr, value, true);
        dataPtr++;
      } else if (bitLength < 16) {
        let alterable = dataView.getInt8(Math.floor(i / 4));
        alterable |= 2 << i % 4 * 2;
        dataView.setUint8(Math.floor(i / 4), alterable, true);
        dataView.setUint16(dataPtr, value, true);
        dataPtr++;
        dataPtr++;
      } else {
        console.error("not implemented!!! @ usdInt32Compress Ints Bigger than 16 Byte (sheeesh)");
      }
    }
  }

  return new Int8Array(data.slice(0, dataPtr)); //return data;
}

function split64Bit(integ) {
  let bigNumber = integ;
  let bigNumberAsBinaryStr = bigNumber.toString(2); // '100000000000000000000000000000000000000000000000000000'
  // Convert the above binary str to 64 bit (actually 52 bit will work) by padding zeros in the left

  let bigNumberAsBinaryStr2 = '';

  for (let i = 0; i < 64 - bigNumberAsBinaryStr.length; i++) {
    bigNumberAsBinaryStr2 += '0';
  }

  ;
  bigNumberAsBinaryStr2 += bigNumberAsBinaryStr;
  let lowInt = parseInt(bigNumberAsBinaryStr2.substring(0, 32), 2);
  let highInt = parseInt(bigNumberAsBinaryStr2.substring(32), 2);
  return [highInt, lowInt];
}

function encodeInts(ints, size, byteOrder = true
/*'little'*/
, signed = false) {
  if (!signed && size == 8) {
    let arr = new ArrayBuffer(ints.length * 8); // an Int32 takes 4 bytes

    let view = new DataView(arr);

    for (let i = 0; i < ints.length; i++) {
      //view.setBigUint64(i*8, ints[i], byteOrder);//noSafari Support
      let highLow = split64Bit(ints[i]);
      view.setUint32(i * 8, highLow[0], byteOrder);
      view.setUint32(i * 8 + 4, highLow[1], byteOrder);
    } //return arr;


    return new Int8Array(arr);
  } else console.error("Error @EncodeInts");
}

let prime1 = 0x9e3779b1;
let prime2 = 0x85ebca77;
let prime3 = 0xc2b2ae3d;
let prime4 = 0x27d4eb2f;
let prime5 = 0x165667b1; // Utility functions/primitives
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
} // Implementation
// --


function xxhapply(h, src, m0, s, m1) {
  return rotmul32(util.imul(src, m0) + h, s, m1);
}

function xxh1(h, src, index) {
  return rotmul32(h + util.imul(src[index], prime5), 11, prime1);
}

function xxh4(h, src, index) {
  return xxhapply(h, util.readU32(src, index), prime3, 17, prime4);
}

function xxh16(h, src, index) {
  return [xxhapply(h[0], util.readU32(src, index + 0), prime2, 13, prime1), xxhapply(h[1], util.readU32(src, index + 4), prime2, 13, prime1), xxhapply(h[2], util.readU32(src, index + 8), prime2, 13, prime1), xxhapply(h[3], util.readU32(src, index + 12), prime2, 13, prime1)];
}

function xxh32(seed, src, index, len) {
  let h, l;
  l = len;

  if (len >= 16) {
    h = [seed + prime1 + prime2, seed + prime2, seed, seed - prime1];

    while (len >= 16) {
      h = xxh16(h, src, index);
      index += 16;
      len -= 16;
    }

    h = rotl32(h[0], 1) + rotl32(h[1], 7) + rotl32(h[2], 12) + rotl32(h[3], 18) + l;
  } else {
    h = seed + prime5 + len >>> 0;
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
xxhash.hash = xxh32; // lz4.js - An implementation of Lz4 in plain JavaScript.
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
let hashSize = 1 << 16; // Token constants.

let mlBits = 4;
let mlMask = (1 << mlBits) - 1;
let runBits = 4;
let runMask = (1 << runBits) - 1; // Shared buffers

let blockBuf = makeBuffer(5 << 20);
let hashTable = makeHashTable(); // Frame constants.

let magicNum = 0; //0x184D2204;
// Frame descriptor flags.

let fdContentChksum = 0x4;
let fdContentSize = 0x8;
let fdBlockChksum = 0x10; // let fdBlockIndep = 0x20;

let fdVersion = 0x40;
let fdVersionMask = 0xC0; // Block sizes.

let bsUncompressed = 0x80000000;
let bsDefault = 7;
let bsShift = 4;
let bsMask = 7;
let bsMap = {
  4: 0x10000,
  5: 0x40000,
  6: 0x100000,
  7: 0x400000
}; // Utility functions/primitives
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
} // Clear hashtable.


function clearHashTable(table) {
  for (let i = 0; i < hashSize; i++) {
    hashTable[i] = 0;
  }
} // Makes a byte buffer. On older browsers, may return a plain array.


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
      let len = array.length; // Calculate start.

      start = start | 0;
      start = start < 0 ? Math.max(len + start, 0) : Math.min(start, len); // Calculate end.

      end = end === undefined ? len : end | 0;
      end = end < 0 ? Math.max(len + end, 0) : Math.min(end, len); // Copy into new array.

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
} // Implementation
// --


let _exports = {}; // Calculates an upper bound for lz4 compression.

_exports.compressBound = function compressBound(n) {
  return n + n / 255 + 16 | 0;
}; // Calculates an upper bound for lz4 decompression, by reading the data.


_exports.decompressBound = function decompressBound(src) {
  let sIndex = 0; // Read magic number

  if (util.readU32(src, sIndex) !== magicNum) {
    throw new Error('invalid magic number');
  }

  sIndex += 4; // Read descriptor

  let descriptor = src[sIndex++]; // Check version

  if ((descriptor & fdVersionMask) !== fdVersion) {
    throw new Error('incompatible descriptor version ' + (descriptor & fdVersionMask));
  } // Read flags


  let useBlockSum = (descriptor & fdBlockChksum) !== 0;
  let useContentSize = (descriptor & fdContentSize) !== 0; // Read block size

  let bsIdx = src[sIndex++] >> bsShift & bsMask;

  if (bsMap[bsIdx] === undefined) {
    throw new Error('invalid block size ' + bsIdx);
  }

  let maxBlockSize = bsMap[bsIdx]; // Get content size

  if (useContentSize) {
    return util.readU64(src, sIndex);
  } // Checksum


  sIndex++; // Read blocks.

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
}; // Creates a buffer of a given byte-size, falling back to plain arrays.
//exports.makeBuffer = makeBuffer;
// Decompresses a block of Lz4.


_exports.decompressBlock = function decompressBlock(src, dst, sIndex, sLength, dIndex) {
  let mLength, mOffset, sEnd, n, i;
  let hasCopyWithin = dst.copyWithin !== undefined && dst.fill !== undefined; // Setup initial state.

  sEnd = sIndex + sLength; // Consume entire input block.

  while (sIndex < sEnd) {
    let token = src[sIndex++]; // Copy literals.

    let literalCount = token >> 4;

    if (literalCount > 0) {
      // Parse length.
      if (literalCount === 0xf) {
        while (true) {
          literalCount += src[sIndex];

          if (src[sIndex++] !== 0xff) {
            break;
          }
        }
      } // Copy literals


      for (n = sIndex + literalCount; sIndex < n;) {
        dst[dIndex++] = src[sIndex++];
      }
    }

    if (sIndex >= sEnd) {
      break;
    } // Copy match.


    mLength = token & 0xf; // Parse offset.

    mOffset = src[sIndex++] | src[sIndex++] << 8; // Parse length.

    if (mLength === 0xf) {
      while (true) {
        mLength += src[sIndex];

        if (src[sIndex++] !== 0xff) {
          break;
        }
      }
    }

    mLength += minMatch; // Copy match
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
}; // Compresses a block with Lz4.


_exports.compressBlock = function compressBlock(src, dst, sIndex, sLength, hashTable) {
  let mIndex, mAnchor, mLength, mOffset, mStep;
  let literalCount, dIndex, sEnd, n; // Setup initial state.

  dIndex = 0;
  sEnd = sLength + sIndex;
  mAnchor = sIndex; // Process only if block is large enough.

  if (sLength >= minLength) {
    let searchMatchCount = (1 << skipTrigger) + 3; // Consume until last n literals (Lz4 spec limitation.)

    while (sIndex + minMatch < sEnd - searchLimit) {
      let seq = util.readU32(src, sIndex);
      let hash = util.hashU32(seq) >>> 0; // Crush hash to 16 bits.

      hash = (hash >> 16 ^ hash) >>> 0 & 0xffff; // Look for a match in the hashtable. NOTE: remove one; see below.

      mIndex = hashTable[hash] - 1; // Put pos in hash table. NOTE: add one so that zero = invalid.

      hashTable[hash] = sIndex + 1; // Determine if there is a match (within range.)

      if (mIndex < 0 || sIndex - mIndex >>> 16 > 0 || util.readU32(src, mIndex) !== seq) {
        mStep = searchMatchCount++ >> skipTrigger;
        sIndex += mStep;
        continue;
      }

      searchMatchCount = (1 << skipTrigger) + 3; // Calculate literal count and offset.

      literalCount = sIndex - mAnchor;
      mOffset = sIndex - mIndex; // We've already matched one word, so get that out of the way.

      sIndex += minMatch;
      mIndex += minMatch; // Determine match length.
      // N.B.: mLength does not include minMatch, Lz4 adds it back
      // in decoding.

      mLength = sIndex;

      while (sIndex < sEnd - searchLimit && src[sIndex] === src[mIndex]) {
        sIndex++;
        mIndex++;
      }

      mLength = sIndex - mLength; // Write token + literal count.

      let token = mLength < mlMask ? mLength : mlMask;

      if (literalCount >= runMask) {
        dst[dIndex++] = (runMask << mlBits) + token;

        for (n = literalCount - runMask; n >= 0xff; n -= 0xff) {
          dst[dIndex++] = 0xff;
        }

        dst[dIndex++] = n;
      } else {
        dst[dIndex++] = (literalCount << mlBits) + token;
      } // Write literals.


      for (let i = 0; i < literalCount; i++) {
        dst[dIndex++] = src[mAnchor + i];
      } // Write offset.


      dst[dIndex++] = mOffset;
      dst[dIndex++] = mOffset >> 8; // Write match length.

      if (mLength >= mlMask) {
        for (n = mLength - mlMask; n >= 0xff; n -= 0xff) {
          dst[dIndex++] = 0xff;
        }

        dst[dIndex++] = n;
      } // Move the anchor.


      mAnchor = sIndex;
    }
  } // Nothing was encoded.


  if (mAnchor === 0) {
    return 0;
  } // Write remaining literals.
  // Write literal token+count.


  literalCount = sEnd - mAnchor;

  if (literalCount >= runMask) {
    dst[dIndex++] = runMask << mlBits;

    for (n = literalCount - runMask; n >= 0xff; n -= 0xff) {
      dst[dIndex++] = 0xff;
    }

    dst[dIndex++] = n;
  } else {
    dst[dIndex++] = literalCount << mlBits;
  } // Write literals.


  sIndex = mAnchor;

  while (sIndex < sEnd) {
    dst[dIndex++] = src[sIndex++];
  }

  return dIndex;
}; // Decompresses a frame of Lz4 data.


_exports.decompressFrame = function decompressFrame(src, dst) {
  let useBlockSum, useContentSum, useContentSize, descriptor;
  let sIndex = 0;
  let dIndex = 0; // Read magic number

  if (util.readU32(src, sIndex) !== magicNum) {
    throw new Error('invalid magic number');
  }

  sIndex += 4; // Read descriptor

  descriptor = src[sIndex++]; // Check version

  if ((descriptor & fdVersionMask) !== fdVersion) {
    throw new Error('incompatible descriptor version');
  } // Read flags


  useBlockSum = (descriptor & fdBlockChksum) !== 0;
  useContentSum = (descriptor & fdContentChksum) !== 0;
  useContentSize = (descriptor & fdContentSize) !== 0; // Read block size

  let bsIdx = src[sIndex++] >> bsShift & bsMask;

  if (bsMap[bsIdx] === undefined) {
    throw new Error('invalid block size');
  }

  if (useContentSize) {
    // TODO: read content size
    sIndex += 8;
  }

  sIndex++; // Read blocks.

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
    } // Check if block is compressed


    if ((compSize & bsUncompressed) !== 0) {
      // Mask off the 'uncompressed' bit
      compSize &= ~bsUncompressed; // Copy uncompressed data into destination buffer.

      for (let j = 0; j < compSize; j++) {
        dst[dIndex++] = src[sIndex++];
      }
    } else {
      // Decompress into blockBuf
      dIndex = _exports.decompressBlock(src, dst, sIndex, compSize, dIndex);
      sIndex += compSize;
    }
  }

  if (useContentSum) {
    // TODO: read content checksum
    sIndex += 4;
  }

  return dIndex;
}; // Compresses data to an Lz4 frame.


_exports.compressFrame = function compressFrame(src, dst) {
  let dIndex = 0; // Write magic number.

  util.writeU32(dst, dIndex, magicNum);
  dIndex += 4; // Descriptor flags.

  dst[dIndex++] = fdVersion;
  dst[dIndex++] = bsDefault << bsShift; // Descriptor checksum.

  dst[dIndex] = xxhash.hash(0, dst, 4, dIndex - 4) >> 8;
  dIndex++; // Write blocks.

  let maxBlockSize = bsMap[bsDefault];
  let remaining = src.length;
  let sIndex = 0; // Clear the hashtable.

  clearHashTable(hashTable); // Split input into blocks and write.

  while (remaining > 0) {
    let compSize = 0;
    let blockSize = remaining > maxBlockSize ? maxBlockSize : remaining;
    compSize = _exports.compressBlock(src, blockBuf, sIndex, blockSize, hashTable);

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
  } // Write blank end block.


  util.writeU32(dst, dIndex, 0);
  dIndex += 4;
  return dIndex;
}; // Decompresses a buffer containing an Lz4 frame. maxSize is optional; if not
// provided, a maximum size will be determined by examining the data. The
// buffer returned will always be perfectly-sized.


_exports.decompress = function decompress(src, maxSize) {
  let dst, size;

  if (maxSize === undefined) {
    maxSize = _exports.decompressBound(src);
  }

  dst = _exports.makeBuffer(maxSize);
  size = _exports.decompressFrame(src, dst);

  if (size !== maxSize) {
    dst = sliceArray(dst, 0, size);
  }

  return dst;
}; // Compresses a buffer to an Lz4 frame. maxSize is optional; if not provided,
// a buffer will be created based on the theoretical worst output size for a
// given input size. The buffer returned will always be perfectly-sized.


_exports.compress = function compress(src, maxSize) {
  let dst, size;

  if (maxSize === undefined) {
    maxSize = _exports.compressBound(src.length); //src.length
  }

  dst = makeBuffer(maxSize);
  size = _exports.compressFrame(src, dst);

  if (size !== maxSize) {
    dst = sliceArray(dst, 0, size);
  }

  return dst;
};

const rechk = /^([<>])?(([1-9]\d*)?([xcbB?hHiIfdsp]))*$/;
const refmt = /([1-9]\d*)?([xcbB?hHiIfdsp])/g;

const str = (v, o, c) => String.fromCharCode(...new Uint8Array(v.buffer, v.byteOffset + o, c));

const rts = (v, o, c, s) => new Uint8Array(v.buffer, v.byteOffset + o, c).set(s.split('').map(str => str.charCodeAt(0)));

const pst = (v, o, c) => str(v, o + 1, Math.min(v.getUint8(o), c - 1));

const tsp = (v, o, c, s) => {
  v.setUint8(o, s.length);
  rts(v, o + 1, c - 1, s);
};

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
});

const errbuf = new RangeError("Structure larger than remaining buffer");
const errval = new RangeError("Not enough values for structure");

const struct = format => {
  let fns = [],
      size = 0,
      m = rechk.exec(format);

  if (!m) {
    throw new RangeError("Invalid format string");
  }

  const t = lut('<' === m[1]),
        lu = (n, c) => t[c](n ? parseInt(n, 10) : 1);

  while (m = refmt.exec(format)) {
    ((r, s, f) => {
      for (let i = 0; i < r; ++i, size += s) {
        if (f) {
          fns.push(f(size));
        }
      }
    })(...lu(...m.slice(1)));
  }

  const unpack_from = (arrb, offs) => {
    if (arrb.byteLength < (offs | 0) + size) {
      throw errbuf;
    }

    let v = new DataView(arrb, offs | 0);
    return fns.map(f => f.u(v));
  };

  const pack_into = (arrb, offs, ...values) => {
    if (values.length < fns.length) {
      throw errval;
    }

    if (arrb.byteLength < offs + size) {
      throw errbuf;
    }

    const v = new DataView(arrb, offs);
    new Uint8Array(arrb, offs, size).fill(0);
    fns.forEach((f, i) => f.p(v, values[i]));
  };

  const pack = (...values) => {
    let b = new ArrayBuffer(size);
    pack_into(b, 0, ...values);
    return b;
  };

  const unpack = arrb => unpack_from(arrb, 0);

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
  });
};

function USDZExporter() {
  this.exportScene = function (threeScene, options) {
    let usdScene = new Scene();

    if (options.scale !== undefined) {
      usdScene.scale = options.scale;
    }

    if (options.rotation !== undefined) {
      usdScene.rotation = options.rotation;
    }

    usdScene.loadContext(threeScene);
    usdScene.exportBakedTextures();
    let usdData = usdScene.exportUsd();
    let crate = new Crate(usdScene.textureFilePaths);
    return crate.writeUsd(usdData);
  };
} /////////////////////////SCENE//////////////////////////////////


function Scene() {
  this.context = null;
  this.objects = [];
  this.objMap = {};
  this.meshObjs = {};
  this.collections = {};
  this.usdCollections = {};
  this.exportMaterials = true;
  this.materials = {};
  this.exportPath = '';
  this.bakeAO = false;
  this.bakeTextures = true;
  this.textureFilePaths = [];
  this.bakeSamples = 8;
  this.bakeSize = 1024;
  this.sharedMeshes = true;
  this.scale = 1;
  this.rotation = [0, 0, 0];
  this.animated = false;
  this.startFrame = 0;
  this.endFrame = 0;
  this.curFrame = 0;
  this.fps = 30;
  this.customLayerData = {
    'creator': 'VisCirle USDZ Xporter'
  };
  this.collection = null;

  this.exportUsd = function () {
    let data = new UsdData();
    data.setItem("upAxis", "Y");
    data.setItem("customLayerData", this.customLayerData);
    if (this.exportMaterials) this.exportSharedMaterials(data); //TODO: Export Collections? Maybe to fix highest hierarchy level :-)    

    this.exportSharedMeshes(data);

    for (let i = 0; i < this.objects.length; i++) {
      this.objects[i].exportUsd(data);
    }

    return data;
  };

  this.exportSharedMeshes = function (data) {};

  this.exportSharedMaterials = function (data) {
    if (Object.entries(this.materials).length > 0) {
      let looks = data.createChild('Looks', ClassType.Scope);

      for (const [key, mat] of Object.entries(this.materials)) {
        mat.exportUsd(looks);
      }
    }
  };

  this.loadContext = function (context) {
    this.context = context;
    this.renderEngine = "Three"; //getSceneScale!
    //load Objs

    this.loadObjects();
  };

  this.exportBakedTextures = function () {
    for (const [key, value] of Object.entries(this.objMap)) {
      if (value.type == "Mesh") {
        value.bakeTextures();
      }
    }
  };

  this.loadObjects = function () {
    let count = 0;
    this.context.traverseVisible(obj => {
      count++;
      if (obj.name == "") obj.name = "" + obj.uuid.replace(/[^a-zA-Z]+/g, '');
      if (obj.name[0] >= '0' && obj.name[0] <= '9') obj.name = "Obj" + obj.name;

      if (obj.type === 'Mesh') {
        if (obj.geometry.name == "") obj.geometry.name = "GeometryOf" + obj.uuid.replace(/[^a-zA-Z]+/g, '');
        this.addThreeObject(obj, obj.type);
      } else if (obj.type === 'Group' || obj.type === 'Object3D') {
        this.addThreeCollection(obj); //this.addThreeObject(obj.type)
      }
    });
  };

  this.addThreeObject = function (object, type) {
    let obj = new USDObject(object, this);

    if (this.objMap[obj.name] != undefined) {
      obj = this.objMap[obj.name];
    } else if (obj.hasParent()) {
      obj.parent = this.addThreeObject(object.parent);
      obj.parent.children.push(obj);
      this.objMap[obj.name] = obj;
    } else {
      this.objects.push(obj);
      this.objMap[obj.name] = obj;
    }

    if (type == "Mesh") obj.setAsMesh();
    return obj;
  };

  this.addThreeCollection = function (collection) {
    let name = collection.name.replace(/[^a-zA-Z]+/g, '');
    let obj = new USDObject(collection, this);
    obj.collection = name;

    if (this.objMap[obj.name] != undefined) {
      obj = this.objMap[obj.name];
    } else if (obj.hasParent()) {
      obj.parent = this.addThreeObject(collection.parent); //!!!!WHAT IF PARENT IS ALSO COLLECTION? mh

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
        let childObj = new USDObject(children[i], this);
        if (this.objMap[childObj.name] != undefined) childObj = this.objMap[childObj.name];else this.objMap[childObj.name] = childObj;
        objs.push(childObj);
        if (type == "Mesh") childObj.setAsMesh();
      }

      this.collections[name] = objs;
    }
  };
}

function USDMesh(object, scene) {
  this.createCopies = function () {
    //DEBUG SPEED
    let SPEEDDEBUG = true;
    if (!SPEEDDEBUG) this.objectCopy = this.object.clone();else this.objectCopy = this.object;

    if (this.objectCopy.geometry.isGeometry) {
      let name = this.objectCopy.geometry.name;
      this.objectCopy.geometry = new THREE.BufferGeometry().fromGeometry(this.objectCopy.geometry);
      this.objectCopy.geometry.name = name;
    }
  };

  this.name = object.name.replace(/[^a-zA-Z0-9]+/g, ''); //.replace('.', '_')

  this.object = object;
  this.scene = scene;
  this.objectCopy = null;
  this.armatueCopy = null;
  this.shared = false;
  this.usdMesh = null;
  this.createCopies();

  this.exportToObject = function (usdObj, classType = ClassType.Mesh) {
    let mesh = this.objectCopy.geometry;
    let name = this.objectCopy.geometry.name;
    let usdMesh = usdObj.createChild(name, classType);
    usdMesh.setItem("extent", exportThreeExtents(this.objectCopy)); // Bounding Box

    usdMesh.setItem("faceVertexCounts", exportThreeMeshVertexCounts(mesh));
    let points = exportThreeMeshVertices(mesh);
    let indices = exportThreeMeshIndices(mesh);
    usdMesh.setItem("faceVertexIndices", indices);
    usdMesh.setItem("points", points);
    usdMesh.getItem("points").valueTypeStr = "point3f"; //DEBUG DEBUG this should be activated with UV's!! MAYBE PROBLWMS WITH INDICES? 

    if (this.objectCopy.geometry.attributes.uv != undefined) this.exportMeshUvs(usdMesh); // DEBUG FOR ALL OTHER NOT WORKING STUFF...

    let normals = exportThreeMeshNormals(mesh);
    let normalIndices = exportThreeMeshNormalIndices(mesh);
    usdMesh.setItem("primlets:normals", normals);
    usdMesh.getItem("primlets:normals").valueTypeStr = "normal3f";
    usdMesh.getItem("primlets:normals").setItem("interpolation", "faceletying"); //DEBUG NO INDICES MAYBE NO PROBLEM? :D 'CAUSE FALLBACK TO POLY INDICES?

    usdMesh.setItem("primlets:normals:indices", indices); //DEBUG NEEDED TO DISABLE ALSO FOLLOWING 2 LINES 

    usdMesh.setItem("subdivisionScheme", "none");
    usdMesh.getItem("subdivisionScheme").addQualifier('uniform');
    return usdMesh;
  };

  this.exportMeshUvs = function (usdMesh) {
    let mesh = this.objectCopy.geometry; //indices, uvs = exportBpyMeshUvs(mesh, layer)

    let indices = [];
    let uvs = [];
    uvs = exportThreeMeshUVs(mesh); //for(let i=0;i<uvs.length/2;i++)
    //  indices.push(i);

    indices = [];
    indices = exportThreeMeshIndices(mesh);
    let name = "UVMap"; //layer.name.replace('.', '_')

    usdMesh.setItem('primlets:' + name, uvs);
    usdMesh.getItem('primlets:' + name).valueTypeStr = 'texCoord2f'; //usdMesh.getItem('primlets:'+name).setItem("valueTypeStr", 'texCoord2f');
    //usdMesh.getItem('primlets:'+name).interpolation='faceletying';

    usdMesh.getItem('primlets:' + name).setItem("interpolation", 'faceletying');
    usdMesh.setItem('primlets:' + name + ':indices', indices); ///TODOOO!!!!!!!!!

    /*
    let mesh=this.objectCopy.geometry;
    //using just 1 UV Layer...
    let uvs=
    let indices=
    let name="UVMap"
    */
  };
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

function ShaderInput(type, name, defaultVal) {
  //default as third arg???
  this.type = type;
  this.name = name;
  this.name = this.name.replace(/_/g, "");
  this.name = this.name.replace(/_/g, "");
  this.value = defaultVal;
  this.image = null;
  this.uvMap = null;
  this.usdAtt = null;

  this.exportShaderInput = function (material, usdShader) {
    if (this.usdAtt != undefined) usdShader.setItem("inputs:" + this.name, this.usdAtt);else {
      usdShader.setItem("inputs:" + this.name, this.value);
      if (usdShader.getItem("inputs:" + this.name).getValueType().name != this.type) usdShader.getItem("inputs:" + this.name).valueTypeStr = this.type;
    }
  };

  this.exportShader = function (material, usdMaterial) {
    if (this.image != undefined && this.uvMap != undefined) {
      let v = this.value;
      if (this.type == "float") defaultVal = new THREE.Vector4(v.x, v.y, v.z, 1.);else {
        defaultVal = new THREE.Vector4(v.x, v.y, v.z, 1.);
      }
      let usdShader = usdMaterial.createChild(this.name + "Map", ClassType.Shader);
      usdShader.setItem('info:id', "UsdUVTexture");
      usdShader.getItem('info:id').addQualifier("uniform");
      usdShader.setItem('inputs:fallback', defaultVal);
      usdShader.setItem('inputs:file', this.image);
      usdShader.getItem('inputs:file').valueType = ValueType.asset;
      let primUsdShader = usdMaterial.getChild("primlet_" + this.uvMap);

      if (primUsdShader != undefined) {
        usdShader.setItem('inputs:st', primUsdShader.getItem("outputs:result"));
      } //DEBUG ERRROR FOLLOWING DESTOY EVERYTHING               //return;


      usdShader.setItem("inputs:wrapS", "repeat");
      usdShader.setItem("inputs:wrapT", "repeat"); /////////

      if (this.type == "float") {
        usdShader.setItem('outputs:r', ValueType.float);
        if (usdShader.getItem('outputs:r').valueType.name != this.type) usdShader.getItem('outputs:r').valueTypeStr = this.valueTypeStr;
        this.usdAtt = usdShader.getItem('outputs:r');
      } else {
        usdShader.setItem('outputs:rgb'); //, ValueType.vec3f          

        if (usdShader.getItem('outputs:rgb').valueTypeToString() != this.type) usdShader.getItem('outputs:rgb').valueTypeStr = this.type;
        this.usdAtt = usdShader.getItem('outputs:rgb');
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
  };
}

function Material(material) {
  this.createInputs = function () {
    let defDiffuseColor = this.material.color;
    let defRoughness = this.material.roughness;
    let diffuse = this.material.color;
    let specular = 1 - this.material.metalness;
    let emissive = this.material.emissive; //Vec3

    if (this.material.clearcoat) {
      var clearcoat = this.material.clearcoat;
      var clearcoatRoughness = this.material.clearcoatRoughness;
    } else {
      var clearcoat = 0;
      var clearcoatRoughness = 0;
    }

    let metallic = this.material.metalness;
    let roughness = this.material.roughness;
    let opacity = this.material.opacity;
    let opacityThreshold = this.material.alphaTest;
    opacityThreshold = 0;
    let ior = this.material.ior;
    let useSpecular = 0; //0 if metallic > 0.0 else 1

    if (ior == undefined) ior = 0;
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
      'roughness': new ShaderInput('float', 'roughness', roughness) //'specularColor':        new ShaderInput('color3f', 'specularColor', specular),
      //'useSpecularWorkflow':  new ShaderInput('int', 'useSpecularWorkflow', useSpecular)

    };
  };

  this.exportPbrShader = function (usdMaterial) {
    let usdShader = usdMaterial.createChild('pbr', ClassType.Shader);
    usdShader.setItem("info:id", "UsdPreviewSurface");

    for (const [key, value] of Object.entries(this.inputs)) value.exportShaderInput(this, usdShader);

    usdShader.setItem('outputs:displacement', null, ValueType.token);
    usdShader.setItem('outputs:surface', null, ValueType.token);
    return usdShader;
  };

  this.getUVMaps = function () {
    let uvMaps = [];

    for (const [key, value] of Object.entries(this.inputs)) {
      if (value.uvMap != null) uvMaps.push(value.uvMap);
    }

    return uvMaps;
  };

  this.exportPrimlet = function (usdMaterial) {
    let uvMaps = this.getUVMaps();

    for (let i = 0; i < uvMaps.length; i++) {
      let map = uvMaps[i];
      usdMaterial.setItem('inputs:frame:stPrimlet_' + map, map);
      let usdShader = usdMaterial.createChild('primlet_' + map, ClassType.Shader);
      usdShader.setItem('info:id', 'UsdPrimletReader_float2');
      usdShader.getItem('info:id').addQualifier('uniform');
      usdShader.setItem('inputs:fallback', new THREE.Vector2(0., 0.));
      usdShader.setItem("inputs:letname", usdMaterial.getItem('inputs:frame:stPrimlet_' + map));
      usdShader.setItem("outputs:result");
      usdShader.getItem("outputs:result").valueTypeStr = "float2";
    }
  };

  this.exportInputs = function (usdMaterial) {
    for (const [key, value] of Object.entries(this.inputs)) {
      value.exportShader(this, usdMaterial);
    }
  };

  this.setupBakeDiffuse = function (asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
      {
        this.inputs.diffuseColor.image = asset;
        this.inputs.diffuseColor.uvMap = object.bakeUVMap;
        return true;
      }

    return false;
  };

  this.setupBakeNormal = function (asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
      {
        this.inputs.normal.image = asset;
        this.inputs.normal.uvMap = object.bakeUVMap;
        return true;
      }

    return false;
  };

  this.setupBakeMetalness = function (asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
      {
        this.inputs.metallic.image = asset;
        this.inputs.metallic.uvMap = object.bakeUVMap;
        return true;
      }

    return false;
  };

  this.setupBakeRoughness = function (asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
      {
        this.inputs.roughness.image = asset;
        this.inputs.roughness.uvMap = object.bakeUVMap;
        return true;
      }

    return false;
  };

  this.setupBakeAo = function (asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
      {
        this.inputs.occlusion.image = asset;
        this.inputs.occlusion.uvMap = object.bakeUVMap;
        return true;
      }

    return false;
  };

  this.setupBakeAlpha = function (asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
      {
        this.inputs.opacity.image = asset;
        this.inputs.opacity.uvMap = object.bakeUVMap;
        return true;
      }

    return false;
  };

  this.setupBakeEmissive = function (asset, object) {
    if (true) ////CHECK IF NODE GOT TEXTURE DEBUG DEBUG?
      {
        this.inputs.emissiveColor.image = asset;
        this.inputs.emissiveColor.uvMap = object.bakeUVMap;
        return true;
      }

    return false;
  };

  this.exportUsd = function (parent) {
    this.usdMaterial = parent.createChild(this.name, ClassType.Material);
    this.exportPrimlet(this.usdMaterial);
    this.exportInputs(this.usdMaterial);
    let pbrShader = this.exportPbrShader(this.usdMaterial);
    this.usdMaterial.setItem("outputs:displacement", pbrShader.getItem("outputs:displacement"));
    this.usdMaterial.setItem("outputs:surface", pbrShader.getItem("outputs:surface"));
  };

  if (material.type != "MeshPhysicalMaterial") {//console.error("Only MeshPhysicalMaterial supported!!!")
  }

  this.material = material;
  this.usdMaterial = null;
  this.name = material.name.replace(/[^a-zA-Z0-9]+/g, ''); //.replace('.', '_');

  this.outputnode = null; //???????

  this.shaderNode = null; //??????

  this.inputs = {};
  this.createInputs();
}

function USDObject(object, scene, type = 'EMPTY') {
  this.name = object.name.replace(/[^a-zA-Z0-9]+/g, ''); //.replace('.', '_')

  this.object = object;
  this.scene = scene;
  this.type = type;
  this.mesh = null;
  this.parent = null;
  this.children = [];
  this.materials = [];
  this.bakeUVMap = '';
  this.hidden = false;
  this.collection = null;

  this.hasParent = function () {
    return this.object.parent.type != "Scene";
  };

  this.setAsMesh = function () {
    if (this.type != "Mesh" && this.object.type == "Mesh") this.type = "Mesh";
    this.createMaterials();
    this.createMesh();
  };

  this.createMaterials = function () {
    if (this.object.material.name == "") //this.object.material.name=this.object.material.type;
      this.object.material.name = this.object.uuid.replace(/[^a-zA-Z]+/g, ''); //.replace('-', '');

    this.materials = []; //DEBUG T

    if (this.scene.exportMaterials || Object.keys(this.scene.materials).length < 999) {
      //8 is the last
      let material;
      this.object.material.name = this.object.material.uuid.replace(/[^a-zA-Z]+/g, '');
      if (this.scene.materials[this.object.material.name]) material = this.scene.materials[this.object.material.name];else {
        material = new Material(this.object.material);
        this.scene.materials[this.object.material.name] = material;
      }
      this.materials.push(material);
    }
  };

  this.createMesh = function () {
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
  };

  this.bakeToFile = function (type, file) {
    let texUrl;
    let image; //New Parsing technology :D

    switch (type) {
      case "diff":
        texUrl = this.object.material.map.image.src;
        image = this.object.material.map.image; //image.name=file;

        this.materials[0].inputs.diffuseColor.image = file; //SET REFERENCE NAME IN MATERIAL

        break;

      case "norm":
        texUrl = this.object.material.normalMap.image.src;
        image = this.object.material.normalMap.image;
        image.scale = this.object.material.normalScale.x; //image.name=file;

        this.materials[0].inputs.normal.image = file; //SET REFERENCE NAME IN MATERIAL

        break;

      case "metal":
        texUrl = this.object.material.metalnessMap.image.src;
        image = this.object.material.metalnessMap.image; //image.name=file;

        this.materials[0].inputs.metallic.image = file; //SET REFERENCE NAME IN MATERIAL

        break;

      case "rough":
        texUrl = this.object.material.roughnessMap.image.src;
        image = this.object.material.roughnessMap.image; //image.name=file;

        this.materials[0].inputs.roughness.image = file; //SET REFERENCE NAME IN MATERIAL

        break;

      case "ao":
        texUrl = this.object.material.aoMap.image.src;
        image = this.object.material.aoMap.image; //image.name=file;

        this.materials[0].inputs.occlusion.image = file; //SET REFERENCE NAME IN MATERIAL

        break;

      case "alpha":
        //texUrl=this.object.material.alphaMap.image.src;
        //image=this.object.material.alphaMap.image;
        texUrl = this.object.material.map.image.src;
        image = this.object.material.map.image; //image.name=file;

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
        image = this.object.material.emissiveMap.image; //image.name=file;

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

    for (let i = 0; i < this.scene.textureFilePaths.length; i++) if (this.scene.textureFilePaths[i][1] === file) add = false;

    if (add) this.scene.textureFilePaths.push([image, file]);
    /*
    self.setupBakeImage(file)
    bpy.ops.object.bake(type=type, use_clear=True)
    self.bakeImage.save()
    self.scene.textureFilePaths.append(file)
    self.cleanupBakeImage()
    */
  };

  this.bakeDiffuseTexture = function () {
    if (this.materials[0] == undefined) return;
    let bake = false;
    let asset = this.object.material.map.uuid + "Diffuse.png";
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeDiffuse(asset, this);

    if (bake) {
      this.bakeToFile('diff', asset);
    }
  };

  this.bakeNormalTexture = function () {
    if (this.materials[0] == undefined) return;
    let bake = false;
    let asset = this.object.material.normalMap.uuid + "Normal.png";
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeNormal(asset, this);

    if (bake) {
      this.bakeToFile('norm', asset);
    }
  };

  this.bakeMetalnessTexture = function () {
    if (this.materials[0] == undefined) return;
    let bake = false;
    let asset = this.object.material.metalnessMap.uuid + "Metallic.png";
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeMetalness(asset, this);

    if (bake) {
      this.bakeToFile('metal', asset);
    }
  };

  this.bakeRoughnessTexture = function () {
    if (this.materials[0] == undefined) return;
    let bake = false;
    let asset = this.object.material.roughnessMap.uuid + "Roughness.png";
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeRoughness(asset, this);

    if (bake) {
      this.bakeToFile('rough', asset);
    }
  };

  this.bakeAoTexture = function () {
    if (this.materials[0] == undefined) return;
    let bake = false;
    let asset = this.object.material.aoMap.uuid + "AmbientOcclusion.png";
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeAo(asset, this);

    if (bake) {
      this.bakeToFile('ao', asset);
    }
  };

  this.bakeAlphaTexture = function () {
    if (this.materials[0] == undefined && this.materials[0].material != undefined) return;
    let bake = false;
    let asset = this.object.material.map.uuid + "Alpha.png"; //let asset=this.object.material.map.uuid+"Diffuse.png"//Diffuse not Alpha, therefore no additional adding

    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeAlpha(asset, this);

    if (bake) {
      this.bakeToFile('alpha', asset);
    }
  };

  this.bakeEmissiveTexture = function () {
    if (this.materials[0] == undefined) return;
    let bake = false;
    let asset = this.object.material.emissiveMap.uuid + "Emissive.png";
    asset = asset.replace(/-/g, "");
    bake = this.materials[0].setupBakeEmissive(asset, this);

    if (bake) {
      this.bakeToFile('emissive', asset);
    }
  };

  this.bakeTextures = function () {
    /*
    this.setupBakeOutputNodes()
    following Line is out of function setupBakeOutputNodes
    */
    this.bakeUVMap = "UVMap"; //DEBUG M

    if (this.scene.bakeTextures) {
      if (this.object.material.map != null) {
        this.bakeDiffuseTexture(); //if(this.object.material.alphaMap!=null)

        if (this.object.material.transparent) this.bakeAlphaTexture();
      }

      if (this.object.material.normalMap != null) this.bakeNormalTexture();
      if (this.object.material.metalnessMap != null) this.bakeMetalnessTexture();
      if (this.object.material.roughnessMap != null) this.bakeRoughnessTexture();
      if (this.object.material.aoMap != null) this.bakeAoTexture();
      if (this.object.material.emissiveMap) this.bakeEmissiveTexture(); //emissive, alphaMap? 

      /*
      self.bakeEmissionTexture()
      self.bakeRoughnessTexture()
      self.bakeOpacityTexture()
      self.bakeMetallicTexture()
      */
    }

    if (this.scene.bakeAO) {
      self.bakeOcclusionTexture();
    } //self.cleanupBakeOutputNodes()

  };

  this.getTransform = function () {
    this.object.updateMatrix(); // TODO: use actual matrix from the scene root node. will require more work though,
    // Three input scene has multiple stacked empty nodes under the root node.
    // The USDZ Exporter doesn't handle this currently.

    if (this.parent == undefined) {
      const scaleMatrix = new THREE.Matrix4().makeScale(this.scene.scale, this.scene.scale, this.scene.scale);
      const rotateMatrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(this.scene.rotation[0], this.scene.rotation[1], this.scene.rotation[2]));
      return convertThreeMatrix(scaleMatrix.multiply(rotateMatrix));
    }

    return convertThreeMatrix(new THREE.Matrix4().compose(this.object.position, this.object.quaternion, this.object.scale));
  };

  this.exportUsd = function (parent) {
    let usdObj = {}; // Export Ridgid Object / creating USDPRIM

    usdObj = parent.createChild(this.name, ClassType.Xform);
    usdObj.setItem("xformOp:transform", this.getTransform());
    usdObj.getItem("xformOp:transform").addQualifier('custom');
    usdObj.setItem("xformOpOrder", ["xformOp:transform"]);
    usdObj.getItem("xformOpOrder").addQualifier('uniform');
    if (this.type == "Mesh") this.exportMesh(usdObj);

    for (let i = 0; i < this.children.length; i++) {
      //HELP
      this.children[i].exportUsd(usdObj);
    }

    if (this.collection != null && this.scene.usdCollections[this.collection.name] != undefined) {
      usdObj.metadata['inherits'] = this.scene.usdCollections[this.collection.name];
      usdObj.metadata['instanceable'] = true;
    }
  };

  this.exportMaterialSubsets = function (usdMesh) {
    if (this.materials.length == 1) {
      usdMesh.setItem('material:binding', this.materials[0].usdMaterial, ValueType.token);
      usdMesh.getItem("material:binding").addQualifier('uniform'); //                self.writeUsdRelationship(attribute)!!!!!!!!!!!
    } else if (this.materials.length > 1) console.warn("exportMaterialSubsets: MultiMat not supported yet :p(not even by Three...");
  };

  this.exportMesh = function (usdObj) {
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
  };
} ///////////////////////////////////////////////////////////


function UsdData() {
  this.metadata = {};
  this.children = [];
  this.attributes = [];
  this.pathIndex = 0;
  this.pathJump = -1;

  this.setItem = function (key, value) {
    this.metadata[key] = value;
  };

  this.toString = function () {
    return '#usda 1.0\n' + this.metadataToString() + "\n";
  };

  this.metadataToString = function () {
    let ret = '(\n';
    Object.entries(this.metadata).forEach(([key, value]) => {
      ret += `${key} = `;
      ret += JSON.stringify(value);
      ret += '\n';
    });
    ret += ')\n';
    return ret;
  };

  this.addChild = function (child) {
    child.parent = this;
    this.children.push(child);
    return child;
  };

  this.createChild = function (name, type) {
    return this.addChild(new UsdPrim(name, type));
  }; //for Crating


  this.updatePathIndices = function () {
    let pathIndex = 1;

    for (let i = 0; i < this.children.length; i++) {
      pathIndex = this.children[i].updatePathIndices(1); //pathIndex
    }
  };

  this.getPathJump = function () {
    if (this.children.length > 0) this.pathJump = -1;else this.pathJump = -2;
    return this.pathJump;
  };
}

function UsdPrim(name, type) {
  this.name = name;
  this.specifierType = SpecifierType.Def;
  this.classType = type;
  this.metadata = {};
  this.attributes = [];
  this.children = [];
  this.parent = null;
  this.pathIndex = -1;
  this.pathJump = -1;
  this.isUsdPrim = 1;

  this.setItem = function (key, item, type) {
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
    if (item == null) this.createAttribute(key, null, type);else {
      this.createAttribute(key, item);
    }
  };

  this.getItem = function (key) {
    for (let i = 0; i < this.attributes.length; i++) {
      if (this.attributes[i].name == key) return this.attributes[i];
    }

    return null; //return next((att for att in self.attributes if att.name == key), None)
  };

  this.createAttribute = function (name, value = null, type = ValueType.Invalid) {
    return this.addAttribute(new UsdAttribute(name, value, type));
  };

  this.addAttribute = function (attribute) {
    attribute.parent = this;
    this.attributes.push(attribute);
    return attribute;
  };

  this.addChild = function (child) {
    child.parent = this;
    this.children.push(child);
    return child;
  };

  this.createChild = function (name, type) {
    return this.addChild(new UsdPrim(name, type));
  };

  this.getChild = function (name) {
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].name === name) {
        return this.children[i];
      }
    }

    return null;
  };

  this.toString = function () {
    let ret = name;
    ret += "huihui";
    return ret;
  }; //for Crating


  this.updatePathIndices = function (pathIndexx) {
    this.pathIndex = pathIndexx;
    pathIndexx += 1;

    for (let i = 0; i < this.children.length; i++) pathIndexx = this.children[i].updatePathIndices(pathIndexx);

    for (let i = 0; i < this.attributes.length; i++) {
      this.attributes[i].pathIndex = pathIndexx;
      pathIndexx += 1;
    } //this.pathIndex=0;


    return pathIndexx;
  };

  this.getPathJump = function () {
    if (this.parent == undefined || this.parent.children[this.parent.children.length - 1] === this && this.parent.attributes.length == 0) this.pathJump = -1;else this.pathJump = this.countItems() + 1;
    return this.pathJump;
  };

  this.countItems = function () {
    let count = this.attributes.length + this.children.length;

    for (let i = 0; i < this.children.length; i++) count += this.children[i].countItems();

    return count;
  };
}

function UsdAttribute(name = '', value = null, type = ValueType.Invalid) {
  this.isRelationship = function () {
    if (this.value && this.value.isUsdPrim === 1) return true;
    return false;
  };

  this.getValueType = function () {
    if (this.isConnection()) {
      //return getValueType(this.value)
      return this.value.getValueType(); //this line is the real //DEBUG
    } else if (this.isRelationship()) return ValueType.Invalid;

    return getValueType(this.value);
  };

  this.isConnection = function () {
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
  };

  this.addQualifier = function (qualifier) {
    this.qualifiers.push(qualifier);
  };

  this.setItem = function (key, value) {
    this.metadata[key] = value;
  };

  this.valueTypeToString = function () {
    if (this.valueTypeStr != undefined) {
      let ret = this.valueTypeStr;
      if (this.isArray()) ret += "[]";
      return ret;
    }

    let ret = ValueType.getName(this.valueType);
    if (this.isArray()) ret += "[]";
    return ret;
  }; //CHeck for unproblematic export for last Prims if last Attribute is pathJump=-2 and if not => :) analyze if condidition


  this.getPathJump = function () {
    this.pathJump = 0;

    if (this.parent != undefined && this.parent.attributes[this.parent.attributes.length - 1] === this) {
      //DEBUG DEBUG DEBUG this line may indicates ERROR but LEADS to ERROR but is ORIGINALLY SO MAY KEEP!!!!
      this.pathJump = -2;
    }

    return this.pathJump;
  };

  this.isArray = function () {
    return Array.isArray(this.value);
  };

  this.name = name;
  this.value = value;
  this.frames = [];
  this.qualifiers = [];
  this.metadata = {};
  this.valueType = type;
  this.valueTypeStr = null;
  this.parent = null;
  this.pathIndex = -1;
  this.pathJump = 0;
  this.isUsdAttribue = 1;
  if (type == ValueType.Invalid) this.valueType = this.getValueType(); //maybe do Debugging here for TypeShit

  if (this.isRelationship()) this.valueTypeStr = 'rel';
}

function consoleHex(buff) {
  if (true) //DEBUG OFF
    return;
  const view = new DataView(buff);
  let out = "";

  for (let i = 0; i < view.byteLength; i++) if (view.getUint8(i) > 31 && 127 > view.getUint8(i)) out += String.fromCharCode(view.getUint8(i).toString());else out += "\\x" + view.getUint8(i).toString(16);
}

function Crate(file) {
  this.textureFilePaths = file;
  this.version = 6;
  this.toc = [];
  this.tokenMap = {};
  this.tokens = [];
  this.strings = [];
  this.fields = [];
  this.reps = [];
  this.repsMap = {};
  this.fsets = [];
  this.paths = [];
  this.specs = [];
  this.specsMap = {};
  this.writenData = {};
  this.framesRef = -1;
  this.usdc = "";
  this.buffer = new ArrayBuffer(2);
  this.lseek = 0;

  this.writeInt = function (num, sizeInBytes, byteOrder = true
  /*true=littleE*/
  , signed = false) {
    if (signed) console.warn("WriteInt for signed Integers not implemented!!");
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
    } else if (sizeInBytes * 8 == 32) {
      if (!signed) view.setUint32(0, num, byteOrder); // byteOffset = 0; litteEndian = true
      else view.setInt32(0, num, byteOrder); // byteOffset = 0; litteEndian = true

    } else if (sizeInBytes * 8 == 16) {
        if (!signed) view.setUint16(0, num, byteOrder); // byteOffset = 0; litteEndian = true
        else view.setInt16(0, num, byteOrder);
      } else if (sizeInBytes * 8 == 8) if (!signed) view.setUint8(0, num, byteOrder);else view.setInt8(0, num, byteOrder);

    this.appendBuffer(arr);
    return arr;
  };

  this.writeInt32Compressed = function (data) {
    let compi = new lz4();
    let buffer = compi.encode(usdInt32Compress(data)); //DEBUG SPEED
    //buffer=compi.encode(usdInt32Compress([...data]));

    this.writeInt(buffer.byteLength, 8);
    this.appendBuffer(buffer);
  };

  this.write = function (str) {
    let buf = new ArrayBuffer(str.length); // 2 bytes for each char

    let bufView = new Uint8Array(buf);

    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }

    this.appendBuffer(buf);
    return buf;
  }; //https://stackoverflow.com/questions/51452398/how-to-use-arraybuffers-with-dataviews-in-javascript


  this.writeUsd = function (usdData) {
    usdData.updatePathIndices();
    this.writeBootStrap(); //Add Root Metadata

    let fset = []; //fieldSet

    for (const [name, value] of Object.entries(usdData.metadata)) {
      if (!isNaN(value)) fset.push(this.addFieldDouble(name, value));else fset.push(this.addField(name, value));
    }

    if (usdData.children.length > 0) {
      let tokens = [];

      for (let i = 0; i < usdData.children.length; i++) tokens.push(usdData.children[i].name);

      fset.push(this.addFieldTokenVector('primChildren', tokens));
    }

    fset = this.addFieldSet(fset);
    usdData.pathIndex = this.addSpec(fset, SpecType.PseudoRoot);
    let nameToken = this.getTokenIndex('');
    let pathJump = usdData.getPathJump();
    this.addPath(usdData.pathIndex, nameToken, pathJump, false);

    for (let i = 0; i < usdData.children.length; i++) {
      this.writeUsdPrim(usdData.children[i]);
    }

    this.writeSections();
    this.writeTableOfContents();
    return this.generateZip();
  };

  this.writeSections = function () {
    this.writeTokensSection();
    this.writeStringsSection();
    this.writeFieldsSection();
    this.writeFieldSetsSection();
    this.writePathsSection();
    this.writeSpecsSection();
  };

  this.writeTokensSection = function () {
    //DEBUG:
    this.tokens[4] = "Blender USDZ Plugin"; //NO: this.tokens[7]="Cube"

    let start = this.lseek;
    this.writeInt(this.tokens.length, 8);
    let buffer = "";

    for (let i = 0; i < this.tokens.length; i++) buffer += this.tokens[i] + "\0";

    let bufferLength = buffer.length;
    let buf = new ArrayBuffer(bufferLength); //+this.tokens.length // 2 bytes for each char

    let bufView = new Uint8Array(buf);

    for (let i = 0, strLen = buffer.length; i < strLen; i++) {
      bufView[i] = buffer.charCodeAt(i);
    } //buffer=buf;


    buffer = bufView;
    consoleHex(buf);
    this.writeInt(bufferLength, 8);
    let compi = new lz4();
    let compbuffer = compi.encode(buffer);
    consoleHex(compbuffer);
    this.writeInt(compbuffer.byteLength, 8); ////DEBUG
    //this.writeInt(65535, 4)

    this.appendBuffer(compbuffer); //this.writeInt(65535, 4)

    let size = this.lseek - start;
    this.toc.push(['TOKENS', start, size]);
  };

  this.writeStringsSection = function () {
    let start = this.lseek;
    this.writeInt(this.strings.length, 8);

    for (let i = 0; i < this.strings.length; i++) {
      this.writeInt(this.strings[i], 4);
    }

    let size = this.lseek - start;
    this.toc.push(['STRINGS', start, size]);
  };

  this.writeFieldsSection = function () {
    let start = this.lseek;
    this.writeInt(this.fields.length, 8);
    this.writeInt32Compressed(this.fields);
    let compi = new lz4();
    let buffer = compi.encode(encodeInts(this.reps, 8));
    this.writeInt(buffer.byteLength, 8);
    this.appendBuffer(buffer);
    let size = this.lseek - start;
    this.toc.push(['FIELDS', start, size]);
  };

  this.writeFieldSetsSection = function () {
    let start = this.lseek;
    this.writeInt(this.fsets.length, 8);
    this.writeInt32Compressed(this.fsets);
    let size = this.lseek - start;
    this.toc.push(['FIELDSETS', start, size]);
  };

  this.writePathsSection = function () {
    let start = this.lseek;
    let paths = [];
    let tokens = [];
    let jumps = [];

    for (let i = 0; i < this.paths.length; i++) {
      paths.push(this.paths[i][0]);
      tokens.push(this.paths[i][1]);
      jumps.push(this.paths[i][2]);
    }

    this.writeInt(this.paths.length, 8);
    this.writeInt(this.paths.length, 8);
    this.writeInt32Compressed(paths);
    this.writeInt32Compressed(tokens);
    this.writeInt32Compressed(jumps);
    let size = this.lseek - start;
    this.toc.push(['PATHS', start, size]);
  };

  this.writeSpecsSection = function () {
    let start = this.lseek;
    let paths = [];
    let fsets = [];
    let types = [];

    for (let i = 0; i < this.specs.length; i++) {
      paths.push(this.specs[i][0]);
      fsets.push(this.specs[i][1]);
      types.push(this.specs[i][2]);
    }

    this.writeInt(this.specs.length, 8);
    this.writeInt32Compressed(paths);
    this.writeInt32Compressed(fsets);
    this.writeInt32Compressed(types);
    let size = this.lseek - start;
    this.toc.push(['SPECS', start, size]);
  };

  this.writeUsdPrim = function (usdPrim) {
    let fset = [];
    fset.push(this.addField('specifier', usdPrim.specifierType));

    if (usdPrim.classType != undefined) {
      fset.push(this.addField("typeName", ClassType.getName(usdPrim.classType)));
    }

    for (const [key, value] of Object.entries(usdPrim.metadata)) {
      console.error("primitive Metadata not supported yet");
    }

    if (usdPrim.attributes.length > 0) {
      let tokens = [];

      for (let i = 0; i < usdPrim.attributes.length; i++) tokens.push(usdPrim.attributes[i].name);

      fset.push(this.addFieldTokenVector('properties', tokens));
    }

    if (usdPrim.children.length > 0) {
      let tokens = [];

      for (let i = 0; i < usdPrim.children.length; i++) tokens.push(usdPrim.children[i].name);

      fset.push(this.addFieldTokenVector('primChildren', tokens));
    }

    fset = this.addFieldSet(fset);
    usdPrim.pathIndex = this.addSpec(fset, SpecType.Prim);
    let nameToken = this.getTokenIndex(usdPrim.name);
    let pathJump = usdPrim.getPathJump(); // Add Prim Path

    this.addPath(usdPrim.pathIndex, nameToken, pathJump, false); // Write Prim Children
    //this.writeInt(65535,4)

    for (let i = 0; i < usdPrim.children.length; i++) this.writeUsdPrim(usdPrim.children[i]); // Write Prim Attributes


    for (let i = 0; i < usdPrim.attributes.length; i++) {
      if (usdPrim.attributes[i].isConnection()) this.writeUsdConnection(usdPrim.attributes[i]);else if (usdPrim.attributes[i].isRelationship()) this.writeUsdRelationship(usdPrim.attributes[i]);else this.writeUsdAttribute(usdPrim.attributes[i]);
    } //this.writeUsdAttribute(usdPrim.attributes[0])

    /*
        if(usdPrim.attributes.length>5)
            for(let i=3;i<4;i++)
                this.writeUsdAttribute(usdPrim.attributes[i])
    */

  };

  this.writeUsdAttribute = function (usdAtt) {
    let fset = [];
    let type = usdAtt.valueTypeToString();
    fset.push(this.addField('typeName', type));

    for (let i = 0; i < usdAtt.qualifiers.length; i++) {
      if (usdAtt.qualifiers[i] == "uniform") fset.push(this.addField('letiability', true, ValueType.letiability));else if (usdAtt.qualifiers[i] == "custom") fset.push(this.addField('custom', true));
    }

    for (const [name, value] of Object.entries(usdAtt.metadata)) {
      fset.push(this.addField(name, value));
    }

    if (usdAtt.value != undefined) {
      fset.push(this.addField('default', usdAtt.value, usdAtt.valueType));
    }

    fset = this.addFieldSet(fset);
    usdAtt.pathIndex = this.addSpec(fset, SpecType.Attribute);
    let nameToken = this.getTokenIndex(usdAtt.name);
    let pathJump = usdAtt.getPathJump();
    this.addPath(usdAtt.pathIndex, nameToken, pathJump, true);
  };

  this.writeUsdConnection = function (usdAtt) {
    let fset = [];
    let pathIndex = usdAtt.value.pathIndex;
    fset.push(this.addField('typeName', usdAtt.valueTypeToString())); //LASTDEBUG

    /*
    for(let i=0;i<usdAtt.value.qualifiers.length;i++){
        if(usdAtt.value.qualifiers[i]=='uniform')
            fset.push(this.addField('letiability', true, ValueType.letiability))
        else if(usdAtt.value.qualifiers[i]=='custom')
            fset.push(this.addField('custom', true))
    }
    */
    //console.error(usdAtt.value.qualifiers.length)

    if (usdAtt.value.qualifiers) for (let i = 0; i < usdAtt.value.qualifiers.length; i++) {
      if (usdAtt.value.qualifiers[i] == 'uniform') fset.push(this.addField('letiability', true, ValueType.letiability));else if (usdAtt.value.qualifiers[i] == 'custom') fset.push(this.addField('custom', true));
    }
    fset.push(this.addFieldPathListOp('connectionPaths', pathIndex));
    fset.push(this.addFieldPathVector('connectionChildren', pathIndex));
    fset = this.addFieldSet(fset);
    usdAtt.pathIndex = this.addSpec(fset, SpecType.Attribute);
    let nameToken = this.getTokenIndex(usdAtt.name);
    let pathJump = usdAtt.getPathJump();
    this.addPath(usdAtt.pathIndex, nameToken, pathJump, true);
  };

  this.writeUsdRelationship = function (usdAtt) {
    let fset = [];
    let pathIndex = usdAtt.value.pathIndex;
    fset.push(this.addField('letiability', true, ValueType.letiability)); //LASTDEBUG

    fset.push(this.addFieldPathListOp('targetPaths', pathIndex)); //LASTDEBUG

    fset.push(this.addFieldPathVector('targetChildren', pathIndex)); //LASTDEBUG

    fset = this.addFieldSet(fset);
    usdAtt.pathIndex = this.addSpec(fset, SpecType.Relationship);
    let nameToken = this.getTokenIndex(usdAtt.name);
    let pathJump = usdAtt.getPathJump();
    this.addPath(usdAtt.pathIndex, nameToken, pathJump, true);
  };

  this.addSpec = function (fset, sType) {
    let path = this.specs.length;
    this.specs.push([path, fset, sType]);
    this.specsMap[path] = [fset, sType];
    return path;
  };

  this.addFieldSet = function (fset) {
    let index = this.fsets.length;
    this.fsets = this.fsets.concat(fset);
    this.fsets.push(-1);
    return index;
  };

  this.addField = function (field, value, vType = ValueType.UnregisteredValue) {
    if (vType == ValueType.UnregisteredValue) vType = getValueType(value);

    if (vType == ValueType.token) {
      return this.addFieldToken(field, value);
    }

    if (vType == ValueType.asset) return this.addFieldAsset(field, value);
    if (vType == ValueType.TokenVector) return this.addFieldTokenVector(field, value);
    if (field == "specifier") return this.addFieldSpecifier(field, value);
    if (field == "letiability" || vType == ValueType.letiability) return this.addFieldletiability(field, value); ///hotfix: field should be = ValueType.letiability

    if (vType == ValueType.int) return this.addFieldInt(field, value);
    if (vType == ValueType.float) return this.addFieldFloat(field, value);
    let vTypeName = Object.keys(ValueType).find(key => ValueType[key] === vType);
    if (vTypeName.substring(0, 3) == 'vec') return this.addFieldVector(field, value, vType);
    if (vTypeName.substring(0, 6) == 'matrix') return this.addFieldMatrix(field, value, vType);
    if (vType == ValueType.bool) return this.addFieldBool(field, value);
    if (vType == ValueType.Dictionary) return this.addFieldDictionary(field, value); //print('type: ', vType.name, value)
    //return null;

    console.error("Error: TypeOf FieldItem not found!");
    return this.addFieldItem(field, vType, false, true, false, value);
  };

  this.addFieldAsset = function (field, data) {
    field = this.getTokenIndex(field);
    let token = this.getTokenIndex(data.replace('@', ''));
    return this.addFieldItem(field, ValueType.asset, false, true, false, token);
  };

  this.addFieldFloat = function (field, data) {
    var field = this.getTokenIndex(field);

    if (Array.isArray(data)) {
      var ref = this.getDataRefrence(data, ValueType.float);

      if (ref < 0) {
        ref = this.lseek;
        this.addWritenData(data, ValueType.float, ref);
        this.writeInt(data.length, 8);

        for (let i = 0; i < data.length; i++) //this.writeFloat(data[i]);
        this.writeInt(data[i]);
      }

      return this.addFieldItem(field, ValueType.float, true, false, false, ref);
    }

    let packStr = '<f';
    let s = struct(packStr);
    data = s.pack(data);
    let dv = new DataView(data, 0);
    data = dv.getInt32(0, true);
    return this.addFieldItem(field, ValueType.float, false, true, false, data);
  };

  this.addFieldVector = function (field, data, vType) {
    var field = this.getTokenIndex(field);
    let vTypeName = Object.keys(ValueType).find(key => ValueType[key] === vType);
    let packStr = '<' + vTypeName.substring(3, 5);

    if (Array.isArray(data)) {
      var ref = this.getDataRefrence(data, vType);

      if (ref < 0) {
        ref = this.lseek;
        this.addWritenData(data, vType, ref);
        this.writeInt(data.length, 8);
        let s = struct(packStr);

        for (let i = 0; i < data.length; i++) this.appendBuffer(s.pack(data[i].x, data[i].y, data[i].z));
      }

      return this.addFieldItem(field, vType, true, false, false, ref);
    } else {
      ref = this.getDataRefrence(data, vType);

      if (ref < 0) {
        ref = this.lseek;
        this.addWritenData(data, vType, ref);
        let s = struct(packStr);
        if (data.isVector2) this.appendBuffer(s.pack(data.x, data.y));

        if (data.isVector3) {
          this.appendBuffer(s.pack(data.x, data.y, data.z));
        }

        if (data.isVector4) this.appendBuffer(s.pack(data.x, data.y, data.z, data.w));
      }

      return this.addFieldItem(field, vType, false, false, false, ref);
    }
  };

  this.getTokenIndex = function (token) {
    if (this.tokenMap[token] == undefined) {
      this.tokenMap[token] = this.tokens.length;
      this.tokens.push(token);
    }

    return this.tokenMap[token];
  };

  this.getStringIndex = function (str) {
    let tokenIndex = this.getTokenIndex(str);
    if (!this.strings.includes(tokenIndex)) this.strings.push(tokenIndex);
    return this.strings.indexOf(tokenIndex);
  };

  this.addFieldInt = function (field, data) {
    var field = this.getTokenIndex(field);

    if (Array.isArray(data)) {
      let compress = data.length >= 16;
      compress = false;
      var ref = this.getDataRefrence(data, ValueType.int);

      if (ref < 0) {
        var ref = this.lseek;
        this.addWritenData(data, ValueType.int, ref);
        this.writeInt(data.length, 8);

        if (compress) {
          this.writeInt32Compressed(data);
        } else {
          for (let i = 0; i < data.length; i++) {
            // TODO(fleroviux):
            this.writeInt(data[i], 4, true); // this.writeInt(data[i], 4, signed = true)
          }
        }
      }

      return this.addFieldItem(field, ValueType.int, true, false, compress, ref);
    }

    return this.addFieldItem(field, ValueType.int, false, true, false, data);
  };

  this.addFieldSpecifier = function (field, spec) {
    field = this.getTokenIndex(field);
    return this.addFieldItem(field, ValueType.Specifier, false, true, false, spec);
  };

  this.addFieldMatrix = function (field, data, vType) {
    field = this.getTokenIndex(field);
    var ref = this.getDataRefrence(data, vType); //ADDED ALWAYS TRUE DUE TO PROBLEMS IN HASHFunc: this.getDataRefrence(data, vType) with ARRAYS!! #DEBUG

    if (1 || ref < 0) {
      ////!!!!!!!!!!!!!!!!!!
      ref = this.lseek;
      this.addWritenData(data, vType, ref);
      let vTypeName = Object.keys(ValueType).find(key => ValueType[key] === vType);
      let packStr = '<' + vTypeName.substring(6, 8);

      if (Array.isArray(data)) {
        console.error("Mat4 Array not supported yet");
        this.writeInt(data.length, 8);
      } else {
        let s = struct(packStr);

        for (let i = 0; i < Math.sqrt(data.elements.length); i++) {
          let row = data.elements.slice(i * Math.sqrt(data.elements.length), i * Math.sqrt(data.elements.length) + Math.sqrt(data.elements.length));
          this.appendBuffer(s.pack(row[0], row[1], row[2], row[3]));
        }
      }
    }

    if (Array.isArray(data)) return this.addFieldItem(field, vType, false, true, false, ref);
    return this.addFieldItem(field, vType, false, false, false, ref);
  };

  this.addFieldDictionary = function (field, data) {
    var field = this.getTokenIndex(field);
    var ref = this.lseek;
    this.writeInt(Object.keys(data).length, 8);

    for (const [key, value] of Object.entries(data)) {
      this.writeInt(this.getStringIndex(key), 4);
      this.writeInt(8, 8);
      this.writeInt(this.getStringIndex(value), 4);
      this.writeInt(1074397184, 4);
    }

    return this.addFieldItem(field, ValueType.Dictionary, false, false, false, ref);
  };

  this.addFieldletiability = function (field, data) {
    field = this.getTokenIndex(field);
    if (data) data = "1";else data = "0";
    return this.addFieldItem(field, ValueType.letiability, false, true, false, data);
  };

  this.addFieldBool = function (field, data) {
    var field = this.getTokenIndex(field);
    if (data) data = 1;else data = 0;
    return this.addFieldItem(field, ValueType.bool, false, true, false, data);
  };

  this.addFieldToken = function (field, data) {
    var field = this.getTokenIndex(field);

    if (Array.isArray(data)) {
      let tokens = [];

      for (let i = 0; i < data.length; i++) {
        let token = data[i].replace('"', '');
        tokens.push(this.getTokenIndex(token));
      }

      var ref = this.getDataRefrence(tokens, ValueType.token);

      if (ref < 0) {
        ref = this.lseek;
        this.addWritenData(tokens, ValueType.token, ref);
        this.writeInt(tokens.length, 8);

        for (let i = 0; i < tokens.length; i++) {
          this.writeInt(tokens[i], 4);
        }
      }

      return this.addFieldItem(field, ValueType.token, true, false, false, ref);
    }

    let token = this.getTokenIndex(data.replace('"', ''));
    return this.addFieldItem(field, ValueType.token, false, true, false, token);
  };

  this.addFieldTokenVector = function (field, tokens) {
    field = this.getTokenIndex(field);
    let data = [];

    for (let i = 0; i < tokens.length; i++) {
      tokens[i] = tokens[i].replace('"', '');
      data.push(this.getTokenIndex(tokens[i]));
    }

    var ref = this.getDataRefrence(data, ValueType.TokenVector);

    if (ref < 0) {
      ref = this.lseek;
      this.addWritenData(data, ValueType.TokenVector, ref);
      this.writeInt(data.length, 8);

      for (let i = 0; i < data.length; i++) {
        this.writeInt(data[i], 4);
      }

      for (let i = 0; i < 4; i++) {
        this.write('\x00');
      }
    }

    return this.addFieldItem(field, ValueType.TokenVector, false, false, false, ref);
  };

  this.addFieldPathListOp = function (field, pathIndex) {
    field = this.getTokenIndex(field);
    var ref = this.lseek;
    let op = 259;
    this.writeInt(op, 8);
    this.write('\x00');
    this.writeInt(pathIndex, 4);
    return this.addFieldItem(field, ValueType.PathListOp, false, false, false, ref);
  };

  this.addFieldPathVector = function (field, pathIndex) {
    field = this.getTokenIndex(field);
    var ref = this.lseek;
    this.writeInt(1, 8);
    this.writeInt(pathIndex, 4);
    return this.addFieldItem(field, ValueType.PathVector, false, false, false, ref);
  };

  this.addWritenData = function (data, vType, ref) {
    //key = [data, vType]
    let dataHash = JSON.stringify(data) + "" + vType;
    let key = dataHash;
    this.writenData[key] = ref;
  };

  this.getDataRefrence = function (data, vType) {
    //key = [data, vType]
    let dataHash = JSON.stringify(data) + "" + vType;
    let key = dataHash;

    if (this.writenData[key] != undefined) {
      return this.writenData[key];
    }

    return -1;
  };
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


  const ARRAY_BIT = _jsbi.default.leftShift(_jsbi.default.BigInt(1), _jsbi.default.BigInt(63));

  const INLINE_BIT = _jsbi.default.leftShift(_jsbi.default.BigInt(1), _jsbi.default.BigInt(62));

  const COMPRESSED_BIT = _jsbi.default.leftShift(_jsbi.default.BigInt(1), _jsbi.default.BigInt(61));

  const PAYLOAD_MASK = _jsbi.default.subtract(_jsbi.default.leftShift(_jsbi.default.BigInt(1), _jsbi.default.BigInt(48)), _jsbi.default.BigInt(1));

  this.addFieldItem = function (field, vType, array, inline, compressed, payload = 0) {
    let repIndex = this.reps.length; // rep = (vType << 48) | (payload & PAYLOAD_MASK)

    let rep = _jsbi.default.bitwiseOr(_jsbi.default.leftShift(_jsbi.default.BigInt(vType), _jsbi.default.BigInt(48)), _jsbi.default.bitwiseAnd(_jsbi.default.BigInt(payload), PAYLOAD_MASK));

    if (array) {
      rep = _jsbi.default.bitwiseOr(rep, ARRAY_BIT);
    }

    if (compressed) {
      rep = _jsbi.default.bitwiseOr(rep, COMPRESSED_BIT);
    }

    if (inline) {
      rep = _jsbi.default.bitwiseOr(rep, INLINE_BIT);
    } //key= [field,rep];//hacky way of tuple :-D


    let key = field + "  " + rep;
    if (this.repsMap[key] != undefined) return this.repsMap[key];
    this.repsMap[key] = repIndex;
    this.fields.push(field);
    this.reps.push(rep);
    return repIndex;
  };

  this.getImage = async function (url) {
    let code;
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = 'blob';
    xhr.onload = await function (e) {
      code = xhr.response;
      return code;
    };

    xhr.onerror = function () {
      console.error("** An error occurred during the Texture requests");
    };

    xhr.send();
  };

  this.getIimage = async function (url) {
    let xhr = new XMLHttpRequest();
    return new Promise(function (resolve, reject) {
      xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
          if (xhr.status >= 300) {
            reject("Error, status code = " + xhr.status);
          } else {
            resolve(xhr.response);
          }
        }
      };

      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      xhr.send();
    });
  };

  this.redImgBlob = async function (image) {
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height); //operation Red

    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i + 1] = imageData.data[i];
      imageData.data[i + 2] = imageData.data[i];
    }

    ctx.putImageData(imageData, 0, 0);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        resolve(blob);
      });
    });
  };

  this.greenImgBlob = async function (image) {
    //image.width=512;
    //image.height=512;
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height); //operation Green

    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = imageData.data[i + 1];
      imageData.data[i + 2] = imageData.data[i + 1];
    }

    ctx.putImageData(imageData, 0, 0);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        resolve(blob);
      });
    });
  };

  this.blueImgBlob = async function (image) {
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height); //operation Blue

    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = imageData.data[i + 2];
      imageData.data[i + 1] = imageData.data[i + 2];
    }

    ctx.putImageData(imageData, 0, 0);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        resolve(blob);
      });
    });
  };

  this.normalImgBlob = async function (image) {
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height); //operation NormalScale

    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = (imageData.data[i] - 128) * image.scale + 128;
      imageData.data[i + 1] = (imageData.data[i + 1] - 128) * image.scale + 128;
    }

    ctx.putImageData(imageData, 0, 0);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        resolve(blob);
      });
    });
  };

  this.alphaImgBlob = async function (image) {
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height); //operation NormalScale

    const imageData = ctx.getImageData(0, 0, image.width, image.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = imageData.data[i + 3];
      imageData.data[i + 1] = imageData.data[i + 3];
      imageData.data[i + 2] = imageData.data[i + 3];
    }

    ctx.putImageData(imageData, 0, 0);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        resolve(blob);
      });
    });
  };

  this.imgBlob = async function (image) {
    let canvas = document.createElement('canvas');
    canvas.height = image.height;
    canvas.width = image.width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        resolve(blob);
      });
    });
  };

  this.generateZip = async function () {
    // TODO: write uncompressed Zip container directly instead of relying on JSZip,
    // which is designed to be general purpose. This could hypothetically be faster.
    let zip = new JSZip();
    zip.file("untitled.usdc", this.buffer);

    for (let i = 0; i < this.textureFilePaths.length; i++) {
      let image = this.textureFilePaths[i][0];
      let name = this.textureFilePaths[i][1];
      let blob;
      if (name.substring(name.length - 6, name.length - 4) == "on") //RED CHANNEL ambient occ
        blob = await this.redImgBlob(image);else if (name.substring(name.length - 6, name.length - 4) == "ss") //Green Channel Roughness
        blob = await this.greenImgBlob(image);else if (name.substring(name.length - 6, name.length - 4) == "ic") //Blue Channel Metallic
        blob = await this.blueImgBlob(image);else if (name.substring(name.length - 6, name.length - 4) == "al") //Normal Scale
        blob = await this.normalImgBlob(image);else if (name.substring(name.length - 6, name.length - 4) == "ha") //Alpha Map from Diffuse
        blob = await this.alphaImgBlob(image);else blob = await this.imgBlob(image);
      zip.file(name, blob);
    }

    return zip.generateAsync({
      type: "blob",
      mimeType: "model/vnd.usdz+zip"
    });
  };

  this.appendBuffer = function (newBuff) {
    while (this.buffer.byteLength < this.lseek + newBuff.byteLength) {
      let tmp = new Uint8Array(this.buffer.byteLength * 2);
      tmp.set(new Uint8Array(this.buffer), 0);
      this.buffer = tmp;
    }

    this.buffer.set(new Uint8Array(newBuff), this.lseek);
    this.lseek += newBuff.byteLength;
  };

  this.updateToc = function (toc) {
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
  };

  this.addPath = function (path, token, jump, prim) {
    if (prim) token *= -1;
    this.paths.push([path, token, jump]);
  };

  this.writeTableOfContents = function () {
    let tocStart = this.lseek;
    this.writeInt(this.toc.length, 8);

    for (let i = 0; i < this.toc.length; i++) {
      this.write(unescape(encodeURIComponent(this.toc[i][0]))); //this.write(this.toc[i][0])

      let spaces = 16 - this.toc[i][0].length;

      for (let j = 0; j < spaces; j++) {
        this.write('\x00');
      }

      this.writeInt(this.toc[i][1], 8);
      this.writeInt(this.toc[i][2], 8);
    }

    this.updateToc(tocStart);
  };

  this.writeBootStrap = function (tocOffset = 0) {
    this.write("PXR-USDC");
    this.write('\x00\x07\x00\x00\x00\x00\x00\x00');
    this.writeInt(tocOffset, 8);

    for (let i = 0; i < 64; i++) {
      this.write('\x00');
    }
  };
} ///////////////TYPES//////////////////


const SpecifierType = {
  "Def": 0,
  "Over": 1,
  "Class": 2
};
Object.freeze(SpecifierType);
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
};

ClassType.getName = function (value) {
  return Object.keys(this).find(key => this[key] === value);
};

Object.freeze(ClassType);
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
};
Object.freeze(SpecType);
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
};

ValueType.getName = function (value) {
  if (value == ValueType.vec2f) return 'float2';
  if (value == ValueType.vec3f) return 'float3';
  if (value == ValueType.vec4f) return 'float4';
  return Object.keys(this).find(key => this[key] === value);
};

Object.freeze(ValueType); //////////////UTILS////////////////

function convertThreeMatrix(matrix) {
  //matrix=matrix.clone().transpose();
  return matrix;
  /*
  matrix = mathutils.Matrix.transposed(matrix)
  return (matrix[0][:], matrix[1][:], matrix[2][:], matrix[3][:])
  */
}

function getValueType(value) {
  let t = typeof value;

  if (t == "boolean") {
    return ValueType.bool;
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
      return ValueType.asset;
    }

    return ValueType.token;
  }

  if (t == "object") {
    if (value == null) return ValueType.Invalid;

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

    return ValueType.Dictionary;
  }

  return ValueType.Invalid;
}

function exportThreeMeshVertexCounts(mesh) {
  let vertexCounts = [];

  for (let i = 0; i < mesh.index.array.length / 3; i++) {
    vertexCounts.push(3);
  }

  return vertexCounts;
}

function exportThreeMeshVertices(mesh) {
  let vertices = [];

  for (let i = 0; i < mesh.attributes.position.array.length; i += 3) {
    vertices.push(new THREE.Vector3(mesh.attributes.position.array[i], mesh.attributes.position.array[i + 1], mesh.attributes.position.array[i + 2]));
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
    uvs.push(new THREE.Vector2(mesh.attributes.uv.array[i], (mesh.attributes.uv.array[i + 1] - 1) * -1));
  }

  return uvs;
}

function exportThreeMeshNormalIndices(mesh) {
  return exportThreeMeshIndices(mesh);
}

function exportThreeExtents(object) {
  object.geometry.computeBoundingBox();
  return [object.geometry.boundingBox.min, object.geometry.boundingBox.max];
}

},{"./node_modules/jsbi/dist/jsbi.mjs":8,"jszip":9}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

class JSBI extends Array {
  constructor(a, b) {
    if (a > JSBI.__kMaxLength) throw new RangeError("Maximum BigInt size exceeded");
    super(a), this.sign = b;
  }

  static BigInt(a) {
    var b = Math.floor,
        c = Number.isFinite;

    if ("number" == typeof a) {
      if (0 === a) return JSBI.__zero();
      if ((0 | a) === a) return 0 > a ? JSBI.__oneDigit(-a, !0) : JSBI.__oneDigit(a, !1);
      if (!c(a) || b(a) !== a) throw new RangeError("The number " + a + " cannot be converted to BigInt because it is not an integer");
      return JSBI.__fromDouble(a);
    }

    if ("string" == typeof a) {
      const b = JSBI.__fromString(a);

      if (null === b) throw new SyntaxError("Cannot convert " + a + " to a BigInt");
      return b;
    }

    if ("boolean" == typeof a) return !0 === a ? JSBI.__oneDigit(1, !1) : JSBI.__zero();

    if ("object" == typeof a) {
      if (a.constructor === JSBI) return a;

      const b = JSBI.__toPrimitive(a);

      return JSBI.BigInt(b);
    }

    throw new TypeError("Cannot convert " + a + " to a BigInt");
  }

  toDebugString() {
    const a = ["BigInt["];

    for (const b of this) a.push((b ? (b >>> 0).toString(16) : b) + ", ");

    return a.push("]"), a.join("");
  }

  toString(a = 10) {
    if (2 > a || 36 < a) throw new RangeError("toString() radix argument must be between 2 and 36");
    return 0 === this.length ? "0" : 0 == (a & a - 1) ? JSBI.__toStringBasePowerOfTwo(this, a) : JSBI.__toStringGeneric(this, a, !1);
  }

  static toNumber(a) {
    const b = a.length;
    if (0 === b) return 0;

    if (1 === b) {
      const b = a.__unsignedDigit(0);

      return a.sign ? -b : b;
    }

    const c = a.__digit(b - 1),
          d = JSBI.__clz32(c),
          e = 32 * b - d;

    if (1024 < e) return a.sign ? -Infinity : 1 / 0;
    let f = e - 1,
        g = c,
        h = b - 1;
    const i = d + 1;
    let j = 32 === i ? 0 : g << i;
    j >>>= 12;
    const k = i - 12;
    let l = 12 <= i ? 0 : g << 20 + i,
        m = 20 + i;
    0 < k && 0 < h && (h--, g = a.__digit(h), j |= g >>> 32 - k, l = g << k, m = k), 0 < m && 0 < h && (h--, g = a.__digit(h), l |= g >>> 32 - m, m -= 32);

    const n = JSBI.__decideRounding(a, m, h, g);

    if ((1 === n || 0 === n && 1 == (1 & l)) && (l = l + 1 >>> 0, 0 === l && (j++, 0 != j >>> 20 && (j = 0, f++, 1023 < f)))) return a.sign ? -Infinity : 1 / 0;
    const o = a.sign ? -2147483648 : 0;
    return f = f + 1023 << 20, JSBI.__kBitConversionInts[1] = o | f | j, JSBI.__kBitConversionInts[0] = l, JSBI.__kBitConversionDouble[0];
  }

  static unaryMinus(a) {
    if (0 === a.length) return a;

    const b = a.__copy();

    return b.sign = !a.sign, b;
  }

  static bitwiseNot(a) {
    return a.sign ? JSBI.__absoluteSubOne(a).__trim() : JSBI.__absoluteAddOne(a, !0);
  }

  static exponentiate(a, b) {
    if (b.sign) throw new RangeError("Exponent must be positive");
    if (0 === b.length) return JSBI.__oneDigit(1, !1);
    if (0 === a.length) return a;
    if (1 === a.length && 1 === a.__digit(0)) return a.sign && 0 == (1 & b.__digit(0)) ? JSBI.unaryMinus(a) : a;
    if (1 < b.length) throw new RangeError("BigInt too big");

    let c = b.__unsignedDigit(0);

    if (1 === c) return a;
    if (c >= JSBI.__kMaxLengthBits) throw new RangeError("BigInt too big");

    if (1 === a.length && 2 === a.__digit(0)) {
      const b = 1 + (c >>> 5),
            d = a.sign && 0 != (1 & c),
            e = new JSBI(b, d);

      e.__initializeDigits();

      const f = 1 << (31 & c);
      return e.__setDigit(b - 1, f), e;
    }

    let d = null,
        e = a;

    for (0 != (1 & c) && (d = a), c >>= 1; 0 !== c; c >>= 1) e = JSBI.multiply(e, e), 0 != (1 & c) && (null === d ? d = e : d = JSBI.multiply(d, e));

    return d;
  }

  static multiply(a, b) {
    if (0 === a.length) return a;
    if (0 === b.length) return b;
    let c = a.length + b.length;
    32 <= a.__clzmsd() + b.__clzmsd() && c--;
    const d = new JSBI(c, a.sign !== b.sign);

    d.__initializeDigits();

    for (let c = 0; c < a.length; c++) JSBI.__multiplyAccumulate(b, a.__digit(c), d, c);

    return d.__trim();
  }

  static divide(a, b) {
    if (0 === b.length) throw new RangeError("Division by zero");
    if (0 > JSBI.__absoluteCompare(a, b)) return JSBI.__zero();

    const c = a.sign !== b.sign,
          d = b.__unsignedDigit(0);

    let e;

    if (1 === b.length && 65535 >= d) {
      if (1 === d) return c === a.sign ? a : JSBI.unaryMinus(a);
      e = JSBI.__absoluteDivSmall(a, d, null);
    } else e = JSBI.__absoluteDivLarge(a, b, !0, !1);

    return e.sign = c, e.__trim();
  }

  static remainder(a, b) {
    if (0 === b.length) throw new RangeError("Division by zero");
    if (0 > JSBI.__absoluteCompare(a, b)) return a;

    const c = b.__unsignedDigit(0);

    if (1 === b.length && 65535 >= c) {
      if (1 === c) return JSBI.__zero();

      const b = JSBI.__absoluteModSmall(a, c);

      return 0 === b ? JSBI.__zero() : JSBI.__oneDigit(b, a.sign);
    }

    const d = JSBI.__absoluteDivLarge(a, b, !1, !0);

    return d.sign = a.sign, d.__trim();
  }

  static add(a, b) {
    const c = a.sign;
    return c === b.sign ? JSBI.__absoluteAdd(a, b, c) : 0 <= JSBI.__absoluteCompare(a, b) ? JSBI.__absoluteSub(a, b, c) : JSBI.__absoluteSub(b, a, !c);
  }

  static subtract(a, b) {
    const c = a.sign;
    return c === b.sign ? 0 <= JSBI.__absoluteCompare(a, b) ? JSBI.__absoluteSub(a, b, c) : JSBI.__absoluteSub(b, a, !c) : JSBI.__absoluteAdd(a, b, c);
  }

  static leftShift(a, b) {
    return 0 === b.length || 0 === a.length ? a : b.sign ? JSBI.__rightShiftByAbsolute(a, b) : JSBI.__leftShiftByAbsolute(a, b);
  }

  static signedRightShift(a, b) {
    return 0 === b.length || 0 === a.length ? a : b.sign ? JSBI.__leftShiftByAbsolute(a, b) : JSBI.__rightShiftByAbsolute(a, b);
  }

  static unsignedRightShift() {
    throw new TypeError("BigInts have no unsigned right shift; use >> instead");
  }

  static lessThan(a, b) {
    return 0 > JSBI.__compareToBigInt(a, b);
  }

  static lessThanOrEqual(a, b) {
    return 0 >= JSBI.__compareToBigInt(a, b);
  }

  static greaterThan(a, b) {
    return 0 < JSBI.__compareToBigInt(a, b);
  }

  static greaterThanOrEqual(a, b) {
    return 0 <= JSBI.__compareToBigInt(a, b);
  }

  static equal(a, b) {
    if (a.sign !== b.sign) return !1;
    if (a.length !== b.length) return !1;

    for (let c = 0; c < a.length; c++) if (a.__digit(c) !== b.__digit(c)) return !1;

    return !0;
  }

  static notEqual(a, b) {
    return !JSBI.equal(a, b);
  }

  static bitwiseAnd(a, b) {
    var c = Math.max;
    if (!a.sign && !b.sign) return JSBI.__absoluteAnd(a, b).__trim();

    if (a.sign && b.sign) {
      const d = c(a.length, b.length) + 1;

      let e = JSBI.__absoluteSubOne(a, d);

      const f = JSBI.__absoluteSubOne(b);

      return e = JSBI.__absoluteOr(e, f, e), JSBI.__absoluteAddOne(e, !0, e).__trim();
    }

    return a.sign && ([a, b] = [b, a]), JSBI.__absoluteAndNot(a, JSBI.__absoluteSubOne(b)).__trim();
  }

  static bitwiseXor(a, b) {
    var c = Math.max;
    if (!a.sign && !b.sign) return JSBI.__absoluteXor(a, b).__trim();

    if (a.sign && b.sign) {
      const d = c(a.length, b.length),
            e = JSBI.__absoluteSubOne(a, d),
            f = JSBI.__absoluteSubOne(b);

      return JSBI.__absoluteXor(e, f, e).__trim();
    }

    const d = c(a.length, b.length) + 1;
    a.sign && ([a, b] = [b, a]);

    let e = JSBI.__absoluteSubOne(b, d);

    return e = JSBI.__absoluteXor(e, a, e), JSBI.__absoluteAddOne(e, !0, e).__trim();
  }

  static bitwiseOr(a, b) {
    var c = Math.max;
    const d = c(a.length, b.length);
    if (!a.sign && !b.sign) return JSBI.__absoluteOr(a, b).__trim();

    if (a.sign && b.sign) {
      let c = JSBI.__absoluteSubOne(a, d);

      const e = JSBI.__absoluteSubOne(b);

      return c = JSBI.__absoluteAnd(c, e, c), JSBI.__absoluteAddOne(c, !0, c).__trim();
    }

    a.sign && ([a, b] = [b, a]);

    let e = JSBI.__absoluteSubOne(b, d);

    return e = JSBI.__absoluteAndNot(e, a, e), JSBI.__absoluteAddOne(e, !0, e).__trim();
  }

  static asIntN(a, b) {
    if (0 === b.length) return b;
    if (0 === a) return JSBI.__zero();
    if (a >= JSBI.__kMaxLengthBits) return b;
    const c = a + 31 >>> 5;
    if (b.length < c) return b;

    const d = b.__unsignedDigit(c - 1),
          e = 1 << (31 & a - 1);

    if (b.length === c && d < e) return b;
    if (!((d & e) === e)) return JSBI.__truncateToNBits(a, b);
    if (!b.sign) return JSBI.__truncateAndSubFromPowerOfTwo(a, b, !0);

    if (0 == (d & e - 1)) {
      for (let d = c - 2; 0 <= d; d--) if (0 !== b.__digit(d)) return JSBI.__truncateAndSubFromPowerOfTwo(a, b, !1);

      return b.length === c && d === e ? b : JSBI.__truncateToNBits(a, b);
    }

    return JSBI.__truncateAndSubFromPowerOfTwo(a, b, !1);
  }

  static asUintN(a, b) {
    if (0 === b.length) return b;
    if (0 === a) return JSBI.__zero();

    if (b.sign) {
      if (a > JSBI.__kMaxLengthBits) throw new RangeError("BigInt too big");
      return JSBI.__truncateAndSubFromPowerOfTwo(a, b, !1);
    }

    if (a >= JSBI.__kMaxLengthBits) return b;
    const c = a + 31 >>> 5;
    if (b.length < c) return b;
    const d = 31 & a;

    if (b.length == c) {
      if (0 === d) return b;

      const a = b.__digit(c - 1);

      if (0 == a >>> d) return b;
    }

    return JSBI.__truncateToNBits(a, b);
  }

  static ADD(a, b) {
    if (a = JSBI.__toPrimitive(a), b = JSBI.__toPrimitive(b), "string" == typeof a) return "string" != typeof b && (b = b.toString()), a + b;
    if ("string" == typeof b) return a.toString() + b;
    if (a = JSBI.__toNumeric(a), b = JSBI.__toNumeric(b), JSBI.__isBigInt(a) && JSBI.__isBigInt(b)) return JSBI.add(a, b);
    if ("number" == typeof a && "number" == typeof b) return a + b;
    throw new TypeError("Cannot mix BigInt and other types, use explicit conversions");
  }

  static LT(a, b) {
    return JSBI.__compare(a, b, 0);
  }

  static LE(a, b) {
    return JSBI.__compare(a, b, 1);
  }

  static GT(a, b) {
    return JSBI.__compare(a, b, 2);
  }

  static GE(a, b) {
    return JSBI.__compare(a, b, 3);
  }

  static EQ(a, b) {
    for (;;) {
      if (JSBI.__isBigInt(a)) return JSBI.__isBigInt(b) ? JSBI.equal(a, b) : JSBI.EQ(b, a);

      if ("number" == typeof a) {
        if (JSBI.__isBigInt(b)) return JSBI.__equalToNumber(b, a);
        if ("object" != typeof b) return a == b;
        b = JSBI.__toPrimitive(b);
      } else if ("string" == typeof a) {
        if (JSBI.__isBigInt(b)) return a = JSBI.__fromString(a), null !== a && JSBI.equal(a, b);
        if ("object" != typeof b) return a == b;
        b = JSBI.__toPrimitive(b);
      } else if ("boolean" == typeof a) {
        if (JSBI.__isBigInt(b)) return JSBI.__equalToNumber(b, +a);
        if ("object" != typeof b) return a == b;
        b = JSBI.__toPrimitive(b);
      } else if ("symbol" == typeof a) {
        if (JSBI.__isBigInt(b)) return !1;
        if ("object" != typeof b) return a == b;
        b = JSBI.__toPrimitive(b);
      } else if ("object" == typeof a) {
        if ("object" == typeof b && b.constructor !== JSBI) return a == b;
        a = JSBI.__toPrimitive(a);
      } else return a == b;
    }
  }

  static NE(a, b) {
    return !JSBI.EQ(a, b);
  }

  static __zero() {
    return new JSBI(0, !1);
  }

  static __oneDigit(a, b) {
    const c = new JSBI(1, b);
    return c.__setDigit(0, a), c;
  }

  __copy() {
    const a = new JSBI(this.length, this.sign);

    for (let b = 0; b < this.length; b++) a[b] = this[b];

    return a;
  }

  __trim() {
    let a = this.length,
        b = this[a - 1];

    for (; 0 === b;) a--, b = this[a - 1], this.pop();

    return 0 === a && (this.sign = !1), this;
  }

  __initializeDigits() {
    for (let a = 0; a < this.length; a++) this[a] = 0;
  }

  static __decideRounding(a, b, c, d) {
    if (0 < b) return -1;
    let e;
    if (0 > b) e = -b - 1;else {
      if (0 === c) return -1;
      c--, d = a.__digit(c), e = 31;
    }
    let f = 1 << e;
    if (0 == (d & f)) return -1;
    if (f -= 1, 0 != (d & f)) return 1;

    for (; 0 < c;) if (c--, 0 !== a.__digit(c)) return 1;

    return 0;
  }

  static __fromDouble(a) {
    JSBI.__kBitConversionDouble[0] = a;
    const b = 2047 & JSBI.__kBitConversionInts[1] >>> 20,
          c = b - 1023,
          d = (c >>> 5) + 1,
          e = new JSBI(d, 0 > a);
    let f = 1048575 & JSBI.__kBitConversionInts[1] | 1048576,
        g = JSBI.__kBitConversionInts[0];
    const h = 20,
          i = 31 & c;
    let j,
        k = 0;

    if (i < 20) {
      const a = h - i;
      k = a + 32, j = f >>> a, f = f << 32 - a | g >>> a, g <<= 32 - a;
    } else if (i === 20) k = 32, j = f, f = g;else {
      const a = i - h;
      k = 32 - a, j = f << a | g >>> 32 - a, f = g << a;
    }

    e.__setDigit(d - 1, j);

    for (let b = d - 2; 0 <= b; b--) 0 < k ? (k -= 32, j = f, f = g) : j = 0, e.__setDigit(b, j);

    return e.__trim();
  }

  static __isWhitespace(a) {
    return !!(13 >= a && 9 <= a) || (159 >= a ? 32 == a : 131071 >= a ? 160 == a || 5760 == a : 196607 >= a ? (a &= 131071, 10 >= a || 40 == a || 41 == a || 47 == a || 95 == a || 4096 == a) : 65279 == a);
  }

  static __fromString(a, b = 0) {
    let c = 0;
    const e = a.length;
    let f = 0;
    if (f === e) return JSBI.__zero();
    let g = a.charCodeAt(f);

    for (; JSBI.__isWhitespace(g);) {
      if (++f === e) return JSBI.__zero();
      g = a.charCodeAt(f);
    }

    if (43 === g) {
      if (++f === e) return null;
      g = a.charCodeAt(f), c = 1;
    } else if (45 === g) {
      if (++f === e) return null;
      g = a.charCodeAt(f), c = -1;
    }

    if (0 === b) {
      if (b = 10, 48 === g) {
        if (++f === e) return JSBI.__zero();

        if (g = a.charCodeAt(f), 88 === g || 120 === g) {
          if (b = 16, ++f === e) return null;
          g = a.charCodeAt(f);
        } else if (79 === g || 111 === g) {
          if (b = 8, ++f === e) return null;
          g = a.charCodeAt(f);
        } else if (66 === g || 98 === g) {
          if (b = 2, ++f === e) return null;
          g = a.charCodeAt(f);
        }
      }
    } else if (16 === b && 48 === g) {
      if (++f === e) return JSBI.__zero();

      if (g = a.charCodeAt(f), 88 === g || 120 === g) {
        if (++f === e) return null;
        g = a.charCodeAt(f);
      }
    }

    for (; 48 === g;) {
      if (++f === e) return JSBI.__zero();
      g = a.charCodeAt(f);
    }

    const h = e - f;
    let i = JSBI.__kMaxBitsPerChar[b],
        j = JSBI.__kBitsPerCharTableMultiplier - 1;
    if (h > 1073741824 / i) return null;
    const k = i * h + j >>> JSBI.__kBitsPerCharTableShift,
          l = new JSBI(k + 31 >>> 5, !1),
          n = 10 > b ? b : 10,
          o = 10 < b ? b - 10 : 0;

    if (0 == (b & b - 1)) {
      i >>= JSBI.__kBitsPerCharTableShift;
      const b = [],
            c = [];
      let d = !1;

      do {
        let h = 0,
            j = 0;

        for (;;) {
          let b;
          if (g - 48 >>> 0 < n) b = g - 48;else if ((32 | g) - 97 >>> 0 < o) b = (32 | g) - 87;else {
            d = !0;
            break;
          }

          if (j += i, h = h << i | b, ++f === e) {
            d = !0;
            break;
          }

          if (g = a.charCodeAt(f), 32 < j + i) break;
        }

        b.push(h), c.push(j);
      } while (!d);

      JSBI.__fillFromParts(l, b, c);
    } else {
      l.__initializeDigits();

      let c = !1,
          h = 0;

      do {
        let k = 0,
            p = 1;

        for (;;) {
          let i;
          if (g - 48 >>> 0 < n) i = g - 48;else if ((32 | g) - 97 >>> 0 < o) i = (32 | g) - 87;else {
            c = !0;
            break;
          }
          const d = p * b;
          if (4294967295 < d) break;

          if (p = d, k = k * b + i, h++, ++f === e) {
            c = !0;
            break;
          }

          g = a.charCodeAt(f);
        }

        j = 32 * JSBI.__kBitsPerCharTableMultiplier - 1;
        const q = i * h + j >>> JSBI.__kBitsPerCharTableShift + 5;

        l.__inplaceMultiplyAdd(p, k, q);
      } while (!c);
    }

    if (f !== e) {
      if (!JSBI.__isWhitespace(g)) return null;

      for (f++; f < e; f++) if (g = a.charCodeAt(f), !JSBI.__isWhitespace(g)) return null;
    }

    return 0 != c && 10 !== b ? null : (l.sign = -1 == c, l.__trim());
  }

  static __fillFromParts(a, b, c) {
    let d = 0,
        e = 0,
        f = 0;

    for (let g = b.length - 1; 0 <= g; g--) {
      const h = b[g],
            i = c[g];
      e |= h << f, f += i, 32 === f ? (a.__setDigit(d++, e), f = 0, e = 0) : 32 < f && (a.__setDigit(d++, e), f -= 32, e = h >>> i - f);
    }

    if (0 !== e) {
      if (d >= a.length) throw new Error("implementation bug");

      a.__setDigit(d++, e);
    }

    for (; d < a.length; d++) a.__setDigit(d, 0);
  }

  static __toStringBasePowerOfTwo(a, b) {
    const c = a.length;
    let d = b - 1;
    d = (85 & d >>> 1) + (85 & d), d = (51 & d >>> 2) + (51 & d), d = (15 & d >>> 4) + (15 & d);

    const e = d,
          f = b - 1,
          g = a.__digit(c - 1),
          h = JSBI.__clz32(g);

    let i = 0 | (32 * c - h + e - 1) / e;
    if (a.sign && i++, 268435456 < i) throw new Error("string too long");
    const j = Array(i);
    let k = i - 1,
        l = 0,
        m = 0;

    for (let d = 0; d < c - 1; d++) {
      const b = a.__digit(d),
            c = (l | b << m) & f;

      j[k--] = JSBI.__kConversionChars[c];
      const g = e - m;

      for (l = b >>> g, m = 32 - g; m >= e;) j[k--] = JSBI.__kConversionChars[l & f], l >>>= e, m -= e;
    }

    const n = (l | g << m) & f;

    for (j[k--] = JSBI.__kConversionChars[n], l = g >>> e - m; 0 !== l;) j[k--] = JSBI.__kConversionChars[l & f], l >>>= e;

    if (a.sign && (j[k--] = "-"), -1 != k) throw new Error("implementation bug");
    return j.join("");
  }

  static __toStringGeneric(a, b, c) {
    const d = a.length;
    if (0 === d) return "";

    if (1 === d) {
      let d = a.__unsignedDigit(0).toString(b);

      return !1 === c && a.sign && (d = "-" + d), d;
    }

    const e = 32 * d - JSBI.__clz32(a.__digit(d - 1)),
          f = JSBI.__kMaxBitsPerChar[b],
          g = f - 1;

    let h = e * JSBI.__kBitsPerCharTableMultiplier;
    h += g - 1, h = 0 | h / g;
    const i = h + 1 >> 1,
          j = JSBI.exponentiate(JSBI.__oneDigit(b, !1), JSBI.__oneDigit(i, !1));
    let k, l;

    const m = j.__unsignedDigit(0);

    if (1 === j.length && 65535 >= m) {
      k = new JSBI(a.length, !1), k.__initializeDigits();
      let c = 0;

      for (let b = 2 * a.length - 1; 0 <= b; b--) {
        const d = c << 16 | a.__halfDigit(b);

        k.__setHalfDigit(b, 0 | d / m), c = 0 | d % m;
      }

      l = c.toString(b);
    } else {
      const c = JSBI.__absoluteDivLarge(a, j, !0, !0);

      k = c.quotient;

      const d = c.remainder.__trim();

      l = JSBI.__toStringGeneric(d, b, !0);
    }

    k.__trim();

    let n = JSBI.__toStringGeneric(k, b, !0);

    for (; l.length < i;) l = "0" + l;

    return !1 === c && a.sign && (n = "-" + n), n + l;
  }

  static __unequalSign(a) {
    return a ? -1 : 1;
  }

  static __absoluteGreater(a) {
    return a ? -1 : 1;
  }

  static __absoluteLess(a) {
    return a ? 1 : -1;
  }

  static __compareToBigInt(a, b) {
    const c = a.sign;
    if (c !== b.sign) return JSBI.__unequalSign(c);

    const d = JSBI.__absoluteCompare(a, b);

    return 0 < d ? JSBI.__absoluteGreater(c) : 0 > d ? JSBI.__absoluteLess(c) : 0;
  }

  static __compareToNumber(a, b) {
    if (b | !0) {
      const c = a.sign,
            d = 0 > b;
      if (c !== d) return JSBI.__unequalSign(c);

      if (0 === a.length) {
        if (d) throw new Error("implementation bug");
        return 0 === b ? 0 : -1;
      }

      if (1 < a.length) return JSBI.__absoluteGreater(c);

      const e = Math.abs(b),
            f = a.__unsignedDigit(0);

      return f > e ? JSBI.__absoluteGreater(c) : f < e ? JSBI.__absoluteLess(c) : 0;
    }

    return JSBI.__compareToDouble(a, b);
  }

  static __compareToDouble(a, b) {
    if (b !== b) return b;
    if (b === 1 / 0) return -1;
    if (b === -Infinity) return 1;
    const c = a.sign;
    if (c !== 0 > b) return JSBI.__unequalSign(c);
    if (0 === b) throw new Error("implementation bug: should be handled elsewhere");
    if (0 === a.length) return -1;
    JSBI.__kBitConversionDouble[0] = b;
    const d = 2047 & JSBI.__kBitConversionInts[1] >>> 20;
    if (2047 == d) throw new Error("implementation bug: handled elsewhere");
    const e = d - 1023;
    if (0 > e) return JSBI.__absoluteGreater(c);
    const f = a.length;

    let g = a.__digit(f - 1);

    const h = JSBI.__clz32(g),
          i = 32 * f - h,
          j = e + 1;

    if (i < j) return JSBI.__absoluteLess(c);
    if (i > j) return JSBI.__absoluteGreater(c);
    let k = 1048576 | 1048575 & JSBI.__kBitConversionInts[1],
        l = JSBI.__kBitConversionInts[0];
    const m = 20,
          n = 31 - h;
    if (n !== (i - 1) % 31) throw new Error("implementation bug");
    let o,
        p = 0;

    if (20 > n) {
      const a = m - n;
      p = a + 32, o = k >>> a, k = k << 32 - a | l >>> a, l <<= 32 - a;
    } else if (20 === n) p = 32, o = k, k = l;else {
      const a = n - m;
      p = 32 - a, o = k << a | l >>> 32 - a, k = l << a;
    }

    if (g >>>= 0, o >>>= 0, g > o) return JSBI.__absoluteGreater(c);
    if (g < o) return JSBI.__absoluteLess(c);

    for (let d = f - 2; 0 <= d; d--) {
      0 < p ? (p -= 32, o = k >>> 0, k = l, l = 0) : o = 0;

      const b = a.__unsignedDigit(d);

      if (b > o) return JSBI.__absoluteGreater(c);
      if (b < o) return JSBI.__absoluteLess(c);
    }

    if (0 !== k || 0 !== l) {
      if (0 === p) throw new Error("implementation bug");
      return JSBI.__absoluteLess(c);
    }

    return 0;
  }

  static __equalToNumber(a, b) {
    var c = Math.abs;
    return b | 0 === b ? 0 === b ? 0 === a.length : 1 === a.length && a.sign === 0 > b && a.__unsignedDigit(0) === c(b) : 0 === JSBI.__compareToDouble(a, b);
  }

  static __comparisonResultToBool(a, b) {
    switch (b) {
      case 0:
        return 0 > a;

      case 1:
        return 0 >= a;

      case 2:
        return 0 < a;

      case 3:
        return 0 <= a;
    }

    throw new Error("unreachable");
  }

  static __compare(a, b, c) {
    if (a = JSBI.__toPrimitive(a), b = JSBI.__toPrimitive(b), "string" == typeof a && "string" == typeof b) switch (c) {
      case 0:
        return a < b;

      case 1:
        return a <= b;

      case 2:
        return a > b;

      case 3:
        return a >= b;
    }
    if (JSBI.__isBigInt(a) && "string" == typeof b) return b = JSBI.__fromString(b), null !== b && JSBI.__comparisonResultToBool(JSBI.__compareToBigInt(a, b), c);
    if ("string" == typeof a && JSBI.__isBigInt(b)) return a = JSBI.__fromString(a), null !== a && JSBI.__comparisonResultToBool(JSBI.__compareToBigInt(a, b), c);

    if (a = JSBI.__toNumeric(a), b = JSBI.__toNumeric(b), JSBI.__isBigInt(a)) {
      if (JSBI.__isBigInt(b)) return JSBI.__comparisonResultToBool(JSBI.__compareToBigInt(a, b), c);
      if ("number" != typeof b) throw new Error("implementation bug");
      return JSBI.__comparisonResultToBool(JSBI.__compareToNumber(a, b), c);
    }

    if ("number" != typeof a) throw new Error("implementation bug");
    if (JSBI.__isBigInt(b)) return JSBI.__comparisonResultToBool(JSBI.__compareToNumber(b, a), 2 ^ c);
    if ("number" != typeof b) throw new Error("implementation bug");
    return 0 === c ? a < b : 1 === c ? a <= b : 2 === c ? a > b : 3 === c ? a >= b : void 0;
  }

  __clzmsd() {
    return JSBI.__clz32(this[this.length - 1]);
  }

  static __absoluteAdd(a, b, c) {
    if (a.length < b.length) return JSBI.__absoluteAdd(b, a, c);
    if (0 === a.length) return a;
    if (0 === b.length) return a.sign === c ? a : JSBI.unaryMinus(a);
    let d = a.length;
    (0 === a.__clzmsd() || b.length === a.length && 0 === b.__clzmsd()) && d++;
    const e = new JSBI(d, c);
    let f = 0,
        g = 0;

    for (; g < b.length; g++) {
      const c = b.__digit(g),
            d = a.__digit(g),
            h = (65535 & d) + (65535 & c) + f,
            i = (d >>> 16) + (c >>> 16) + (h >>> 16);

      f = i >>> 16, e.__setDigit(g, 65535 & h | i << 16);
    }

    for (; g < a.length; g++) {
      const b = a.__digit(g),
            c = (65535 & b) + f,
            d = (b >>> 16) + (c >>> 16);

      f = d >>> 16, e.__setDigit(g, 65535 & c | d << 16);
    }

    return g < e.length && e.__setDigit(g, f), e.__trim();
  }

  static __absoluteSub(a, b, c) {
    if (0 === a.length) return a;
    if (0 === b.length) return a.sign === c ? a : JSBI.unaryMinus(a);
    const d = new JSBI(a.length, c);
    let e = 0,
        f = 0;

    for (; f < b.length; f++) {
      const c = a.__digit(f),
            g = b.__digit(f),
            h = (65535 & c) - (65535 & g) - e;

      e = 1 & h >>> 16;
      const i = (c >>> 16) - (g >>> 16) - e;
      e = 1 & i >>> 16, d.__setDigit(f, 65535 & h | i << 16);
    }

    for (; f < a.length; f++) {
      const b = a.__digit(f),
            c = (65535 & b) - e;

      e = 1 & c >>> 16;
      const g = (b >>> 16) - e;
      e = 1 & g >>> 16, d.__setDigit(f, 65535 & c | g << 16);
    }

    return d.__trim();
  }

  static __absoluteAddOne(a, b, c = null) {
    const d = a.length;
    null === c ? c = new JSBI(d, b) : c.sign = b;
    let e = !0;

    for (let f, g = 0; g < d; g++) {
      if (f = a.__digit(g), e) {
        const a = -1 === f;
        f = 0 | f + 1, e = a;
      }

      c.__setDigit(g, f);
    }

    return e && c.__setDigitGrow(d, 1), c;
  }

  static __absoluteSubOne(a, b) {
    const c = a.length;
    b = b || c;
    const d = new JSBI(b, !1);
    let e = !0;

    for (let f, g = 0; g < c; g++) {
      if (f = a.__digit(g), e) {
        const a = 0 === f;
        f = 0 | f - 1, e = a;
      }

      d.__setDigit(g, f);
    }

    if (e) throw new Error("implementation bug");

    for (let e = c; e < b; e++) d.__setDigit(e, 0);

    return d;
  }

  static __absoluteAnd(a, b, c = null) {
    let d = a.length,
        e = b.length,
        f = e;

    if (d < e) {
      f = d;
      const c = a,
            g = d;
      a = b, d = e, b = c, e = g;
    }

    let g = f;
    null === c ? c = new JSBI(g, !1) : g = c.length;
    let h = 0;

    for (; h < f; h++) c.__setDigit(h, a.__digit(h) & b.__digit(h));

    for (; h < g; h++) c.__setDigit(h, 0);

    return c;
  }

  static __absoluteAndNot(a, b, c = null) {
    const d = a.length,
          e = b.length;
    let f = e;
    d < e && (f = d);
    let g = d;
    null === c ? c = new JSBI(g, !1) : g = c.length;
    let h = 0;

    for (; h < f; h++) c.__setDigit(h, a.__digit(h) & ~b.__digit(h));

    for (; h < d; h++) c.__setDigit(h, a.__digit(h));

    for (; h < g; h++) c.__setDigit(h, 0);

    return c;
  }

  static __absoluteOr(a, b, c = null) {
    let d = a.length,
        e = b.length,
        f = e;

    if (d < e) {
      f = d;
      const c = a,
            g = d;
      a = b, d = e, b = c, e = g;
    }

    let g = d;
    null === c ? c = new JSBI(g, !1) : g = c.length;
    let h = 0;

    for (; h < f; h++) c.__setDigit(h, a.__digit(h) | b.__digit(h));

    for (; h < d; h++) c.__setDigit(h, a.__digit(h));

    for (; h < g; h++) c.__setDigit(h, 0);

    return c;
  }

  static __absoluteXor(a, b, c = null) {
    let d = a.length,
        e = b.length,
        f = e;

    if (d < e) {
      f = d;
      const c = a,
            g = d;
      a = b, d = e, b = c, e = g;
    }

    let g = d;
    null === c ? c = new JSBI(g, !1) : g = c.length;
    let h = 0;

    for (; h < f; h++) c.__setDigit(h, a.__digit(h) ^ b.__digit(h));

    for (; h < d; h++) c.__setDigit(h, a.__digit(h));

    for (; h < g; h++) c.__setDigit(h, 0);

    return c;
  }

  static __absoluteCompare(a, b) {
    const c = a.length - b.length;
    if (0 != c) return c;
    let d = a.length - 1;

    for (; 0 <= d && a.__digit(d) === b.__digit(d);) d--;

    return 0 > d ? 0 : a.__unsignedDigit(d) > b.__unsignedDigit(d) ? 1 : -1;
  }

  static __multiplyAccumulate(a, b, c, d) {
    if (0 === b) return;
    const e = 65535 & b,
          f = b >>> 16;
    let g = 0,
        h = 0,
        j = 0;

    for (let k = 0; k < a.length; k++, d++) {
      let b = c.__digit(d),
          i = 65535 & b,
          l = b >>> 16;

      const m = a.__digit(k),
            n = 65535 & m,
            o = m >>> 16,
            p = JSBI.__imul(n, e),
            q = JSBI.__imul(n, f),
            r = JSBI.__imul(o, e),
            s = JSBI.__imul(o, f);

      i += h + (65535 & p), l += j + g + (i >>> 16) + (p >>> 16) + (65535 & q) + (65535 & r), g = l >>> 16, h = (q >>> 16) + (r >>> 16) + (65535 & s) + g, g = h >>> 16, h &= 65535, j = s >>> 16, b = 65535 & i | l << 16, c.__setDigit(d, b);
    }

    for (; 0 != g || 0 !== h || 0 !== j; d++) {
      let a = c.__digit(d);

      const b = (65535 & a) + h,
            e = (a >>> 16) + (b >>> 16) + j + g;
      h = 0, j = 0, g = e >>> 16, a = 65535 & b | e << 16, c.__setDigit(d, a);
    }
  }

  static __internalMultiplyAdd(a, b, c, d, e) {
    let f = c,
        g = 0;

    for (let h = 0; h < d; h++) {
      const c = a.__digit(h),
            d = JSBI.__imul(65535 & c, b),
            i = (65535 & d) + g + f;

      f = i >>> 16;

      const j = JSBI.__imul(c >>> 16, b),
            k = (65535 & j) + (d >>> 16) + f;

      f = k >>> 16, g = j >>> 16, e.__setDigit(h, k << 16 | 65535 & i);
    }

    if (e.length > d) for (e.__setDigit(d++, f + g); d < e.length;) e.__setDigit(d++, 0);else if (0 !== f + g) throw new Error("implementation bug");
  }

  __inplaceMultiplyAdd(a, b, c) {
    c > this.length && (c = this.length);
    const e = 65535 & a,
          f = a >>> 16;
    let g = 0,
        h = 65535 & b,
        j = b >>> 16;

    for (let k = 0; k < c; k++) {
      const a = this.__digit(k),
            b = 65535 & a,
            c = a >>> 16,
            d = JSBI.__imul(b, e),
            i = JSBI.__imul(b, f),
            l = JSBI.__imul(c, e),
            m = JSBI.__imul(c, f),
            n = h + (65535 & d),
            o = j + g + (n >>> 16) + (d >>> 16) + (65535 & i) + (65535 & l);

      h = (i >>> 16) + (l >>> 16) + (65535 & m) + (o >>> 16), g = h >>> 16, h &= 65535, j = m >>> 16;

      this.__setDigit(k, 65535 & n | o << 16);
    }

    if (0 != g || 0 !== h || 0 !== j) throw new Error("implementation bug");
  }

  static __absoluteDivSmall(a, b, c) {
    null === c && (c = new JSBI(a.length, !1));
    let d = 0;

    for (let e, f = 2 * a.length - 1; 0 <= f; f -= 2) {
      e = (d << 16 | a.__halfDigit(f)) >>> 0;
      const g = 0 | e / b;
      d = 0 | e % b, e = (d << 16 | a.__halfDigit(f - 1)) >>> 0;
      const h = 0 | e / b;
      d = 0 | e % b, c.__setDigit(f >>> 1, g << 16 | h);
    }

    return c;
  }

  static __absoluteModSmall(a, b) {
    let c = 0;

    for (let d = 2 * a.length - 1; 0 <= d; d--) {
      const e = (c << 16 | a.__halfDigit(d)) >>> 0;
      c = 0 | e % b;
    }

    return c;
  }

  static __absoluteDivLarge(a, b, d, e) {
    const f = b.__halfDigitLength(),
          g = b.length,
          c = a.__halfDigitLength() - f;

    let h = null;
    d && (h = new JSBI(c + 2 >>> 1, !1), h.__initializeDigits());
    const i = new JSBI(f + 2 >>> 1, !1);

    i.__initializeDigits();

    const j = JSBI.__clz16(b.__halfDigit(f - 1));

    0 < j && (b = JSBI.__specialLeftShift(b, j, 0));

    const k = JSBI.__specialLeftShift(a, j, 1),
          l = b.__halfDigit(f - 1);

    let m = 0;

    for (let n, o = c; 0 <= o; o--) {
      n = 65535;

      const a = k.__halfDigit(o + f);

      if (a !== l) {
        const c = (a << 16 | k.__halfDigit(o + f - 1)) >>> 0;
        n = 0 | c / l;
        let d = 0 | c % l;

        const e = b.__halfDigit(f - 2),
              g = k.__halfDigit(o + f - 2);

        for (; JSBI.__imul(n, e) >>> 0 > (d << 16 | g) >>> 0 && (n--, d += l, !(65535 < d)););
      }

      JSBI.__internalMultiplyAdd(b, n, 0, g, i);

      let e = k.__inplaceSub(i, o, f + 1);

      0 !== e && (e = k.__inplaceAdd(b, o, f), k.__setHalfDigit(o + f, k.__halfDigit(o + f) + e), n--), d && (1 & o ? m = n << 16 : h.__setDigit(o >>> 1, m | n));
    }

    return e ? (k.__inplaceRightShift(j), d ? {
      quotient: h,
      remainder: k
    } : k) : d ? h : void 0;
  }

  static __clz16(a) {
    return JSBI.__clz32(a) - 16;
  }

  __inplaceAdd(a, b, c) {
    let d = 0;

    for (let e = 0; e < c; e++) {
      const c = this.__halfDigit(b + e) + a.__halfDigit(e) + d;
      d = c >>> 16, this.__setHalfDigit(b + e, c);
    }

    return d;
  }

  __inplaceSub(a, b, c) {
    let d = 0;

    if (1 & b) {
      b >>= 1;

      let e = this.__digit(b),
          f = 65535 & e,
          g = 0;

      for (; g < c - 1 >>> 1; g++) {
        const c = a.__digit(g),
              h = (e >>> 16) - (65535 & c) - d;

        d = 1 & h >>> 16, this.__setDigit(b + g, h << 16 | 65535 & f), e = this.__digit(b + g + 1), f = (65535 & e) - (c >>> 16) - d, d = 1 & f >>> 16;
      }

      const h = a.__digit(g),
            i = (e >>> 16) - (65535 & h) - d;

      d = 1 & i >>> 16, this.__setDigit(b + g, i << 16 | 65535 & f);
      if (b + g + 1 >= this.length) throw new RangeError("out of bounds");
      0 == (1 & c) && (e = this.__digit(b + g + 1), f = (65535 & e) - (h >>> 16) - d, d = 1 & f >>> 16, this.__setDigit(b + a.length, 4294901760 & e | 65535 & f));
    } else {
      b >>= 1;
      let e = 0;

      for (; e < a.length - 1; e++) {
        const c = this.__digit(b + e),
              f = a.__digit(e),
              g = (65535 & c) - (65535 & f) - d;

        d = 1 & g >>> 16;
        const h = (c >>> 16) - (f >>> 16) - d;
        d = 1 & h >>> 16, this.__setDigit(b + e, h << 16 | 65535 & g);
      }

      const f = this.__digit(b + e),
            g = a.__digit(e),
            h = (65535 & f) - (65535 & g) - d;

      d = 1 & h >>> 16;
      let i = 0;
      0 == (1 & c) && (i = (f >>> 16) - (g >>> 16) - d, d = 1 & i >>> 16), this.__setDigit(b + e, i << 16 | 65535 & h);
    }

    return d;
  }

  __inplaceRightShift(a) {
    if (0 === a) return;
    let b = this.__digit(0) >>> a;
    const c = this.length - 1;

    for (let e = 0; e < c; e++) {
      const c = this.__digit(e + 1);

      this.__setDigit(e, c << 32 - a | b), b = c >>> a;
    }

    this.__setDigit(c, b);
  }

  static __specialLeftShift(a, b, c) {
    const d = a.length,
          e = new JSBI(d + c, !1);

    if (0 === b) {
      for (let b = 0; b < d; b++) e.__setDigit(b, a.__digit(b));

      return 0 < c && e.__setDigit(d, 0), e;
    }

    let f = 0;

    for (let g = 0; g < d; g++) {
      const c = a.__digit(g);

      e.__setDigit(g, c << b | f), f = c >>> 32 - b;
    }

    return 0 < c && e.__setDigit(d, f), e;
  }

  static __leftShiftByAbsolute(a, b) {
    const c = JSBI.__toShiftAmount(b);

    if (0 > c) throw new RangeError("BigInt too big");
    const e = c >>> 5,
          f = 31 & c,
          g = a.length,
          h = 0 !== f && 0 != a.__digit(g - 1) >>> 32 - f,
          j = g + e + (h ? 1 : 0),
          k = new JSBI(j, a.sign);

    if (0 === f) {
      let b = 0;

      for (; b < e; b++) k.__setDigit(b, 0);

      for (; b < j; b++) k.__setDigit(b, a.__digit(b - e));
    } else {
      let b = 0;

      for (let a = 0; a < e; a++) k.__setDigit(a, 0);

      for (let c = 0; c < g; c++) {
        const g = a.__digit(c);

        k.__setDigit(c + e, g << f | b), b = g >>> 32 - f;
      }

      if (h) k.__setDigit(g + e, b);else if (0 !== b) throw new Error("implementation bug");
    }

    return k.__trim();
  }

  static __rightShiftByAbsolute(a, b) {
    const c = a.length,
          d = a.sign,
          e = JSBI.__toShiftAmount(b);

    if (0 > e) return JSBI.__rightShiftByMaximum(d);
    const f = e >>> 5,
          g = 31 & e;
    let h = c - f;
    if (0 >= h) return JSBI.__rightShiftByMaximum(d);
    let i = !1;

    if (d) {
      if (0 != (a.__digit(f) & (1 << g) - 1)) i = !0;else for (let b = 0; b < f; b++) if (0 !== a.__digit(b)) {
        i = !0;
        break;
      }
    }

    if (i && 0 === g) {
      const b = a.__digit(c - 1);

      0 == ~b && h++;
    }

    let j = new JSBI(h, d);
    if (0 === g) for (let b = f; b < c; b++) j.__setDigit(b - f, a.__digit(b));else {
      let b = a.__digit(f) >>> g;
      const d = c - f - 1;

      for (let c = 0; c < d; c++) {
        const e = a.__digit(c + f + 1);

        j.__setDigit(c, e << 32 - g | b), b = e >>> g;
      }

      j.__setDigit(d, b);
    }
    return i && (j = JSBI.__absoluteAddOne(j, !0, j)), j.__trim();
  }

  static __rightShiftByMaximum(a) {
    return a ? JSBI.__oneDigit(1, !0) : JSBI.__zero();
  }

  static __toShiftAmount(a) {
    if (1 < a.length) return -1;

    const b = a.__unsignedDigit(0);

    return b > JSBI.__kMaxLengthBits ? -1 : b;
  }

  static __toPrimitive(a, b = "default") {
    if ("object" != typeof a) return a;
    if (a.constructor === JSBI) return a;
    const c = a[Symbol.toPrimitive];

    if (c) {
      const a = c(b);
      if ("object" != typeof a) return a;
      throw new TypeError("Cannot convert object to primitive value");
    }

    const d = a.valueOf;

    if (d) {
      const b = d.call(a);
      if ("object" != typeof b) return b;
    }

    const e = a.toString;

    if (e) {
      const b = e.call(a);
      if ("object" != typeof b) return b;
    }

    throw new TypeError("Cannot convert object to primitive value");
  }

  static __toNumeric(a) {
    return JSBI.__isBigInt(a) ? a : +a;
  }

  static __isBigInt(a) {
    return "object" == typeof a && a.constructor === JSBI;
  }

  static __truncateToNBits(a, b) {
    const c = a + 31 >>> 5,
          d = new JSBI(c, b.sign),
          e = c - 1;

    for (let c = 0; c < e; c++) d.__setDigit(c, b.__digit(c));

    let f = b.__digit(e);

    if (0 != (31 & a)) {
      const b = 32 - (31 & a);
      f = f << b >>> b;
    }

    return d.__setDigit(e, f), d.__trim();
  }

  static __truncateAndSubFromPowerOfTwo(a, b, c) {
    var d = Math.min;
    const e = a + 31 >>> 5,
          f = new JSBI(e, c);
    let g = 0;
    const h = e - 1;
    let j = 0;

    for (const e = d(h, b.length); g < e; g++) {
      const a = b.__digit(g),
            c = 0 - (65535 & a) - j;

      j = 1 & c >>> 16;
      const d = 0 - (a >>> 16) - j;
      j = 1 & d >>> 16, f.__setDigit(g, 65535 & c | d << 16);
    }

    for (; g < h; g++) f.__setDigit(g, 0 | -j);

    let k = h < b.length ? b.__digit(h) : 0;
    const l = 31 & a;
    let m;

    if (0 == l) {
      const a = 0 - (65535 & k) - j;
      j = 1 & a >>> 16;
      const b = 0 - (k >>> 16) - j;
      m = 65535 & a | b << 16;
    } else {
      const a = 32 - l;
      k = k << a >>> a;
      const b = 1 << 32 - a,
            c = (65535 & b) - (65535 & k) - j;
      j = 1 & c >>> 16;
      const d = (b >>> 16) - (k >>> 16) - j;
      m = 65535 & c | d << 16, m &= b - 1;
    }

    return f.__setDigit(h, m), f.__trim();
  }

  __digit(a) {
    return this[a];
  }

  __unsignedDigit(a) {
    return this[a] >>> 0;
  }

  __setDigit(a, b) {
    this[a] = 0 | b;
  }

  __setDigitGrow(a, b) {
    this[a] = 0 | b;
  }

  __halfDigitLength() {
    const a = this.length;
    return 65535 >= this.__unsignedDigit(a - 1) ? 2 * a - 1 : 2 * a;
  }

  __halfDigit(a) {
    return 65535 & this[a >>> 1] >>> ((1 & a) << 4);
  }

  __setHalfDigit(a, b) {
    const c = a >>> 1,
          d = this.__digit(c),
          e = 1 & a ? 65535 & d | b << 16 : 4294901760 & d | 65535 & b;

    this.__setDigit(c, e);
  }

  static __digitPow(a, b) {
    let c = 1;

    for (; 0 < b;) 1 & b && (c *= a), b >>>= 1, a *= a;

    return c;
  }

}

JSBI.__kMaxLength = 33554432, JSBI.__kMaxLengthBits = JSBI.__kMaxLength << 5, JSBI.__kMaxBitsPerChar = [0, 0, 32, 51, 64, 75, 83, 90, 96, 102, 107, 111, 115, 119, 122, 126, 128, 131, 134, 136, 139, 141, 143, 145, 147, 149, 151, 153, 154, 156, 158, 159, 160, 162, 163, 165, 166], JSBI.__kBitsPerCharTableShift = 5, JSBI.__kBitsPerCharTableMultiplier = 1 << JSBI.__kBitsPerCharTableShift, JSBI.__kConversionChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"], JSBI.__kBitConversionBuffer = new ArrayBuffer(8), JSBI.__kBitConversionDouble = new Float64Array(JSBI.__kBitConversionBuffer), JSBI.__kBitConversionInts = new Int32Array(JSBI.__kBitConversionBuffer), JSBI.__clz32 = Math.clz32 || function (a) {
  return 0 === a ? 32 : 0 | 31 - (0 | Math.log(a >>> 0) / Math.LN2);
}, JSBI.__imul = Math.imul || function (c, a) {
  return 0 | c * a;
};
var _default = JSBI;
exports.default = _default;

},{}],9:[function(require,module,exports){
(function (global,Buffer,setImmediate){(function (){
/*!

JSZip v3.6.0 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/master/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/master/LICENSE
*/

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).JSZip=e()}}(function(){return function s(a,o,u){function h(r,e){if(!o[r]){if(!a[r]){var t="function"==typeof require&&require;if(!e&&t)return t(r,!0);if(f)return f(r,!0);var n=new Error("Cannot find module '"+r+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[r]={exports:{}};a[r][0].call(i.exports,function(e){var t=a[r][1][e];return h(t||e)},i,i.exports,s,a,o,u)}return o[r].exports}for(var f="function"==typeof require&&require,e=0;e<u.length;e++)h(u[e]);return h}({1:[function(l,t,n){(function(r){!function(e){"object"==typeof n&&void 0!==t?t.exports=e():("undefined"!=typeof window?window:void 0!==r?r:"undefined"!=typeof self?self:this).JSZip=e()}(function(){return function s(a,o,u){function h(t,e){if(!o[t]){if(!a[t]){var r="function"==typeof l&&l;if(!e&&r)return r(t,!0);if(f)return f(t,!0);var n=new Error("Cannot find module '"+t+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[t]={exports:{}};a[t][0].call(i.exports,function(e){return h(a[t][1][e]||e)},i,i.exports,s,a,o,u)}return o[t].exports}for(var f="function"==typeof l&&l,e=0;e<u.length;e++)h(u[e]);return h}({1:[function(l,t,n){(function(r){!function(e){"object"==typeof n&&void 0!==t?t.exports=e():("undefined"!=typeof window?window:void 0!==r?r:"undefined"!=typeof self?self:this).JSZip=e()}(function(){return function s(a,o,u){function h(t,e){if(!o[t]){if(!a[t]){var r="function"==typeof l&&l;if(!e&&r)return r(t,!0);if(f)return f(t,!0);var n=new Error("Cannot find module '"+t+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[t]={exports:{}};a[t][0].call(i.exports,function(e){return h(a[t][1][e]||e)},i,i.exports,s,a,o,u)}return o[t].exports}for(var f="function"==typeof l&&l,e=0;e<u.length;e++)h(u[e]);return h}({1:[function(l,t,n){(function(r){!function(e){"object"==typeof n&&void 0!==t?t.exports=e():("undefined"!=typeof window?window:void 0!==r?r:"undefined"!=typeof self?self:this).JSZip=e()}(function(){return function s(a,o,u){function h(t,e){if(!o[t]){if(!a[t]){var r="function"==typeof l&&l;if(!e&&r)return r(t,!0);if(f)return f(t,!0);var n=new Error("Cannot find module '"+t+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[t]={exports:{}};a[t][0].call(i.exports,function(e){return h(a[t][1][e]||e)},i,i.exports,s,a,o,u)}return o[t].exports}for(var f="function"==typeof l&&l,e=0;e<u.length;e++)h(u[e]);return h}({1:[function(l,t,n){(function(r){!function(e){"object"==typeof n&&void 0!==t?t.exports=e():("undefined"!=typeof window?window:void 0!==r?r:"undefined"!=typeof self?self:this).JSZip=e()}(function(){return function s(a,o,u){function h(t,e){if(!o[t]){if(!a[t]){var r="function"==typeof l&&l;if(!e&&r)return r(t,!0);if(f)return f(t,!0);var n=new Error("Cannot find module '"+t+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[t]={exports:{}};a[t][0].call(i.exports,function(e){return h(a[t][1][e]||e)},i,i.exports,s,a,o,u)}return o[t].exports}for(var f="function"==typeof l&&l,e=0;e<u.length;e++)h(u[e]);return h}({1:[function(l,t,n){(function(r){!function(e){"object"==typeof n&&void 0!==t?t.exports=e():("undefined"!=typeof window?window:void 0!==r?r:"undefined"!=typeof self?self:this).JSZip=e()}(function(){return function s(a,o,u){function h(t,e){if(!o[t]){if(!a[t]){var r="function"==typeof l&&l;if(!e&&r)return r(t,!0);if(f)return f(t,!0);var n=new Error("Cannot find module '"+t+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[t]={exports:{}};a[t][0].call(i.exports,function(e){return h(a[t][1][e]||e)},i,i.exports,s,a,o,u)}return o[t].exports}for(var f="function"==typeof l&&l,e=0;e<u.length;e++)h(u[e]);return h}({1:[function(e,t,r){"use strict";var c=e("./utils"),l=e("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(e){for(var t,r,n,i,s,a,o,u=[],h=0,f=e.length,l=f,d="string"!==c.getTypeOf(e);h<e.length;)l=f-h,n=d?(t=e[h++],r=h<f?e[h++]:0,h<f?e[h++]:0):(t=e.charCodeAt(h++),r=h<f?e.charCodeAt(h++):0,h<f?e.charCodeAt(h++):0),i=t>>2,s=(3&t)<<4|r>>4,a=1<l?(15&r)<<2|n>>6:64,o=2<l?63&n:64,u.push(p.charAt(i)+p.charAt(s)+p.charAt(a)+p.charAt(o));return u.join("")},r.decode=function(e){var t,r,n,i,s,a,o=0,u=0;if("data:"===e.substr(0,"data:".length))throw new Error("Invalid base64 input, it looks like a data url.");var h,f=3*(e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"")).length/4;if(e.charAt(e.length-1)===p.charAt(64)&&f--,e.charAt(e.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(h=l.uint8array?new Uint8Array(0|f):new Array(0|f);o<e.length;)t=p.indexOf(e.charAt(o++))<<2|(i=p.indexOf(e.charAt(o++)))>>4,r=(15&i)<<4|(s=p.indexOf(e.charAt(o++)))>>2,n=(3&s)<<6|(a=p.indexOf(e.charAt(o++))),h[u++]=t,64!==s&&(h[u++]=r),64!==a&&(h[u++]=n);return h}},{"./support":30,"./utils":32}],2:[function(e,t,r){"use strict";var n=e("./external"),i=e("./stream/DataWorker"),s=e("./stream/Crc32Probe"),a=e("./stream/DataLengthProbe");function o(e,t,r,n,i){this.compressedSize=e,this.uncompressedSize=t,this.crc32=r,this.compression=n,this.compressedContent=i}o.prototype={getContentWorker:function(){var e=new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),t=this;return e.on("end",function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),e},getCompressedWorker:function(){return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(e,t,r){return e.pipe(new s).pipe(new a("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",t)},t.exports=o},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(e,t,r){"use strict";var n=e("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(e){return new n("STORE compression")},uncompressWorker:function(){return new n("STORE decompression")}},r.DEFLATE=e("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(e,t,r){"use strict";var n=e("./utils"),a=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t){return void 0!==e&&e.length?"string"!==n.getTypeOf(e)?function(e,t,r){var n=a,i=0+r;e^=-1;for(var s=0;s<i;s++)e=e>>>8^n[255&(e^t[s])];return-1^e}(0|t,e,e.length):function(e,t,r){var n=a,i=0+r;e^=-1;for(var s=0;s<i;s++)e=e>>>8^n[255&(e^t.charCodeAt(s))];return-1^e}(0|t,e,e.length):0}},{"./utils":32}],5:[function(e,t,r){"use strict";r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null},{}],6:[function(e,t,r){"use strict";var n;n="undefined"!=typeof Promise?Promise:e("lie"),t.exports={Promise:n}},{lie:37}],7:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,i=e("pako"),s=e("./utils"),a=e("./stream/GenericWorker"),o=n?"uint8array":"array";function u(e,t){a.call(this,"FlateWorker/"+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={}}r.magic="\b\0",s.inherits(u,a),u.prototype.processChunk=function(e){this.meta=e.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,e.data),!1)},u.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},u.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null},u.prototype._createPako=function(){this._pako=new i[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var t=this;this._pako.onData=function(e){t.push({data:e,meta:t.meta})}},r.compressWorker=function(e){return new u("Deflate",e)},r.uncompressWorker=function(){return new u("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(e,t,r){"use strict";function I(e,t){var r,n="";for(r=0;r<t;r++)n+=String.fromCharCode(255&e),e>>>=8;return n}function i(e,t,r,n,i,s){var a,o,u=e.file,h=e.compression,f=s!==B.utf8encode,l=O.transformTo("string",s(u.name)),d=O.transformTo("string",B.utf8encode(u.name)),c=u.comment,p=O.transformTo("string",s(c)),m=O.transformTo("string",B.utf8encode(c)),_=d.length!==u.name.length,g=m.length!==c.length,v="",b="",w="",y=u.dir,k=u.date,x={crc32:0,compressedSize:0,uncompressedSize:0};t&&!r||(x.crc32=e.crc32,x.compressedSize=e.compressedSize,x.uncompressedSize=e.uncompressedSize);var S=0;t&&(S|=8),f||!_&&!g||(S|=2048);var z,E=0,C=0;y&&(E|=16),"UNIX"===i?(C=798,E|=((z=u.unixPermissions)||(z=y?16893:33204),(65535&z)<<16)):(C=20,E|=63&(u.dosPermissions||0)),a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v+="up"+I((b=I(1,1)+I(T(l),4)+d).length,2)+b),g&&(v+="uc"+I((w=I(1,1)+I(T(p),4)+m).length,2)+w);var A="";return A+="\n\0",A+=I(S,2),A+=h.magic,A+=I(a,2),A+=I(o,2),A+=I(x.crc32,4),A+=I(x.compressedSize,4),A+=I(x.uncompressedSize,4),A+=I(l.length,2),A+=I(v.length,2),{fileRecord:R.LOCAL_FILE_HEADER+A+l+v,dirRecord:R.CENTRAL_FILE_HEADER+I(C,2)+A+I(p.length,2)+"\0\0\0\0"+I(E,4)+I(n,4)+l+v+p}}var O=e("../utils"),s=e("../stream/GenericWorker"),B=e("../utf8"),T=e("../crc32"),R=e("../signature");function n(e,t,r,n){s.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=r,this.encodeFileName=n,this.streamFiles=e,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}O.inherits(n,s),n.prototype.push=function(e){var t=e.meta.percent||0,r=this.entriesCount,n=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,s.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:r?(t+100*(r-n-1))/r:100}}))},n.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var r=i(e,t,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=!0},n.prototype.closedSource=function(e){this.accumulate=!1;var t,r=this.streamFiles&&!e.file.dir,n=i(e,r,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(n.dirRecord),r)this.push({data:(t=e,R.DATA_DESCRIPTOR+I(t.crc32,4)+I(t.compressedSize,4)+I(t.uncompressedSize,4)),meta:{percent:100}});else for(this.push({data:n.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},n.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var r,n,i,s,a,o,u=this.bytesWritten-e,h=(r=this.dirRecords.length,n=u,i=e,s=this.zipComment,a=this.encodeFileName,o=O.transformTo("string",a(s)),R.CENTRAL_DIRECTORY_END+"\0\0\0\0"+I(r,2)+I(r,2)+I(n,4)+I(i,4)+I(o.length,2)+o);this.push({data:h,meta:{percent:100}})},n.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},n.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end()}),e.on("error",function(e){t.error(e)}),this},n.prototype.resume=function(){return!!s.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},n.prototype.error=function(e){var t=this._sources;if(!s.prototype.error.call(this,e))return!1;for(var r=0;r<t.length;r++)try{t[r].error(e)}catch(e){}return!0},n.prototype.lock=function(){s.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock()},t.exports=n},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(e,t,r){"use strict";var h=e("../compressions"),n=e("./ZipFileWorker");r.generateWorker=function(e,a,t){var o=new n(a.streamFiles,t,a.platform,a.encodeFileName),u=0;try{e.forEach(function(e,t){u++;var r=function(e,t){var r=e||t,n=h[r];if(!n)throw new Error(r+" is not a valid compression method !");return n}(t.options.compression,a.compression),n=t.options.compressionOptions||a.compressionOptions||{},i=t.dir,s=t.date;t._compressWorker(r,n).withStreamInfo("file",{name:e,dir:i,date:s,comment:t.comment||"",unixPermissions:t.unixPermissions,dosPermissions:t.dosPermissions}).pipe(o)}),o.entriesCount=u}catch(e){o.error(e)}return o}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(e,t,r){"use strict";function n(){if(!(this instanceof n))return new n;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files={},this.comment=null,this.root="",this.clone=function(){var e=new n;for(var t in this)"function"!=typeof this[t]&&(e[t]=this[t]);return e}}(n.prototype=e("./object")).loadAsync=e("./load"),n.support=e("./support"),n.defaults=e("./defaults"),n.version="3.5.0",n.loadAsync=function(e,t){return(new n).loadAsync(e,t)},n.external=e("./external"),t.exports=n},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(e,t,r){"use strict";var n=e("./utils"),i=e("./external"),o=e("./utf8"),u=e("./zipEntries"),s=e("./stream/Crc32Probe"),h=e("./nodejsUtils");function f(n){return new i.Promise(function(e,t){var r=n.decompressed.getContentWorker().pipe(new s);r.on("error",function(e){t(e)}).on("end",function(){r.streamInfo.crc32!==n.decompressed.crc32?t(new Error("Corrupted zip : CRC32 mismatch")):e()}).resume()})}t.exports=function(e,s){var a=this;return s=n.extend(s||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:o.utf8decode}),h.isNode&&h.isStream(e)?i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):n.prepareContent("the loaded zip file",e,!0,s.optimizedBinaryString,s.base64).then(function(e){var t=new u(s);return t.load(e),t}).then(function(e){var t=[i.Promise.resolve(e)],r=e.files;if(s.checkCRC32)for(var n=0;n<r.length;n++)t.push(f(r[n]));return i.Promise.all(t)}).then(function(e){for(var t=e.shift(),r=t.files,n=0;n<r.length;n++){var i=r[n];a.file(i.fileNameStr,i.decompressed,{binary:!0,optimizedBinaryString:!0,date:i.date,dir:i.dir,comment:i.fileCommentStr.length?i.fileCommentStr:null,unixPermissions:i.unixPermissions,dosPermissions:i.dosPermissions,createFolders:s.createFolders})}return t.zipComment.length&&(a.comment=t.zipComment),a})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../stream/GenericWorker");function s(e,t){i.call(this,"Nodejs stream input adapter for "+e),this._upstreamEnded=!1,this._bindStream(t)}n.inherits(s,i),s.prototype._bindStream=function(e){var t=this;(this._stream=e).pause(),e.on("data",function(e){t.push({data:e,meta:{percent:0}})}).on("error",function(e){t.isPaused?this.generatedError=e:t.error(e)}).on("end",function(){t.isPaused?t._upstreamEnded=!0:t.end()})},s.prototype.pause=function(){return!!i.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},t.exports=s},{"../stream/GenericWorker":28,"../utils":32}],13:[function(e,t,r){"use strict";var i=e("readable-stream").Readable;function n(e,t,r){i.call(this,t),this._helper=e;var n=this;e.on("data",function(e,t){n.push(e)||n._helper.pause(),r&&r(t)}).on("error",function(e){n.emit("error",e)}).on("end",function(){n.push(null)})}e("../utils").inherits(n,i),n.prototype._read=function(){this._helper.resume()},t.exports=n},{"../utils":32,"readable-stream":16}],14:[function(e,t,r){"use strict";t.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if("number"==typeof e)throw new Error('The "data" argument must not be a number');return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&"function"==typeof e.on&&"function"==typeof e.pause&&"function"==typeof e.resume}}},{}],15:[function(e,t,r){"use strict";function s(e,t,r){var n,i=f.getTypeOf(t),s=f.extend(r||{},d);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(e=h(e)),s.createFolders&&(n=function(e){"/"===e.slice(-1)&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf("/");return 0<t?e.substring(0,t):""}(e))&&g.call(this,n,!0);var a,o="string"===i&&!1===s.binary&&!1===s.base64;r&&void 0!==r.binary||(s.binary=!o),(t instanceof c&&0===t.uncompressedSize||s.dir||!t||0===t.length)&&(s.base64=!1,s.binary=!0,t="",s.compression="STORE",i="string"),a=t instanceof c||t instanceof l?t:m.isNode&&m.isStream(t)?new _(e,t):f.prepareContent(e,t,s.binary,s.optimizedBinaryString,s.base64);var u=new p(e,a,s);this.files[e]=u}function h(e){return"/"!==e.slice(-1)&&(e+="/"),e}var i=e("./utf8"),f=e("./utils"),l=e("./stream/GenericWorker"),a=e("./stream/StreamHelper"),d=e("./defaults"),c=e("./compressedObject"),p=e("./zipObject"),o=e("./generate"),m=e("./nodejsUtils"),_=e("./nodejs/NodejsStreamInputAdapter"),g=function(e,t){return t=void 0!==t?t:d.createFolders,e=h(e),this.files[e]||s.call(this,e,null,{dir:!0,createFolders:t}),this.files[e]};function u(e){return"[object RegExp]"===Object.prototype.toString.call(e)}var n={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(e){var t,r,n;for(t in this.files)this.files.hasOwnProperty(t)&&(n=this.files[t],(r=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(r,n))},filter:function(r){var n=[];return this.forEach(function(e,t){r(e,t)&&n.push(t)}),n},file:function(e,t,r){if(1!==arguments.length)return e=this.root+e,s.call(this,e,t,r),this;if(u(e)){var n=e;return this.filter(function(e,t){return!t.dir&&n.test(e)})}var i=this.files[this.root+e];return i&&!i.dir?i:null},folder:function(r){if(!r)return this;if(u(r))return this.filter(function(e,t){return t.dir&&r.test(e)});var e=this.root+r,t=g.call(this,e),n=this.clone();return n.root=t.name,n},remove:function(r){r=this.root+r;var e=this.files[r];if(e||("/"!==r.slice(-1)&&(r+="/"),e=this.files[r]),e&&!e.dir)delete this.files[r];else for(var t=this.filter(function(e,t){return t.name.slice(0,r.length)===r}),n=0;n<t.length;n++)delete this.files[t[n].name];return this},generate:function(e){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(e){var t,r={};try{if((r=f.extend(e||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:i.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");f.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var n=r.comment||this.comment||"";t=o.generateWorker(this,r,n)}catch(e){(t=new l("error")).error(e)}return new a(t,r.type||"string",r.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return(e=e||{}).type||(e.type="nodebuffer"),this.generateInternalStream(e).toNodejsStream(t)}};t.exports=n},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(e,t,r){t.exports=e("stream")},{stream:void 0}],17:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t]}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data[this.zero+e]},i.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===t&&this.data[s+1]===r&&this.data[s+2]===n&&this.data[s+3]===i)return s-this.zero;return-1},i.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.readData(4);return t===s[0]&&r===s[1]&&n===s[2]&&i===s[3]},i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return[];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],18:[function(e,t,r){"use strict";var n=e("../utils");function i(e){this.data=e,this.length=e.length,this.index=0,this.zero=0}i.prototype={checkOffset:function(e){this.checkIndex(this.index+e)},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+e+"). Corrupted zip ?")},setIndex:function(e){this.checkIndex(e),this.index=e},skip:function(e){this.setIndex(this.index+e)},byteAt:function(e){},readInt:function(e){var t,r=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)r=(r<<8)+this.byteAt(t);return this.index+=e,r},readString:function(e){return n.transformTo("string",this.readData(e))},readData:function(e){},lastIndexOfSignature:function(e){},readAndCheckSignature:function(e){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},t.exports=i},{"../utils":32}],19:[function(e,t,r){"use strict";var n=e("./Uint8ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},i.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},i.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],21:[function(e,t,r){"use strict";var n=e("./ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return new Uint8Array(0);var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./ArrayReader":17}],22:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../support"),s=e("./ArrayReader"),a=e("./StringReader"),o=e("./NodeBufferReader"),u=e("./Uint8ArrayReader");t.exports=function(e){var t=n.getTypeOf(e);return n.checkSupport(t),"string"!==t||i.uint8array?"nodebuffer"===t?new o(e):i.uint8array?new u(n.transformTo("uint8array",e)):new s(n.transformTo("array",e)):new a(e)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(e,t,r){"use strict";r.LOCAL_FILE_HEADER="PK",r.CENTRAL_FILE_HEADER="PK",r.CENTRAL_DIRECTORY_END="PK",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",r.ZIP64_CENTRAL_DIRECTORY_END="PK",r.DATA_DESCRIPTOR="PK\b"},{}],24:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../utils");function s(e){n.call(this,"ConvertWorker to "+e),this.destType=e}i.inherits(s,n),s.prototype.processChunk=function(e){this.push({data:i.transformTo(this.destType,e.data),meta:e.meta})},t.exports=s},{"../utils":32,"./GenericWorker":28}],25:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../crc32");function s(){n.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}e("../utils").inherits(s,n),s.prototype.processChunk=function(e){this.streamInfo.crc32=i(e.data,this.streamInfo.crc32||0),this.push(e)},t.exports=s},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataLengthProbe for "+e),this.propName=e,this.withStreamInfo(e,0)}n.inherits(s,i),s.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length}i.prototype.processChunk.call(this,e)},t.exports=s},{"../utils":32,"./GenericWorker":28}],27:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataWorker");var t=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,e.then(function(e){t.dataIsReady=!0,t.data=e,t.max=e&&e.length||0,t.type=n.getTypeOf(e),t.isPaused||t._tickAndRepeat()},function(e){t.error(e)})}n.inherits(s,i),s.prototype.cleanUp=function(){i.prototype.cleanUp.call(this),this.data=null},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,n.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(n.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":e=this.data.substring(this.index,t);break;case"uint8array":e=this.data.subarray(this.index,t);break;case"array":case"nodebuffer":e=this.data.slice(this.index,t)}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},t.exports=s},{"../utils":32,"./GenericWorker":28}],28:[function(e,t,r){"use strict";function n(e){this.name=e||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}n.prototype={push:function(e){this.emit("data",e)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(e){this.emit("error",e)}return!0},error:function(e){return!this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=!0,this.emit("error",e),this.previous&&this.previous.error(e),this.cleanUp()),!0)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(e,t){if(this._listeners[e])for(var r=0;r<this._listeners[e].length;r++)this._listeners[e][r].call(this,t)},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.end()}),e.on("error",function(e){t.error(e)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var e=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),e=!0),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e)},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)this.extraStreamInfo.hasOwnProperty(e)&&(this.streamInfo[e]=this.extraStreamInfo[e])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var e="Worker "+this.name;return this.previous?this.previous+" -> "+e:e}},t.exports=n},{}],29:[function(e,t,r){"use strict";var h=e("../utils"),i=e("./ConvertWorker"),s=e("./GenericWorker"),f=e("../base64"),n=e("../support"),a=e("../external"),o=null;if(n.nodestream)try{o=e("../nodejs/NodejsStreamOutputAdapter")}catch(e){}function u(e,t,r){var n=t;switch(t){case"blob":case"arraybuffer":n="uint8array";break;case"base64":n="string"}try{this._internalType=n,this._outputType=t,this._mimeType=r,h.checkSupport(n),this._worker=e.pipe(new i(n)),e.lock()}catch(e){this._worker=new s("error"),this._worker.error(e)}}u.prototype={accumulate:function(e){return o=this,u=e,new a.Promise(function(t,r){var n=[],i=o._internalType,s=o._outputType,a=o._mimeType;o.on("data",function(e,t){n.push(e),u&&u(t)}).on("error",function(e){n=[],r(e)}).on("end",function(){try{var e=function(e,t,r){switch(e){case"blob":return h.newBlob(h.transformTo("arraybuffer",t),r);case"base64":return f.encode(t);default:return h.transformTo(e,t)}}(s,function(e,t){var r,n=0,i=null,s=0;for(r=0;r<t.length;r++)s+=t[r].length;switch(e){case"string":return t.join("");case"array":return Array.prototype.concat.apply([],t);case"uint8array":for(i=new Uint8Array(s),r=0;r<t.length;r++)i.set(t[r],n),n+=t[r].length;return i;case"nodebuffer":return Buffer.concat(t);default:throw new Error("concat : unsupported type '"+e+"'")}}(i,n),a);t(e)}catch(e){r(e)}n=[]}).resume()});var o,u},on:function(e,t){var r=this;return"data"===e?this._worker.on(e,function(e){t.call(r,e.data,e.meta)}):this._worker.on(e,function(){h.delay(t,arguments,r)}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},e)}},t.exports=u},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(e,t,r){"use strict";if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else{var n=new ArrayBuffer(0);try{r.blob=0===new Blob([n],{type:"application/zip"}).size}catch(e){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);i.append(n),r.blob=0===i.getBlob("application/zip").size}catch(e){r.blob=!1}}}try{r.nodestream=!!e("readable-stream").Readable}catch(e){r.nodestream=!1}},{"readable-stream":16}],31:[function(e,t,s){"use strict";for(var o=e("./utils"),u=e("./support"),r=e("./nodejsUtils"),n=e("./stream/GenericWorker"),h=new Array(256),i=0;i<256;i++)h[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;function a(){n.call(this,"utf-8 decode"),this.leftOver=null}function f(){n.call(this,"utf-8 encode")}h[254]=h[254]=1,s.utf8encode=function(e){return u.nodebuffer?r.newBufferFrom(e,"utf-8"):function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=u.uint8array?new Uint8Array(o):new Array(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t}(e)},s.utf8decode=function(e){return u.nodebuffer?o.transformTo("nodebuffer",e).toString("utf-8"):function(e){var t,r,n,i,s=e.length,a=new Array(2*s);for(t=r=0;t<s;)if((n=e[t++])<128)a[r++]=n;else if(4<(i=h[n]))a[r++]=65533,t+=i-1;else{for(n&=2===i?31:3===i?15:7;1<i&&t<s;)n=n<<6|63&e[t++],i--;1<i?a[r++]=65533:n<65536?a[r++]=n:(n-=65536,a[r++]=55296|n>>10&1023,a[r++]=56320|1023&n)}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(e=o.transformTo(u.uint8array?"uint8array":"array",e))},o.inherits(a,n),a.prototype.processChunk=function(e){var t=o.transformTo(u.uint8array?"uint8array":"array",e.data);if(this.leftOver&&this.leftOver.length){if(u.uint8array){var r=t;(t=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),t.set(r,this.leftOver.length)}else t=this.leftOver.concat(t);this.leftOver=null}var n=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+h[e[r]]>t?r:t}(t),i=t;n!==t.length&&(u.uint8array?(i=t.subarray(0,n),this.leftOver=t.subarray(n,t.length)):(i=t.slice(0,n),this.leftOver=t.slice(n,t.length))),this.push({data:s.utf8decode(i),meta:e.meta})},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=a,o.inherits(f,n),f.prototype.processChunk=function(e){this.push({data:s.utf8encode(e.data),meta:e.meta})},s.Utf8EncodeWorker=f},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(e,t,o){"use strict";var u=e("./support"),h=e("./base64"),r=e("./nodejsUtils"),n=e("set-immediate-shim"),f=e("./external");function i(e){return e}function l(e,t){for(var r=0;r<e.length;++r)t[r]=255&e.charCodeAt(r);return t}o.newBlob=function(t,r){o.checkSupport("blob");try{return new Blob([t],{type:r})}catch(e){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return n.append(t),n.getBlob(r)}catch(e){throw new Error("Bug : can't construct the Blob.")}}};var s={stringifyByChunk:function(e,t,r){var n=[],i=0,s=e.length;if(s<=r)return String.fromCharCode.apply(null,e);for(;i<s;)"array"===t||"nodebuffer"===t?n.push(String.fromCharCode.apply(null,e.slice(i,Math.min(i+r,s)))):n.push(String.fromCharCode.apply(null,e.subarray(i,Math.min(i+r,s)))),i+=r;return n.join("")},stringifyByChar:function(e){for(var t="",r=0;r<e.length;r++)t+=String.fromCharCode(e[r]);return t},applyCanBeUsed:{uint8array:function(){try{return u.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(e){return!1}}(),nodebuffer:function(){try{return u.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(e){return!1}}()}};function a(e){var t=65536,r=o.getTypeOf(e),n=!0;if("uint8array"===r?n=s.applyCanBeUsed.uint8array:"nodebuffer"===r&&(n=s.applyCanBeUsed.nodebuffer),n)for(;1<t;)try{return s.stringifyByChunk(e,r,t)}catch(e){t=Math.floor(t/2)}return s.stringifyByChar(e)}function d(e,t){for(var r=0;r<e.length;r++)t[r]=e[r];return t}o.applyFromCharCode=a;var c={};c.string={string:i,array:function(e){return l(e,new Array(e.length))},arraybuffer:function(e){return c.string.uint8array(e).buffer},uint8array:function(e){return l(e,new Uint8Array(e.length))},nodebuffer:function(e){return l(e,r.allocBuffer(e.length))}},c.array={string:a,array:i,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(e)}},c.arraybuffer={string:function(e){return a(new Uint8Array(e))},array:function(e){return d(new Uint8Array(e),new Array(e.byteLength))},arraybuffer:i,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(new Uint8Array(e))}},c.uint8array={string:a,array:function(e){return d(e,new Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:i,nodebuffer:function(e){return r.newBufferFrom(e)}},c.nodebuffer={string:a,array:function(e){return d(e,new Array(e.length))},arraybuffer:function(e){return c.nodebuffer.uint8array(e).buffer},uint8array:function(e){return d(e,new Uint8Array(e.length))},nodebuffer:i},o.transformTo=function(e,t){if(t=t||"",!e)return t;o.checkSupport(e);var r=o.getTypeOf(t);return c[r][e](t)},o.getTypeOf=function(e){return"string"==typeof e?"string":"[object Array]"===Object.prototype.toString.call(e)?"array":u.nodebuffer&&r.isBuffer(e)?"nodebuffer":u.uint8array&&e instanceof Uint8Array?"uint8array":u.arraybuffer&&e instanceof ArrayBuffer?"arraybuffer":void 0},o.checkSupport=function(e){if(!u[e.toLowerCase()])throw new Error(e+" is not supported by this platform")},o.MAX_VALUE_16BITS=65535,o.MAX_VALUE_32BITS=-1,o.pretty=function(e){var t,r,n="";for(r=0;r<(e||"").length;r++)n+="\\x"+((t=e.charCodeAt(r))<16?"0":"")+t.toString(16).toUpperCase();return n},o.delay=function(e,t,r){n(function(){e.apply(r||null,t||[])})},o.inherits=function(e,t){function r(){}r.prototype=t.prototype,e.prototype=new r},o.extend=function(){var e,t,r={};for(e=0;e<arguments.length;e++)for(t in arguments[e])arguments[e].hasOwnProperty(t)&&void 0===r[t]&&(r[t]=arguments[e][t]);return r},o.prepareContent=function(n,e,i,s,a){return f.Promise.resolve(e).then(function(n){return u.blob&&(n instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(n)))&&"undefined"!=typeof FileReader?new f.Promise(function(t,r){var e=new FileReader;e.onload=function(e){t(e.target.result)},e.onerror=function(e){r(e.target.error)},e.readAsArrayBuffer(n)}):n}).then(function(e){var t,r=o.getTypeOf(e);return r?("arraybuffer"===r?e=o.transformTo("uint8array",e):"string"===r&&(a?e=h.decode(e):i&&!0!==s&&(e=l(t=e,u.uint8array?new Uint8Array(t.length):new Array(t.length)))),e):f.Promise.reject(new Error("Can't read the data of '"+n+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,"set-immediate-shim":54}],33:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),i=e("./utils"),s=e("./signature"),a=e("./zipEntry"),o=(e("./utf8"),e("./support"));function u(e){this.files=[],this.loadOptions=e}u.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+i.pretty(t)+", expected "+i.pretty(e)+")")}},isSignature:function(e,t){var r=this.reader.index;this.reader.setIndex(e);var n=this.reader.readString(4)===t;return this.reader.setIndex(r),n},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=o.uint8array?"uint8array":"array",r=i.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,r,n=this.zip64EndOfCentralSize-44;0<n;)e=this.reader.readInt(2),t=this.reader.readInt(4),r=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:r}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var e,t;for(e=0;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.handleUTF8(),t.processAttributes()},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(e=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(e<0)throw this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Corrupted zip: can't find end of central directory"):new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");this.reader.setIndex(e);var t=e;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===i.MAX_VALUE_16BITS||this.diskWithCentralDirStart===i.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===i.MAX_VALUE_16BITS||this.centralDirRecords===i.MAX_VALUE_16BITS||this.centralDirSize===i.MAX_VALUE_32BITS||this.centralDirOffset===i.MAX_VALUE_32BITS){if(this.zip64=!0,(e=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(e),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var n=t-r;if(0<n)this.isSignature(t,s.CENTRAL_FILE_HEADER)||(this.reader.zero=n);else if(n<0)throw new Error("Corrupted zip: missing "+Math.abs(n)+" bytes.")},prepareReader:function(e){this.reader=n(e)},load:function(e){this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},t.exports=u},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utf8":31,"./utils":32,"./zipEntry":34}],34:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),s=e("./utils"),i=e("./compressedObject"),a=e("./crc32"),o=e("./utf8"),u=e("./compressions"),h=e("./support");function f(e,t){this.options=e,this.loadOptions=t}f.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(e){var t,r;if(e.skip(22),this.fileNameLength=e.readInt(2),r=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(t=function(e){for(var t in u)if(u.hasOwnProperty(t)&&u[t].magic===e)return u[t];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new i(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize))},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==e&&(this.dosPermissions=63&this.externalFileAttributes),3==e&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(e){if(this.extraFields[1]){var t=n(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=t.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=t.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=t.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=t.readInt(4))}},readExtraFields:function(e){var t,r,n,i=e.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});e.index+4<i;)t=e.readInt(2),r=e.readInt(2),n=e.readData(r),this.extraFields[t]={id:t,length:r,value:n};e.setIndex(i)},handleUTF8:function(){var e=h.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else{var t=this.findExtraFieldUnicodePath();if(null!==t)this.fileNameStr=t;else{var r=s.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var n=this.findExtraFieldUnicodeComment();if(null!==n)this.fileCommentStr=n;else{var i=s.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(i)}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileName)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileComment)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null}},t.exports=f},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(e,t,r){"use strict";function n(e,t,r){this.name=e,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=t,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}}var s=e("./stream/StreamHelper"),i=e("./stream/DataWorker"),a=e("./utf8"),o=e("./compressedObject"),u=e("./stream/GenericWorker");n.prototype={internalStream:function(e){var t=null,r="string";try{if(!e)throw new Error("No output type specified.");var n="string"===(r=e.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),t=this._decompressWorker();var i=!this._dataBinary;i&&!n&&(t=t.pipe(new a.Utf8EncodeWorker)),!i&&n&&(t=t.pipe(new a.Utf8DecodeWorker))}catch(e){(t=new u("error")).error(e)}return new s(t,r,"")},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||"nodebuffer").toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof o&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,e,t)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof u?this._data:new i(this._data)}};for(var h=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],f=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},l=0;l<h.length;l++)n.prototype[h[l]]=f;t.exports=n},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(e,f,t){(function(t){"use strict";var r,n,e=t.MutationObserver||t.WebKitMutationObserver;if(e){var i=0,s=new e(h),a=t.document.createTextNode("");s.observe(a,{characterData:!0}),r=function(){a.data=i=++i%2}}else if(t.setImmediate||void 0===t.MessageChannel)r="document"in t&&"onreadystatechange"in t.document.createElement("script")?function(){var e=t.document.createElement("script");e.onreadystatechange=function(){h(),e.onreadystatechange=null,e.parentNode.removeChild(e),e=null},t.document.documentElement.appendChild(e)}:function(){setTimeout(h,0)};else{var o=new t.MessageChannel;o.port1.onmessage=h,r=function(){o.port2.postMessage(0)}}var u=[];function h(){var e,t;n=!0;for(var r=u.length;r;){for(t=u,u=[],e=-1;++e<r;)t[e]();r=u.length}n=!1}f.exports=function(e){1!==u.push(e)||n||r()}}).call(this,void 0!==r?r:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],37:[function(e,t,r){"use strict";var i=e("immediate");function h(){}var f={},s=["REJECTED"],a=["FULFILLED"],n=["PENDING"];function o(e){if("function"!=typeof e)throw new TypeError("resolver must be a function");this.state=n,this.queue=[],this.outcome=void 0,e!==h&&c(this,e)}function u(e,t,r){this.promise=e,"function"==typeof t&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function l(t,r,n){i(function(){var e;try{e=r(n)}catch(e){return f.reject(t,e)}e===t?f.reject(t,new TypeError("Cannot resolve promise with itself")):f.resolve(t,e)})}function d(e){var t=e&&e.then;if(e&&("object"==typeof e||"function"==typeof e)&&"function"==typeof t)return function(){t.apply(e,arguments)}}function c(t,e){var r=!1;function n(e){r||(r=!0,f.reject(t,e))}function i(e){r||(r=!0,f.resolve(t,e))}var s=p(function(){e(i,n)});"error"===s.status&&n(s.value)}function p(e,t){var r={};try{r.value=e(t),r.status="success"}catch(e){r.status="error",r.value=e}return r}(t.exports=o).prototype.finally=function(t){if("function"!=typeof t)return this;var r=this.constructor;return this.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})})},o.prototype.catch=function(e){return this.then(null,e)},o.prototype.then=function(e,t){if("function"!=typeof e&&this.state===a||"function"!=typeof t&&this.state===s)return this;var r=new this.constructor(h);return this.state!==n?l(r,this.state===a?e:t,this.outcome):this.queue.push(new u(r,e,t)),r},u.prototype.callFulfilled=function(e){f.resolve(this.promise,e)},u.prototype.otherCallFulfilled=function(e){l(this.promise,this.onFulfilled,e)},u.prototype.callRejected=function(e){f.reject(this.promise,e)},u.prototype.otherCallRejected=function(e){l(this.promise,this.onRejected,e)},f.resolve=function(e,t){var r=p(d,t);if("error"===r.status)return f.reject(e,r.value);var n=r.value;if(n)c(e,n);else{e.state=a,e.outcome=t;for(var i=-1,s=e.queue.length;++i<s;)e.queue[i].callFulfilled(t)}return e},f.reject=function(e,t){e.state=s,e.outcome=t;for(var r=-1,n=e.queue.length;++r<n;)e.queue[r].callRejected(t);return e},o.resolve=function(e){return e instanceof this?e:f.resolve(new this(h),e)},o.reject=function(e){var t=new this(h);return f.reject(t,e)},o.all=function(e){var r=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var n=e.length,i=!1;if(!n)return this.resolve([]);for(var s=new Array(n),a=0,t=-1,o=new this(h);++t<n;)u(e[t],t);return o;function u(e,t){r.resolve(e).then(function(e){s[t]=e,++a!==n||i||(i=!0,f.resolve(o,s))},function(e){i||(i=!0,f.reject(o,e))})}},o.race=function(e){if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var t=e.length,r=!1;if(!t)return this.resolve([]);for(var n,i=-1,s=new this(h);++i<t;)n=e[i],this.resolve(n).then(function(e){r||(r=!0,f.resolve(s,e))},function(e){r||(r=!0,f.reject(s,e))});return s}},{immediate:36}],38:[function(e,t,r){"use strict";var n={};(0,e("./lib/utils/common").assign)(n,e("./lib/deflate"),e("./lib/inflate"),e("./lib/zlib/constants")),t.exports=n},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(e,t,r){"use strict";var a=e("./zlib/deflate"),o=e("./utils/common"),u=e("./utils/strings"),i=e("./zlib/messages"),s=e("./zlib/zstream"),h=Object.prototype.toString,f=0,l=-1,d=0,c=8;function p(e){if(!(this instanceof p))return new p(e);this.options=o.assign({level:l,method:c,chunkSize:16384,windowBits:15,memLevel:8,strategy:d,to:""},e||{});var t=this.options;t.raw&&0<t.windowBits?t.windowBits=-t.windowBits:t.gzip&&0<t.windowBits&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var r=a.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(r!==f)throw new Error(i[r]);if(t.header&&a.deflateSetHeader(this.strm,t.header),t.dictionary){var n;if(n="string"==typeof t.dictionary?u.string2buf(t.dictionary):"[object ArrayBuffer]"===h.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,(r=a.deflateSetDictionary(this.strm,n))!==f)throw new Error(i[r]);this._dict_set=!0}}function n(e,t){var r=new p(t);if(r.push(e,!0),r.err)throw r.msg||i[r.err];return r.result}p.prototype.push=function(e,t){var r,n,i=this.strm,s=this.options.chunkSize;if(this.ended)return!1;n=t===~~t?t:!0===t?4:0,"string"==typeof e?i.input=u.string2buf(e):"[object ArrayBuffer]"===h.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;do{if(0===i.avail_out&&(i.output=new o.Buf8(s),i.next_out=0,i.avail_out=s),1!==(r=a.deflate(i,n))&&r!==f)return this.onEnd(r),!(this.ended=!0);0!==i.avail_out&&(0!==i.avail_in||4!==n&&2!==n)||("string"===this.options.to?this.onData(u.buf2binstring(o.shrinkBuf(i.output,i.next_out))):this.onData(o.shrinkBuf(i.output,i.next_out)))}while((0<i.avail_in||0===i.avail_out)&&1!==r);return 4===n?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===f):2!==n||(this.onEnd(f),!(i.avail_out=0))},p.prototype.onData=function(e){this.chunks.push(e)},p.prototype.onEnd=function(e){e===f&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Deflate=p,r.deflate=n,r.deflateRaw=function(e,t){return(t=t||{}).raw=!0,n(e,t)},r.gzip=function(e,t){return(t=t||{}).gzip=!0,n(e,t)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(e,t,r){"use strict";var d=e("./zlib/inflate"),c=e("./utils/common"),p=e("./utils/strings"),m=e("./zlib/constants"),n=e("./zlib/messages"),i=e("./zlib/zstream"),s=e("./zlib/gzheader"),_=Object.prototype.toString;function a(e){if(!(this instanceof a))return new a(e);this.options=c.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new i,this.strm.avail_out=0;var r=d.inflateInit2(this.strm,t.windowBits);if(r!==m.Z_OK)throw new Error(n[r]);this.header=new s,d.inflateGetHeader(this.strm,this.header)}function o(e,t){var r=new a(t);if(r.push(e,!0),r.err)throw r.msg||n[r.err];return r.result}a.prototype.push=function(e,t){var r,n,i,s,a,o,u=this.strm,h=this.options.chunkSize,f=this.options.dictionary,l=!1;if(this.ended)return!1;n=t===~~t?t:!0===t?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof e?u.input=p.binstring2buf(e):"[object ArrayBuffer]"===_.call(e)?u.input=new Uint8Array(e):u.input=e,u.next_in=0,u.avail_in=u.input.length;do{if(0===u.avail_out&&(u.output=new c.Buf8(h),u.next_out=0,u.avail_out=h),(r=d.inflate(u,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&f&&(o="string"==typeof f?p.string2buf(f):"[object ArrayBuffer]"===_.call(f)?new Uint8Array(f):f,r=d.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&!0===l&&(r=m.Z_OK,l=!1),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=!0);u.next_out&&(0!==u.avail_out&&r!==m.Z_STREAM_END&&(0!==u.avail_in||n!==m.Z_FINISH&&n!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(i=p.utf8border(u.output,u.next_out),s=u.next_out-i,a=p.buf2string(u.output,i),u.next_out=s,u.avail_out=h-s,s&&c.arraySet(u.output,u.output,i,s,0),this.onData(a)):this.onData(c.shrinkBuf(u.output,u.next_out)))),0===u.avail_in&&0===u.avail_out&&(l=!0)}while((0<u.avail_in||0===u.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(n=m.Z_FINISH),n===m.Z_FINISH?(r=d.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===m.Z_OK):n!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(u.avail_out=0))},a.prototype.onData=function(e){this.chunks.push(e)},a.prototype.onEnd=function(e){e===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=c.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Inflate=a,r.inflate=o,r.inflateRaw=function(e,t){return(t=t||{}).raw=!0,o(e,t)},r.ungzip=o},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var r=t.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var n in r)r.hasOwnProperty(n)&&(e[n]=r[n])}}return e},r.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var i={arraySet:function(e,t,r,n,i){if(t.subarray&&e.subarray)e.set(t.subarray(r,r+n),i);else for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){var t,r,n,i,s,a;for(t=n=0,r=e.length;t<r;t++)n+=e[t].length;for(a=new Uint8Array(n),t=i=0,r=e.length;t<r;t++)s=e[t],a.set(s,i),i+=s.length;return a}},s={arraySet:function(e,t,r,n,i){for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){return[].concat.apply([],e)}};r.setTyped=function(e){e?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,i)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s))},r.setTyped(n)},{}],42:[function(e,t,r){"use strict";var u=e("./common"),i=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(e){i=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){s=!1}for(var h=new u.Buf8(256),n=0;n<256;n++)h[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;function f(e,t){if(t<65537&&(e.subarray&&s||!e.subarray&&i))return String.fromCharCode.apply(null,u.shrinkBuf(e,t));for(var r="",n=0;n<t;n++)r+=String.fromCharCode(e[n]);return r}h[254]=h[254]=1,r.string2buf=function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=new u.Buf8(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t},r.buf2binstring=function(e){return f(e,e.length)},r.binstring2buf=function(e){for(var t=new u.Buf8(e.length),r=0,n=t.length;r<n;r++)t[r]=e.charCodeAt(r);return t},r.buf2string=function(e,t){var r,n,i,s,a=t||e.length,o=new Array(2*a);for(r=n=0;r<a;)if((i=e[r++])<128)o[n++]=i;else if(4<(s=h[i]))o[n++]=65533,r+=s-1;else{for(i&=2===s?31:3===s?15:7;1<s&&r<a;)i=i<<6|63&e[r++],s--;1<s?o[n++]=65533:i<65536?o[n++]=i:(i-=65536,o[n++]=55296|i>>10&1023,o[n++]=56320|1023&i)}return f(o,n)},r.utf8border=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+h[e[r]]>t?r:t}},{"./common":41}],43:[function(e,t,r){"use strict";t.exports=function(e,t,r,n){for(var i=65535&e|0,s=e>>>16&65535|0,a=0;0!==r;){for(r-=a=2e3<r?2e3:r;s=s+(i=i+t[n++]|0)|0,--a;);i%=65521,s%=65521}return i|s<<16|0}},{}],44:[function(e,t,r){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(e,t,r){"use strict";var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}},{}],46:[function(e,t,r){"use strict";var u,d=e("../utils/common"),h=e("./trees"),c=e("./adler32"),p=e("./crc32"),n=e("./messages"),f=0,l=0,m=-2,i=2,_=8,s=286,a=30,o=19,g=2*s+1,v=15,b=3,w=258,y=w+b+1,k=42,x=113;function S(e,t){return e.msg=n[t],t}function z(e){return(e<<1)-(4<e?9:0)}function E(e){for(var t=e.length;0<=--t;)e[t]=0}function C(e){var t=e.state,r=t.pending;r>e.avail_out&&(r=e.avail_out),0!==r&&(d.arraySet(e.output,t.pending_buf,t.pending_out,r,e.next_out),e.next_out+=r,t.pending_out+=r,e.total_out+=r,e.avail_out-=r,t.pending-=r,0===t.pending&&(t.pending_out=0))}function A(e,t){h._tr_flush_block(e,0<=e.block_start?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,C(e.strm)}function I(e,t){e.pending_buf[e.pending++]=t}function O(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function B(e,t){var r,n,i=e.max_chain_length,s=e.strstart,a=e.prev_length,o=e.nice_match,u=e.strstart>e.w_size-y?e.strstart-(e.w_size-y):0,h=e.window,f=e.w_mask,l=e.prev,d=e.strstart+w,c=h[s+a-1],p=h[s+a];e.prev_length>=e.good_match&&(i>>=2),o>e.lookahead&&(o=e.lookahead);do{if(h[(r=t)+a]===p&&h[r+a-1]===c&&h[r]===h[s]&&h[++r]===h[s+1]){s+=2,r++;do{}while(h[++s]===h[++r]&&h[++s]===h[++r]&&h[++s]===h[++r]&&h[++s]===h[++r]&&h[++s]===h[++r]&&h[++s]===h[++r]&&h[++s]===h[++r]&&h[++s]===h[++r]&&s<d);if(n=w-(d-s),s=d-w,a<n){if(e.match_start=t,o<=(a=n))break;c=h[s+a-1],p=h[s+a]}}}while((t=l[t&f])>u&&0!=--i);return a<=e.lookahead?a:e.lookahead}function T(e){var t,r,n,i,s,a,o,u,h,f,l=e.w_size;do{if(i=e.window_size-e.lookahead-e.strstart,e.strstart>=l+(l-y)){for(d.arraySet(e.window,e.window,l,l,0),e.match_start-=l,e.strstart-=l,e.block_start-=l,t=r=e.hash_size;n=e.head[--t],e.head[t]=l<=n?n-l:0,--r;);for(t=r=l;n=e.prev[--t],e.prev[t]=l<=n?n-l:0,--r;);i+=l}if(0===e.strm.avail_in)break;if(a=e.strm,o=e.window,u=e.strstart+e.lookahead,f=void 0,(h=i)<(f=a.avail_in)&&(f=h),r=0===f?0:(a.avail_in-=f,d.arraySet(o,a.input,a.next_in,f,u),1===a.state.wrap?a.adler=c(a.adler,o,f,u):2===a.state.wrap&&(a.adler=p(a.adler,o,f,u)),a.next_in+=f,a.total_in+=f,f),e.lookahead+=r,e.lookahead+e.insert>=b)for(s=e.strstart-e.insert,e.ins_h=e.window[s],e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+b-1])&e.hash_mask,e.prev[s&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=s,s++,e.insert--,!(e.lookahead+e.insert<b)););}while(e.lookahead<y&&0!==e.strm.avail_in)}function R(e,t){for(var r,n;;){if(e.lookahead<y){if(T(e),e.lookahead<y&&t===f)return 1;if(0===e.lookahead)break}if(r=0,e.lookahead>=b&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+b-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==r&&e.strstart-r<=e.w_size-y&&(e.match_length=B(e,r)),e.match_length>=b)if(n=h._tr_tally(e,e.strstart-e.match_start,e.match_length-b),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=b){for(e.match_length--;e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+b-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart,0!=--e.match_length;);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else n=h._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(n&&(A(e,!1),0===e.strm.avail_out))return 1}return e.insert=e.strstart<b-1?e.strstart:b-1,4===t?(A(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(A(e,!1),0===e.strm.avail_out)?1:2}function D(e,t){for(var r,n,i;;){if(e.lookahead<y){if(T(e),e.lookahead<y&&t===f)return 1;if(0===e.lookahead)break}if(r=0,e.lookahead>=b&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+b-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=b-1,0!==r&&e.prev_length<e.max_lazy_match&&e.strstart-r<=e.w_size-y&&(e.match_length=B(e,r),e.match_length<=5&&(1===e.strategy||e.match_length===b&&4096<e.strstart-e.match_start)&&(e.match_length=b-1)),e.prev_length>=b&&e.match_length<=e.prev_length){for(i=e.strstart+e.lookahead-b,n=h._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-b),e.lookahead-=e.prev_length-1,e.prev_length-=2;++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+b-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!=--e.prev_length;);if(e.match_available=0,e.match_length=b-1,e.strstart++,n&&(A(e,!1),0===e.strm.avail_out))return 1}else if(e.match_available){if((n=h._tr_tally(e,0,e.window[e.strstart-1]))&&A(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return 1}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(n=h._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<b-1?e.strstart:b-1,4===t?(A(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(A(e,!1),0===e.strm.avail_out)?1:2}function F(e,t,r,n,i){this.good_length=e,this.max_lazy=t,this.nice_length=r,this.max_chain=n,this.func=i}function N(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=_,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new d.Buf16(2*g),this.dyn_dtree=new d.Buf16(2*(2*a+1)),this.bl_tree=new d.Buf16(2*(2*o+1)),E(this.dyn_ltree),E(this.dyn_dtree),E(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new d.Buf16(v+1),this.heap=new d.Buf16(2*s+1),E(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new d.Buf16(2*s+1),E(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function U(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=i,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?k:x,e.adler=2===t.wrap?0:1,t.last_flush=f,h._tr_init(t),l):S(e,m)}function P(e){var t,r=U(e);return r===l&&((t=e.state).window_size=2*t.w_size,E(t.head),t.max_lazy_match=u[t.level].max_lazy,t.good_match=u[t.level].good_length,t.nice_match=u[t.level].nice_length,t.max_chain_length=u[t.level].max_chain,t.strstart=0,t.block_start=0,t.lookahead=0,t.insert=0,t.match_length=t.prev_length=b-1,t.match_available=0,t.ins_h=0),r}function L(e,t,r,n,i,s){if(!e)return m;var a=1;if(-1===t&&(t=6),n<0?(a=0,n=-n):15<n&&(a=2,n-=16),i<1||9<i||r!==_||n<8||15<n||t<0||9<t||s<0||4<s)return S(e,m);8===n&&(n=9);var o=new N;return(e.state=o).strm=e,o.wrap=a,o.gzhead=null,o.w_bits=n,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=i+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+b-1)/b),o.window=new d.Buf8(2*o.w_size),o.head=new d.Buf16(o.hash_size),o.prev=new d.Buf16(o.w_size),o.lit_bufsize=1<<i+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new d.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=t,o.strategy=s,o.method=r,P(e)}u=[new F(0,0,0,0,function(e,t){var r=65535;for(r>e.pending_buf_size-5&&(r=e.pending_buf_size-5);;){if(e.lookahead<=1){if(T(e),0===e.lookahead&&t===f)return 1;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var n=e.block_start+r;if((0===e.strstart||e.strstart>=n)&&(e.lookahead=e.strstart-n,e.strstart=n,A(e,!1),0===e.strm.avail_out))return 1;if(e.strstart-e.block_start>=e.w_size-y&&(A(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,4===t?(A(e,!0),0===e.strm.avail_out?3:4):(e.strstart>e.block_start&&(A(e,!1),e.strm.avail_out),1)}),new F(4,4,8,4,R),new F(4,5,16,8,R),new F(4,6,32,32,R),new F(4,4,16,16,D),new F(8,16,32,32,D),new F(8,16,128,128,D),new F(8,32,128,256,D),new F(32,128,258,1024,D),new F(32,258,258,4096,D)],r.deflateInit=function(e,t){return L(e,t,_,15,8,0)},r.deflateInit2=L,r.deflateReset=P,r.deflateResetKeep=U,r.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?m:(e.state.gzhead=t,l):m},r.deflate=function(e,t){var r,n,i,s;if(!e||!e.state||5<t||t<0)return e?S(e,m):m;if(n=e.state,!e.output||!e.input&&0!==e.avail_in||666===n.status&&4!==t)return S(e,0===e.avail_out?-5:m);if(n.strm=e,r=n.last_flush,n.last_flush=t,n.status===k)if(2===n.wrap)e.adler=0,I(n,31),I(n,139),I(n,8),n.gzhead?(I(n,(n.gzhead.text?1:0)+(n.gzhead.hcrc?2:0)+(n.gzhead.extra?4:0)+(n.gzhead.name?8:0)+(n.gzhead.comment?16:0)),I(n,255&n.gzhead.time),I(n,n.gzhead.time>>8&255),I(n,n.gzhead.time>>16&255),I(n,n.gzhead.time>>24&255),I(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),I(n,255&n.gzhead.os),n.gzhead.extra&&n.gzhead.extra.length&&(I(n,255&n.gzhead.extra.length),I(n,n.gzhead.extra.length>>8&255)),n.gzhead.hcrc&&(e.adler=p(e.adler,n.pending_buf,n.pending,0)),n.gzindex=0,n.status=69):(I(n,0),I(n,0),I(n,0),I(n,0),I(n,0),I(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),I(n,3),n.status=x);else{var a=_+(n.w_bits-8<<4)<<8;a|=(2<=n.strategy||n.level<2?0:n.level<6?1:6===n.level?2:3)<<6,0!==n.strstart&&(a|=32),a+=31-a%31,n.status=x,O(n,a),0!==n.strstart&&(O(n,e.adler>>>16),O(n,65535&e.adler)),e.adler=1}if(69===n.status)if(n.gzhead.extra){for(i=n.pending;n.gzindex<(65535&n.gzhead.extra.length)&&(n.pending!==n.pending_buf_size||(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),C(e),i=n.pending,n.pending!==n.pending_buf_size));)I(n,255&n.gzhead.extra[n.gzindex]),n.gzindex++;n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),n.gzindex===n.gzhead.extra.length&&(n.gzindex=0,n.status=73)}else n.status=73;if(73===n.status)if(n.gzhead.name){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),C(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.name.length?255&n.gzhead.name.charCodeAt(n.gzindex++):0,I(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.gzindex=0,n.status=91)}else n.status=91;if(91===n.status)if(n.gzhead.comment){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),C(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.comment.length?255&n.gzhead.comment.charCodeAt(n.gzindex++):0,I(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.status=103)}else n.status=103;if(103===n.status&&(n.gzhead.hcrc?(n.pending+2>n.pending_buf_size&&C(e),n.pending+2<=n.pending_buf_size&&(I(n,255&e.adler),I(n,e.adler>>8&255),e.adler=0,n.status=x)):n.status=x),0!==n.pending){if(C(e),0===e.avail_out)return n.last_flush=-1,l}else if(0===e.avail_in&&z(t)<=z(r)&&4!==t)return S(e,-5);if(666===n.status&&0!==e.avail_in)return S(e,-5);if(0!==e.avail_in||0!==n.lookahead||t!==f&&666!==n.status){var o=2===n.strategy?function(e,t){for(var r;;){if(0===e.lookahead&&(T(e),0===e.lookahead)){if(t===f)return 1;break}if(e.match_length=0,r=h._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,r&&(A(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,4===t?(A(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(A(e,!1),0===e.strm.avail_out)?1:2}(n,t):3===n.strategy?function(e,t){for(var r,n,i,s,a=e.window;;){if(e.lookahead<=w){if(T(e),e.lookahead<=w&&t===f)return 1;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=b&&0<e.strstart&&(n=a[i=e.strstart-1])===a[++i]&&n===a[++i]&&n===a[++i]){s=e.strstart+w;do{}while(n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&i<s);e.match_length=w-(s-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=b?(r=h._tr_tally(e,1,e.match_length-b),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(r=h._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),r&&(A(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,4===t?(A(e,!0),0===e.strm.avail_out?3:4):e.last_lit&&(A(e,!1),0===e.strm.avail_out)?1:2}(n,t):u[n.level].func(n,t);if(3!==o&&4!==o||(n.status=666),1===o||3===o)return 0===e.avail_out&&(n.last_flush=-1),l;if(2===o&&(1===t?h._tr_align(n):5!==t&&(h._tr_stored_block(n,0,0,!1),3===t&&(E(n.head),0===n.lookahead&&(n.strstart=0,n.block_start=0,n.insert=0))),C(e),0===e.avail_out))return n.last_flush=-1,l}return 4!==t?l:n.wrap<=0?1:(2===n.wrap?(I(n,255&e.adler),I(n,e.adler>>8&255),I(n,e.adler>>16&255),I(n,e.adler>>24&255),I(n,255&e.total_in),I(n,e.total_in>>8&255),I(n,e.total_in>>16&255),I(n,e.total_in>>24&255)):(O(n,e.adler>>>16),O(n,65535&e.adler)),C(e),0<n.wrap&&(n.wrap=-n.wrap),0!==n.pending?l:1)},r.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==k&&69!==t&&73!==t&&91!==t&&103!==t&&t!==x&&666!==t?S(e,m):(e.state=null,t===x?S(e,-3):l):m},r.deflateSetDictionary=function(e,t){var r,n,i,s,a,o,u,h,f=t.length;if(!e||!e.state)return m;if(2===(s=(r=e.state).wrap)||1===s&&r.status!==k||r.lookahead)return m;for(1===s&&(e.adler=c(e.adler,t,f,0)),r.wrap=0,f>=r.w_size&&(0===s&&(E(r.head),r.strstart=0,r.block_start=0,r.insert=0),h=new d.Buf8(r.w_size),d.arraySet(h,t,f-r.w_size,r.w_size,0),t=h,f=r.w_size),a=e.avail_in,o=e.next_in,u=e.input,e.avail_in=f,e.next_in=0,e.input=t,T(r);r.lookahead>=b;){for(n=r.strstart,i=r.lookahead-(b-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[n+b-1])&r.hash_mask,r.prev[n&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=n,n++,--i;);r.strstart=n,r.lookahead=b-1,T(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=b-1,r.match_available=0,e.next_in=o,e.input=u,e.avail_in=a,r.wrap=s,l},r.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(e,t,r){"use strict";t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(e,t,r){"use strict";t.exports=function(e,t){var r,n,i,s,a,o,u,h,f,l,d,c,p,m,_,g,v,b,w,y,k,x,S,z,E;r=e.state,n=e.next_in,z=e.input,i=n+(e.avail_in-5),s=e.next_out,E=e.output,a=s-(t-e.avail_out),o=s+(e.avail_out-257),u=r.dmax,h=r.wsize,f=r.whave,l=r.wnext,d=r.window,c=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,v=(1<<r.distbits)-1;e:do{p<15&&(c+=z[n++]<<p,p+=8,c+=z[n++]<<p,p+=8),b=m[c&g];t:for(;;){if(c>>>=w=b>>>24,p-=w,0==(w=b>>>16&255))E[s++]=65535&b;else{if(!(16&w)){if(0==(64&w)){b=m[(65535&b)+(c&(1<<w)-1)];continue t}if(32&w){r.mode=12;break e}e.msg="invalid literal/length code",r.mode=30;break e}y=65535&b,(w&=15)&&(p<w&&(c+=z[n++]<<p,p+=8),y+=c&(1<<w)-1,c>>>=w,p-=w),p<15&&(c+=z[n++]<<p,p+=8,c+=z[n++]<<p,p+=8),b=_[c&v];r:for(;;){if(c>>>=w=b>>>24,p-=w,!(16&(w=b>>>16&255))){if(0==(64&w)){b=_[(65535&b)+(c&(1<<w)-1)];continue r}e.msg="invalid distance code",r.mode=30;break e}if(k=65535&b,p<(w&=15)&&(c+=z[n++]<<p,(p+=8)<w&&(c+=z[n++]<<p,p+=8)),u<(k+=c&(1<<w)-1)){e.msg="invalid distance too far back",r.mode=30;break e}if(c>>>=w,p-=w,(w=s-a)<k){if(f<(w=k-w)&&r.sane){e.msg="invalid distance too far back",r.mode=30;break e}if(S=d,(x=0)===l){if(x+=h-w,w<y){for(y-=w;E[s++]=d[x++],--w;);x=s-k,S=E}}else if(l<w){if(x+=h+l-w,(w-=l)<y){for(y-=w;E[s++]=d[x++],--w;);if(x=0,l<y){for(y-=w=l;E[s++]=d[x++],--w;);x=s-k,S=E}}}else if(x+=l-w,w<y){for(y-=w;E[s++]=d[x++],--w;);x=s-k,S=E}for(;2<y;)E[s++]=S[x++],E[s++]=S[x++],E[s++]=S[x++],y-=3;y&&(E[s++]=S[x++],1<y&&(E[s++]=S[x++]))}else{for(x=s-k;E[s++]=E[x++],E[s++]=E[x++],E[s++]=E[x++],2<(y-=3););y&&(E[s++]=E[x++],1<y&&(E[s++]=E[x++]))}break}}break}}while(n<i&&s<o);n-=y=p>>3,c&=(1<<(p-=y<<3))-1,e.next_in=n,e.next_out=s,e.avail_in=n<i?i-n+5:5-(n-i),e.avail_out=s<o?o-s+257:257-(s-o),r.hold=c,r.bits=p}},{}],49:[function(e,t,r){"use strict";var I=e("../utils/common"),O=e("./adler32"),B=e("./crc32"),T=e("./inffast"),R=e("./inftrees"),D=1,F=2,N=0,U=-2,P=1,n=852,i=592;function L(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function s(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function a(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=P,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new I.Buf32(n),t.distcode=t.distdyn=new I.Buf32(i),t.sane=1,t.back=-1,N):U}function o(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,a(e)):U}function u(e,t){var r,n;return e&&e.state?(n=e.state,t<0?(r=0,t=-t):(r=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t)?U:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=r,n.wbits=t,o(e))):U}function h(e,t){var r,n;return e?(n=new s,(e.state=n).window=null,(r=u(e,t))!==N&&(e.state=null),r):U}var f,l,d=!0;function j(e){if(d){var t;for(f=new I.Buf32(512),l=new I.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(R(D,e.lens,0,288,f,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;R(F,e.lens,0,32,l,0,e.work,{bits:5}),d=!1}e.lencode=f,e.lenbits=9,e.distcode=l,e.distbits=5}function Z(e,t,r,n){var i,s=e.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),n>=s.wsize?(I.arraySet(s.window,t,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(n<(i=s.wsize-s.wnext)&&(i=n),I.arraySet(s.window,t,r-n,i,s.wnext),(n-=i)?(I.arraySet(s.window,t,r-n,n,0),s.wnext=n,s.whave=s.wsize):(s.wnext+=i,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=i))),0}r.inflateReset=o,r.inflateReset2=u,r.inflateResetKeep=a,r.inflateInit=function(e){return h(e,15)},r.inflateInit2=h,r.inflate=function(e,t){var r,n,i,s,a,o,u,h,f,l,d,c,p,m,_,g,v,b,w,y,k,x,S,z,E=0,C=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return U;12===(r=e.state).mode&&(r.mode=13),a=e.next_out,i=e.output,u=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,h=r.hold,f=r.bits,l=o,d=u,x=N;e:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;break}for(;f<16;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}if(2&r.wrap&&35615===h){C[r.check=0]=255&h,C[1]=h>>>8&255,r.check=B(r.check,C,2,0),f=h=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&h)<<8)+(h>>8))%31){e.msg="incorrect header check",r.mode=30;break}if(8!=(15&h)){e.msg="unknown compression method",r.mode=30;break}if(f-=4,k=8+(15&(h>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){e.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,e.adler=r.check=1,r.mode=512&h?10:12,f=h=0;break;case 2:for(;f<16;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}if(r.flags=h,8!=(255&r.flags)){e.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){e.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=h>>8&1),512&r.flags&&(C[0]=255&h,C[1]=h>>>8&255,r.check=B(r.check,C,2,0)),f=h=0,r.mode=3;case 3:for(;f<32;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}r.head&&(r.head.time=h),512&r.flags&&(C[0]=255&h,C[1]=h>>>8&255,C[2]=h>>>16&255,C[3]=h>>>24&255,r.check=B(r.check,C,4,0)),f=h=0,r.mode=4;case 4:for(;f<16;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}r.head&&(r.head.xflags=255&h,r.head.os=h>>8),512&r.flags&&(C[0]=255&h,C[1]=h>>>8&255,r.check=B(r.check,C,2,0)),f=h=0,r.mode=5;case 5:if(1024&r.flags){for(;f<16;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}r.length=h,r.head&&(r.head.extra_len=h),512&r.flags&&(C[0]=255&h,C[1]=h>>>8&255,r.check=B(r.check,C,2,0)),f=h=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(c=r.length)&&(c=o),c&&(r.head&&(k=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,n,s,c,k)),512&r.flags&&(r.check=B(r.check,n,c,s)),o-=c,s+=c,r.length-=c),r.length))break e;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break e;for(c=0;k=n[s+c++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&c<o;);if(512&r.flags&&(r.check=B(r.check,n,c,s)),o-=c,s+=c,k)break e}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break e;for(c=0;k=n[s+c++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&c<o;);if(512&r.flags&&(r.check=B(r.check,n,c,s)),o-=c,s+=c,k)break e}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;f<16;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}if(h!==(65535&r.check)){e.msg="header crc mismatch",r.mode=30;break}f=h=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),e.adler=r.check=0,r.mode=12;break;case 10:for(;f<32;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}e.adler=r.check=L(h),f=h=0,r.mode=11;case 11:if(0===r.havedict)return e.next_out=a,e.avail_out=u,e.next_in=s,e.avail_in=o,r.hold=h,r.bits=f,2;e.adler=r.check=1,r.mode=12;case 12:if(5===t||6===t)break e;case 13:if(r.last){h>>>=7&f,f-=7&f,r.mode=27;break}for(;f<3;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}switch(r.last=1&h,f-=1,3&(h>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==t)break;h>>>=2,f-=2;break e;case 2:r.mode=17;break;case 3:e.msg="invalid block type",r.mode=30}h>>>=2,f-=2;break;case 14:for(h>>>=7&f,f-=7&f;f<32;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}if((65535&h)!=(h>>>16^65535)){e.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&h,f=h=0,r.mode=15,6===t)break e;case 15:r.mode=16;case 16:if(c=r.length){if(o<c&&(c=o),u<c&&(c=u),0===c)break e;I.arraySet(i,n,s,c,a),o-=c,s+=c,u-=c,a+=c,r.length-=c;break}r.mode=12;break;case 17:for(;f<14;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}if(r.nlen=257+(31&h),h>>>=5,f-=5,r.ndist=1+(31&h),h>>>=5,f-=5,r.ncode=4+(15&h),h>>>=4,f-=4,286<r.nlen||30<r.ndist){e.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;f<3;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}r.lens[A[r.have++]]=7&h,h>>>=3,f-=3}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=R(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(E=r.lencode[h&(1<<r.lenbits)-1])>>>16&255,v=65535&E,!((_=E>>>24)<=f);){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}if(v<16)h>>>=_,f-=_,r.lens[r.have++]=v;else{if(16===v){for(z=_+2;f<z;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}if(h>>>=_,f-=_,0===r.have){e.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],c=3+(3&h),h>>>=2,f-=2}else if(17===v){for(z=_+3;f<z;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}f-=_,k=0,c=3+(7&(h>>>=_)),h>>>=3,f-=3}else{for(z=_+7;f<z;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}f-=_,k=0,c=11+(127&(h>>>=_)),h>>>=7,f-=7}if(r.have+c>r.nlen+r.ndist){e.msg="invalid bit length repeat",r.mode=30;break}for(;c--;)r.lens[r.have++]=k}}if(30===r.mode)break;if(0===r.lens[256]){e.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=R(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=R(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){e.msg="invalid distances set",r.mode=30;break}if(r.mode=20,6===t)break e;case 20:r.mode=21;case 21:if(6<=o&&258<=u){e.next_out=a,e.avail_out=u,e.next_in=s,e.avail_in=o,r.hold=h,r.bits=f,T(e,d),a=e.next_out,i=e.output,u=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,h=r.hold,f=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(E=r.lencode[h&(1<<r.lenbits)-1])>>>16&255,v=65535&E,!((_=E>>>24)<=f);){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}if(g&&0==(240&g)){for(b=_,w=g,y=v;g=(E=r.lencode[y+((h&(1<<b+w)-1)>>b)])>>>16&255,v=65535&E,!(b+(_=E>>>24)<=f);){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}h>>>=b,f-=b,r.back+=b}if(h>>>=_,f-=_,r.back+=_,r.length=v,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){e.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;f<z;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}r.length+=h&(1<<r.extra)-1,h>>>=r.extra,f-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;g=(E=r.distcode[h&(1<<r.distbits)-1])>>>16&255,v=65535&E,!((_=E>>>24)<=f);){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}if(0==(240&g)){for(b=_,w=g,y=v;g=(E=r.distcode[y+((h&(1<<b+w)-1)>>b)])>>>16&255,v=65535&E,!(b+(_=E>>>24)<=f);){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}h>>>=b,f-=b,r.back+=b}if(h>>>=_,f-=_,r.back+=_,64&g){e.msg="invalid distance code",r.mode=30;break}r.offset=v,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;f<z;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}r.offset+=h&(1<<r.extra)-1,h>>>=r.extra,f-=r.extra,r.back+=r.extra}if(r.offset>r.dmax){e.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===u)break e;if(c=d-u,r.offset>c){if((c=r.offset-c)>r.whave&&r.sane){e.msg="invalid distance too far back",r.mode=30;break}p=c>r.wnext?(c-=r.wnext,r.wsize-c):r.wnext-c,c>r.length&&(c=r.length),m=r.window}else m=i,p=a-r.offset,c=r.length;for(u<c&&(c=u),u-=c,r.length-=c;i[a++]=m[p++],--c;);0===r.length&&(r.mode=21);break;case 26:if(0===u)break e;i[a++]=r.length,u--,r.mode=21;break;case 27:if(r.wrap){for(;f<32;){if(0===o)break e;o--,h|=n[s++]<<f,f+=8}if(d-=u,e.total_out+=d,r.total+=d,d&&(e.adler=r.check=r.flags?B(r.check,i,d,a-d):O(r.check,i,d,a-d)),d=u,(r.flags?h:L(h))!==r.check){e.msg="incorrect data check",r.mode=30;break}f=h=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;f<32;){if(0===o)break e;o--,h+=n[s++]<<f,f+=8}if(h!==(4294967295&r.total)){e.msg="incorrect length check",r.mode=30;break}f=h=0}r.mode=29;case 29:x=1;break e;case 30:x=-3;break e;case 31:return-4;case 32:default:return U}return e.next_out=a,e.avail_out=u,e.next_in=s,e.avail_in=o,r.hold=h,r.bits=f,(r.wsize||d!==e.avail_out&&r.mode<30&&(r.mode<27||4!==t))&&Z(e,e.output,e.next_out,d-e.avail_out)?(r.mode=31,-4):(l-=e.avail_in,d-=e.avail_out,e.total_in+=l,e.total_out+=d,r.total+=d,r.wrap&&d&&(e.adler=r.check=r.flags?B(r.check,i,d,e.next_out-d):O(r.check,i,d,e.next_out-d)),e.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==l&&0===d||4===t)&&x===N&&(x=-5),x)},r.inflateEnd=function(e){if(!e||!e.state)return U;var t=e.state;return t.window&&(t.window=null),e.state=null,N},r.inflateGetHeader=function(e,t){var r;return e&&e.state?0==(2&(r=e.state).wrap)?U:((r.head=t).done=!1,N):U},r.inflateSetDictionary=function(e,t){var r,n=t.length;return e&&e.state?0!==(r=e.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,t,n,0)!==r.check?-3:Z(e,t,n,n)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(e,t,r){"use strict";var D=e("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,r,n,i,s,a,o){var u,h,f,l,d,c,p,m,_,g=o.bits,v=0,b=0,w=0,y=0,k=0,x=0,S=0,z=0,E=0,C=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),T=null,R=0;for(v=0;v<=15;v++)O[v]=0;for(b=0;b<n;b++)O[t[r+b]]++;for(k=g,y=15;1<=y&&0===O[y];y--);if(y<k&&(k=y),0===y)return i[s++]=20971520,i[s++]=20971520,o.bits=1,0;for(w=1;w<y&&0===O[w];w++);for(k<w&&(k=w),v=z=1;v<=15;v++)if(z<<=1,(z-=O[v])<0)return-1;if(0<z&&(0===e||1!==y))return-1;for(B[1]=0,v=1;v<15;v++)B[v+1]=B[v]+O[v];for(b=0;b<n;b++)0!==t[r+b]&&(a[B[t[r+b]]++]=b);if(c=0===e?(A=T=a,19):1===e?(A=F,I-=257,T=N,R-=257,256):(A=U,T=P,-1),v=w,d=s,S=b=C=0,f=-1,l=(E=1<<(x=k))-1,1===e&&852<E||2===e&&592<E)return 1;for(;;){for(p=v-S,_=a[b]<c?(m=0,a[b]):a[b]>c?(m=T[R+a[b]],A[I+a[b]]):(m=96,0),u=1<<v-S,w=h=1<<x;i[d+(C>>S)+(h-=u)]=p<<24|m<<16|_|0,0!==h;);for(u=1<<v-1;C&u;)u>>=1;if(0!==u?(C&=u-1,C+=u):C=0,b++,0==--O[v]){if(v===y)break;v=t[r+a[b]]}if(k<v&&(C&l)!==f){for(0===S&&(S=k),d+=w,z=1<<(x=v-S);x+S<y&&!((z-=O[x+S])<=0);)x++,z<<=1;if(E+=1<<x,1===e&&852<E||2===e&&592<E)return 1;i[f=C&l]=k<<24|x<<16|d-s|0}}return 0!==C&&(i[d+C]=v-S<<24|64<<16|0),o.bits=k,0}},{"../utils/common":41}],51:[function(e,t,r){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(e,t,r){"use strict";var o=e("../utils/common");function n(e){for(var t=e.length;0<=--t;)e[t]=0}var _=15,i=16,u=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],h=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],a=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],f=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],l=new Array(576);n(l);var d=new Array(60);n(d);var c=new Array(512);n(c);var p=new Array(256);n(p);var m=new Array(29);n(m);var g,v,b,w=new Array(30);function y(e,t,r,n,i){this.static_tree=e,this.extra_bits=t,this.extra_base=r,this.elems=n,this.max_length=i,this.has_stree=e&&e.length}function s(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function k(e){return e<256?c[e]:c[256+(e>>>7)]}function x(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function S(e,t,r){e.bi_valid>i-r?(e.bi_buf|=t<<e.bi_valid&65535,x(e,e.bi_buf),e.bi_buf=t>>i-e.bi_valid,e.bi_valid+=r-i):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=r)}function z(e,t,r){S(e,r[2*t],r[2*t+1])}function E(e,t){for(var r=0;r|=1&e,e>>>=1,r<<=1,0<--t;);return r>>>1}function C(e,t,r){var n,i,s=new Array(_+1),a=0;for(n=1;n<=_;n++)s[n]=a=a+r[n-1]<<1;for(i=0;i<=t;i++){var o=e[2*i+1];0!==o&&(e[2*i]=E(s[o]++,o))}}function A(e){var t;for(t=0;t<286;t++)e.dyn_ltree[2*t]=0;for(t=0;t<30;t++)e.dyn_dtree[2*t]=0;for(t=0;t<19;t++)e.bl_tree[2*t]=0;e.dyn_ltree[512]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function I(e){8<e.bi_valid?x(e,e.bi_buf):0<e.bi_valid&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function O(e,t,r,n){var i=2*t,s=2*r;return e[i]<e[s]||e[i]===e[s]&&n[t]<=n[r]}function B(e,t,r){for(var n=e.heap[r],i=r<<1;i<=e.heap_len&&(i<e.heap_len&&O(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!O(t,n,e.heap[i],e.depth));)e.heap[r]=e.heap[i],r=i,i<<=1;e.heap[r]=n}function T(e,t,r){var n,i,s,a,o=0;if(0!==e.last_lit)for(;n=e.pending_buf[e.d_buf+2*o]<<8|e.pending_buf[e.d_buf+2*o+1],i=e.pending_buf[e.l_buf+o],o++,0===n?z(e,i,t):(z(e,(s=p[i])+256+1,t),0!==(a=u[s])&&S(e,i-=m[s],a),z(e,s=k(--n),r),0!==(a=h[s])&&S(e,n-=w[s],a)),o<e.last_lit;);z(e,256,t)}function R(e,t){var r,n,i,s=t.dyn_tree,a=t.stat_desc.static_tree,o=t.stat_desc.has_stree,u=t.stat_desc.elems,h=-1;for(e.heap_len=0,e.heap_max=573,r=0;r<u;r++)0!==s[2*r]?(e.heap[++e.heap_len]=h=r,e.depth[r]=0):s[2*r+1]=0;for(;e.heap_len<2;)s[2*(i=e.heap[++e.heap_len]=h<2?++h:0)]=1,e.depth[i]=0,e.opt_len--,o&&(e.static_len-=a[2*i+1]);for(t.max_code=h,r=e.heap_len>>1;1<=r;r--)B(e,s,r);for(i=u;r=e.heap[1],e.heap[1]=e.heap[e.heap_len--],B(e,s,1),n=e.heap[1],e.heap[--e.heap_max]=r,e.heap[--e.heap_max]=n,s[2*i]=s[2*r]+s[2*n],e.depth[i]=(e.depth[r]>=e.depth[n]?e.depth[r]:e.depth[n])+1,s[2*r+1]=s[2*n+1]=i,e.heap[1]=i++,B(e,s,1),2<=e.heap_len;);e.heap[--e.heap_max]=e.heap[1],function(e,t){var r,n,i,s,a,o,u=t.dyn_tree,h=t.max_code,f=t.stat_desc.static_tree,l=t.stat_desc.has_stree,d=t.stat_desc.extra_bits,c=t.stat_desc.extra_base,p=t.stat_desc.max_length,m=0;for(s=0;s<=_;s++)e.bl_count[s]=0;for(u[2*e.heap[e.heap_max]+1]=0,r=e.heap_max+1;r<573;r++)p<(s=u[2*u[2*(n=e.heap[r])+1]+1]+1)&&(s=p,m++),u[2*n+1]=s,h<n||(e.bl_count[s]++,a=0,c<=n&&(a=d[n-c]),o=u[2*n],e.opt_len+=o*(s+a),l&&(e.static_len+=o*(f[2*n+1]+a)));if(0!==m){do{for(s=p-1;0===e.bl_count[s];)s--;e.bl_count[s]--,e.bl_count[s+1]+=2,e.bl_count[p]--,m-=2}while(0<m);for(s=p;0!==s;s--)for(n=e.bl_count[s];0!==n;)h<(i=e.heap[--r])||(u[2*i+1]!==s&&(e.opt_len+=(s-u[2*i+1])*u[2*i],u[2*i+1]=s),n--)}}(e,t),C(s,h,e.bl_count)}function D(e,t,r){var n,i,s=-1,a=t[1],o=0,u=7,h=4;for(0===a&&(u=138,h=3),t[2*(r+1)+1]=65535,n=0;n<=r;n++)i=a,a=t[2*(n+1)+1],++o<u&&i===a||(o<h?e.bl_tree[2*i]+=o:0!==i?(i!==s&&e.bl_tree[2*i]++,e.bl_tree[32]++):o<=10?e.bl_tree[34]++:e.bl_tree[36]++,s=i,h=(o=0)===a?(u=138,3):i===a?(u=6,3):(u=7,4))}function F(e,t,r){var n,i,s=-1,a=t[1],o=0,u=7,h=4;for(0===a&&(u=138,h=3),n=0;n<=r;n++)if(i=a,a=t[2*(n+1)+1],!(++o<u&&i===a)){if(o<h)for(;z(e,i,e.bl_tree),0!=--o;);else 0!==i?(i!==s&&(z(e,i,e.bl_tree),o--),z(e,16,e.bl_tree),S(e,o-3,2)):o<=10?(z(e,17,e.bl_tree),S(e,o-3,3)):(z(e,18,e.bl_tree),S(e,o-11,7));s=i,h=(o=0)===a?(u=138,3):i===a?(u=6,3):(u=7,4)}}n(w);var N=!1;function U(e,t,r,n){var i,s,a;S(e,0+(n?1:0),3),s=t,a=r,I(i=e),x(i,a),x(i,~a),o.arraySet(i.pending_buf,i.window,s,a,i.pending),i.pending+=a}r._tr_init=function(e){N||(function(){var e,t,r,n,i,s=new Array(_+1);for(n=r=0;n<28;n++)for(m[n]=r,e=0;e<1<<u[n];e++)p[r++]=n;for(p[r-1]=n,n=i=0;n<16;n++)for(w[n]=i,e=0;e<1<<h[n];e++)c[i++]=n;for(i>>=7;n<30;n++)for(w[n]=i<<7,e=0;e<1<<h[n]-7;e++)c[256+i++]=n;for(t=0;t<=_;t++)s[t]=0;for(e=0;e<=143;)l[2*e+1]=8,e++,s[8]++;for(;e<=255;)l[2*e+1]=9,e++,s[9]++;for(;e<=279;)l[2*e+1]=7,e++,s[7]++;for(;e<=287;)l[2*e+1]=8,e++,s[8]++;for(C(l,287,s),e=0;e<30;e++)d[2*e+1]=5,d[2*e]=E(e,5);g=new y(l,u,257,286,_),v=new y(d,h,0,30,_),b=new y(new Array(0),a,0,19,7)}(),N=!0),e.l_desc=new s(e.dyn_ltree,g),e.d_desc=new s(e.dyn_dtree,v),e.bl_desc=new s(e.bl_tree,b),e.bi_buf=0,e.bi_valid=0,A(e)},r._tr_stored_block=U,r._tr_flush_block=function(e,t,r,n){var i,s,a=0;0<e.level?(2===e.strm.data_type&&(e.strm.data_type=function(e){var t,r=4093624447;for(t=0;t<=31;t++,r>>>=1)if(1&r&&0!==e.dyn_ltree[2*t])return 0;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return 1;for(t=32;t<256;t++)if(0!==e.dyn_ltree[2*t])return 1;return 0}(e)),R(e,e.l_desc),R(e,e.d_desc),a=function(e){var t;for(D(e,e.dyn_ltree,e.l_desc.max_code),D(e,e.dyn_dtree,e.d_desc.max_code),R(e,e.bl_desc),t=18;3<=t&&0===e.bl_tree[2*f[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),i=e.opt_len+3+7>>>3,(s=e.static_len+3+7>>>3)<=i&&(i=s)):i=s=r+5,r+4<=i&&-1!==t?U(e,t,r,n):4===e.strategy||s===i?(S(e,2+(n?1:0),3),T(e,l,d)):(S(e,4+(n?1:0),3),function(e,t,r,n){var i;for(S(e,t-257,5),S(e,r-1,5),S(e,n-4,4),i=0;i<n;i++)S(e,e.bl_tree[2*f[i]+1],3);F(e,e.dyn_ltree,t-1),F(e,e.dyn_dtree,r-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,a+1),T(e,e.dyn_ltree,e.dyn_dtree)),A(e),n&&I(e)},r._tr_tally=function(e,t,r){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&r,e.last_lit++,0===t?e.dyn_ltree[2*r]++:(e.matches++,t--,e.dyn_ltree[2*(p[r]+256+1)]++,e.dyn_dtree[2*k(t)]++),e.last_lit===e.lit_bufsize-1},r._tr_align=function(e){var t;S(e,2,3),z(e,256,l),16===(t=e).bi_valid?(x(t,t.bi_buf),t.bi_buf=0,t.bi_valid=0):8<=t.bi_valid&&(t.pending_buf[t.pending++]=255&t.bi_buf,t.bi_buf>>=8,t.bi_valid-=8)}},{"../utils/common":41}],53:[function(e,t,r){"use strict";t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(e,t,r){"use strict";t.exports="function"==typeof setImmediate?setImmediate:function(){var e=[].slice.apply(arguments);e.splice(1,0,0),setTimeout.apply(null,e)}},{}]},{},[10])(10)})}).call(this,void 0!==r?r:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[1])(1)})}).call(this,void 0!==r?r:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[1])(1)})}).call(this,void 0!==r?r:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[1])(1)})}).call(this,void 0!==r?r:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[1])(1)})}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[1])(1)});
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,require("timers").setImmediate)
},{"buffer":2,"timers":5}]},{},[6]);
