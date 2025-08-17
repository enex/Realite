import { v4 as uuidV4, validate as uuidValidate } from "uuid";

class Converter {
  private srcAlphabet: string;
  private dstAlphabet: string;

  constructor(srcAlphabet: string, dstAlphabet: string) {
    if (
      !srcAlphabet ||
      !dstAlphabet ||
      !srcAlphabet.length ||
      !dstAlphabet.length
    ) {
      throw new Error("Bad alphabet");
    }
    this.srcAlphabet = srcAlphabet;
    this.dstAlphabet = dstAlphabet;
  }

  /**
   * Convert number from source alphabet to destination alphabet
   *
   * @param {string|Array} number - number represented as a string or array of points
   *
   * @returns {string|Array}
   */
  convert(number: string): string {
    let i: number;
    let divide: number;
    let newlen: number;
    const numberMap: Record<number, number> = {};
    const fromBase = this.srcAlphabet.length;
    const toBase = this.dstAlphabet.length;
    let length = number.length;
    let result = "";

    if (!this.isValid(number)) {
      throw new Error(
        'Number "' +
          number +
          '" contains of non-alphabetic digits (' +
          this.srcAlphabet +
          ")",
      );
    }

    if (this.srcAlphabet === this.dstAlphabet) {
      return number;
    }

    for (i = 0; i < length; i++) {
      numberMap[i] = this.srcAlphabet.indexOf(number[i]!);
    }
    do {
      divide = 0;
      newlen = 0;
      for (i = 0; i < length; i++) {
        divide = divide * fromBase + numberMap[i]!;
        if (divide >= toBase) {
          numberMap[newlen++] = parseInt((divide / toBase).toString(), 10);
          divide = divide % toBase;
        } else if (newlen > 0) {
          numberMap[newlen++] = 0;
        }
      }
      length = newlen;
      result = this.dstAlphabet.slice(divide, divide + 1).concat(result);
    } while (newlen !== 0);

    return result;
  }

  /**
   * Valid number with source alphabet
   *
   * @param {number} number
   *
   * @returns {boolean}
   */
  isValid(number: string): boolean {
    let i = 0;
    for (; i < number.length; ++i) {
      if (!this.srcAlphabet.includes(number[i]!)) return false;
    }
    return true;
  }
}

/**
 * Function get source and destination alphabet and return convert function
 *
 * @param {string|Array} srcAlphabet
 * @param {string|Array} dstAlphabet
 *
 * @returns {function(number|Array)}
 */
function anyBase(srcAlphabet: string, dstAlphabet: string) {
  const converter = new Converter(srcAlphabet, dstAlphabet);
  return function (input: string): string {
    return converter.convert(input);
  };
}

anyBase.BIN = "01";
anyBase.OCT = "01234567";
anyBase.DEC = "0123456789";
anyBase.HEX = "0123456789abcdef";

const constants = {
  cookieBase90:
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&'()*+-./:<=>?@[]^_`{|}~",
  flickrBase58: "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ",
  uuid25Base36: "0123456789abcdefghijklmnopqrstuvwxyz",
};

/**
 * Takes a UUID, strips the dashes, and translates.
 * @param {string} longId
 * @param {function(string):string} translator
 * @param {Object} [paddingParams]
 * @returns {string}
 */
function shortenUUIDInternal(
  longId: string,
  translator: (string: string) => string,
  paddingParams: {
    consistentLength: boolean;
    shortIdLength: number;
    paddingChar: string;
  },
) {
  const translated = translator(longId.toLowerCase().replace(/-/g, ""));

  if (!paddingParams.consistentLength) return translated;

  return translated.padStart(
    paddingParams.shortIdLength,
    paddingParams.paddingChar,
  );
}

/**
 * Translate back to hex and turn back into UUID format, with dashes
 * @param {string} shortId
 * @param {function(string)} translator
 * @returns {string}
 */
function enlargeUUIDInternal(
  shortId: string,
  translator: (string: string) => string,
) {
  const uu1 = translator(shortId).padStart(32, "0");

  // Join the zero padding and the UUID and then slice it up with match
  const m = /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/.exec(uu1);

  if (!m) {
    throw new Error("Invalid short ID");
  }

  // Accumulate the matches and join them.
  return [m[1], m[2], m[3], m[4], m[5]].join("-");
}

/**
 * Calculate length for the shortened ID
 * @param {number} alphabetLength
 * @returns {number}
 */
export function getShortIdLength(alphabetLength: number) {
  return Math.ceil(Math.log(2 ** 128) / Math.log(alphabetLength));
}

const baseOptions = {
  consistentLength: true,
};

/**
 * @param {string} toAlphabet
 * @param {{ consistentLength: boolean }} [options]
 * @returns {{
 *  alphabet: string,
 *  fromUUID: (function(*): string),
 *  generate: (function(): string),
 *  maxLength: number,
 *  new: (function(): string),
 *  toUUID: (function(*): string),
 *  uuid: ((function(*, *, *): (*))|*),
 *  validate: ((function(*, boolean=false): (boolean))|*)}}
 */
export function makeConvertor(
  toAlphabet: string,
  options: { consistentLength: boolean } = baseOptions,
) {
  // Default to Flickr 58
  const useAlphabet = toAlphabet || constants.flickrBase58;

  // Default to baseOptions
  const selectedOptions = { ...baseOptions, ...options };

  // Check alphabet for duplicate entries
  if ([...new Set(Array.from(useAlphabet))].length !== useAlphabet.length) {
    throw new Error(
      "The provided Alphabet has duplicate characters resulting in unreliable results",
    );
  }

  const shortIdLength = getShortIdLength(useAlphabet.length);

  // Padding Params
  const paddingParams = {
    shortIdLength,
    consistentLength: selectedOptions.consistentLength,
    paddingChar: useAlphabet[0]!,
  };

  // UUIDs are in hex, so we translate to and from.
  const fromHex = anyBase(anyBase.HEX, useAlphabet);
  const toHex = anyBase(useAlphabet, anyBase.HEX);
  /**
   * @returns {string} - short id
   */
  const generate = () => shortenUUIDInternal(uuidV4(), fromHex, paddingParams);

  /**
   * Confirm if string is a valid id. Checks length and alphabet.
   * If the second parameter is true it will translate to standard UUID
   *  and check the result for UUID validity.
   * @param {string} shortId - The string to check for validity
   * @param {boolean} [rigorous=false] - If true, also check for a valid UUID
   * @returns {boolean}
   */
  const validate = (shortId: string, rigorous = false) => {
    if (!shortId || typeof shortId !== "string") return false;
    const isCorrectLength = selectedOptions.consistentLength
      ? shortId.length === shortIdLength
      : shortId.length <= shortIdLength;
    const onlyAlphabet = shortId
      .split("")
      .every((letter) => useAlphabet.includes(letter));
    if (rigorous === false) return isCorrectLength && onlyAlphabet;
    return (
      isCorrectLength &&
      onlyAlphabet &&
      uuidValidate(enlargeUUIDInternal(shortId, toHex))
    );
  };

  const translator = {
    alphabet: useAlphabet,
    fromUUID: (uuid: string) =>
      shortenUUIDInternal(uuid, fromHex, paddingParams),
    maxLength: shortIdLength,
    generate,
    new: generate,
    toUUID: (shortUuid: string) => enlargeUUIDInternal(shortUuid, toHex),
    uuid: uuidV4,
    validate,
  };

  Object.freeze(translator);

  return translator;
}

// Expose the constants for other purposes.
makeConvertor.constants = constants;

// Expose the generic v4 UUID generator for convenience
makeConvertor.uuid = uuidV4;

// A default generator, instantiated only if used.
let toFlickr: (() => string) | undefined;

// Provide a generic generator
makeConvertor.generate = () => {
  if (!toFlickr) {
    // Generate on first use;
    toFlickr = makeConvertor(constants.flickrBase58).generate;
  }
  return toFlickr();
};

export default makeConvertor;

export const flickrConvertor = makeConvertor(constants.flickrBase58);

export function shortenUUID(uuid: string): string {
  return flickrConvertor.fromUUID(uuid);
}

export function enlargeUUID(shortId: string): string {
  return flickrConvertor.toUUID(shortId);
}
