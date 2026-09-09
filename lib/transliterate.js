"use client";

/**
 * Indic script to Latin, so a device with no Indic voice can still speak.
 *
 * Most Windows machines ship exactly five speech voices, all English. On one
 * of those, `speechSynthesis` handed a Telugu sentence renders NOTHING for the
 * Telugu and reads only the Latin fragments left in it — which is why an
 * answer full of Telugu came out as "13.8 kilometres" and nothing else.
 *
 * There are two honest ways out. Install a Telugu voice, which is the right
 * answer and takes an OS download. Or romanise the text and read it with the
 * Indian English voice that IS installed: "చేపలు ఎక్కువగా" becomes
 * "chepalu ekkuvagaa", and Microsoft Ravi saying that is understood by a
 * Telugu speaker immediately. This module is the second one.
 *
 * It is a PRONUNCIATION AID, not scholarly transliteration. It deliberately
 * writes "aa" and "ee" rather than ā and ī, because a speech engine reads the
 * diacritics as noise or skips them, and the whole point is what comes out of
 * the speaker.
 *
 * How it works
 * ------------
 * Every one of these scripts is Brahmi-derived, and Unicode lays the blocks
 * out in the SAME relative order: independent vowels, then consonants, then
 * vowel signs, then the virama, at identical offsets from each block's base.
 * So one offset table serves Devanagari, Bengali, Gujarati, Odia, Tamil,
 * Telugu, Kannada and Malayalam, instead of eight hand-written tables that
 * would each drift. Gaps in a script (Tamil has no aspirated consonants) are
 * simply unassigned code points, and never appear in real text.
 *
 * These are abugidas: a bare consonant already carries an "a". So a consonant
 * is emitted with that vowel pending, and the next character decides it — a
 * vowel sign replaces it, the virama kills it, anything else confirms it.
 */

/** Block base for each script whose offsets follow the shared layout. */
const BLOCKS = [
  { base: 0x0900, end: 0x097f, name: "devanagari", dropFinalA: true },
  { base: 0x0980, end: 0x09ff, name: "bengali", dropFinalA: true },
  { base: 0x0a00, end: 0x0a7f, name: "gurmukhi", dropFinalA: true },
  { base: 0x0a80, end: 0x0aff, name: "gujarati", dropFinalA: true },
  { base: 0x0b00, end: 0x0b7f, name: "odia", dropFinalA: true },
  { base: 0x0b80, end: 0x0bff, name: "tamil", dropFinalA: false },
  { base: 0x0c00, end: 0x0c7f, name: "telugu", dropFinalA: false },
  { base: 0x0c80, end: 0x0cff, name: "kannada", dropFinalA: false },
  { base: 0x0d00, end: 0x0d7f, name: "malayalam", dropFinalA: false },
];

/** Independent vowels, by offset from the block base. */
const VOWELS = {
  0x05: "a", 0x06: "aa", 0x07: "i", 0x08: "ee", 0x09: "u", 0x0a: "oo",
  0x0b: "ri", 0x0c: "li", 0x0d: "e", 0x0e: "e", 0x0f: "e", 0x10: "ai",
  0x11: "o", 0x12: "o", 0x13: "o", 0x14: "au", 0x60: "ri", 0x61: "li",
};

/** Consonants, by offset. Same order in every block. */
const CONSONANTS = {
  0x15: "k", 0x16: "kh", 0x17: "g", 0x18: "gh", 0x19: "ng",
  0x1a: "ch", 0x1b: "chh", 0x1c: "j", 0x1d: "jh", 0x1e: "ny",
  0x1f: "t", 0x20: "th", 0x21: "d", 0x22: "dh", 0x23: "n",
  0x24: "t", 0x25: "th", 0x26: "d", 0x27: "dh", 0x28: "n", 0x29: "n",
  0x2a: "p", 0x2b: "ph", 0x2c: "b", 0x2d: "bh", 0x2e: "m",
  0x2f: "y", 0x30: "r", 0x31: "r", 0x32: "l", 0x33: "l", 0x34: "zh",
  0x35: "v", 0x36: "sh", 0x37: "sh", 0x38: "s", 0x39: "h",
  0x58: "q", 0x59: "kh", 0x5a: "g", 0x5b: "z", 0x5c: "r", 0x5d: "rh",
  0x5e: "f", 0x5f: "y",
};

/** Vowel signs. These REPLACE the consonant's inherent "a". */
const MATRAS = {
  0x3e: "aa", 0x3f: "i", 0x40: "ee", 0x41: "u", 0x42: "oo",
  0x43: "ri", 0x44: "ri", 0x45: "e", 0x46: "e", 0x47: "e", 0x48: "ai",
  0x49: "o", 0x4a: "o", 0x4b: "o", 0x4c: "au",
  0x56: "ee", 0x57: "au", 0x62: "li", 0x63: "li",
};

/** Marks that sit after a full syllable. */
const SIGNS = { 0x01: "n", 0x02: "n", 0x03: "h" };

/**
 * The anusvara is a nasal that takes the place of whatever follows it, and
 * reading it as a flat "n" is what turned "matsyam" into "matsyan". At the end
 * of a word it is "m"; before a consonant it borrows that consonant's place.
 */
const ANUSVARA = 0x02;

function anusvaraSound(nextOffset) {
  if (nextOffset === null) return "m";                        // end of word
  if (nextOffset >= 0x2a && nextOffset <= 0x2e) return "m";   // before p ph b bh m
  // Before anything else "n" is enough: an English reader turns "n" + "g"
  // into the right nasal by itself, whereas spelling it "ng" + "g" gives
  // "ranggaa" for a word that is "rangaa".
  return "n";
}

/**
 * Tamil writes one letter for a sound English spells two ways: க is "k" at the
 * start of a word and "g" between vowels, so "பகல்" is "pagal", not "pakal".
 * Applying that rule is most of what makes romanised Tamil recognisable when
 * an English voice reads it aloud.
 */
const TAMIL_VOICED = {
  0x15: "g", 0x1a: "s", 0x1f: "d", 0x24: "dh", 0x2a: "b",
};

/** Malayalam chillu letters: a consonant with no vowel, written as one glyph. */
const MALAYALAM_CHILLU = {
  0x7a: "n", 0x7b: "n", 0x7c: "r", 0x7d: "l", 0x7e: "l", 0x7f: "k",
};

const VIRAMA = 0x4d;
const NUKTA = 0x3c;
const DIGIT_START = 0x66;
const DIGIT_END = 0x6f;

function blockFor(code) {
  for (const block of BLOCKS) {
    if (code >= block.base && code <= block.end) return block;
  }
  return null;
}

/** True if the string contains any character from a supported Indic block. */
export function hasIndicScript(text) {
  for (const character of String(text || "")) {
    if (blockFor(character.codePointAt(0))) return true;
  }
  return false;
}

/**
 * Romanise Indic text, leaving everything else untouched.
 *
 * Latin words, numbers and punctuation pass straight through, which matters:
 * a reply is usually mixed, and "13.8" must stay "13.8".
 */
export function romanise(text) {
  // Malayalam writes the "tt" sound as a doubled ṟa, and "nt" as na + ṟa.
  // Read literally those come out as "rr" and "nr", which is not the word.
  // One substitution before the loop turns the sequence into the ṭa it is
  // pronounced as, and the ordinary machinery does the rest.
  const input = String(text || "")
    .replace(/\u0D31\u0D4D\u0D31/g, "\u0D1F\u0D4D\u0D1F")
    .replace(/\u0D4D\u0D31/g, "\u0D4D\u0D1F");
  let out = "";
  // True when a consonant has been written and its inherent "a" is not yet
  // decided. The next character settles it.
  let pending = false;
  let pendingBlock = null;
  // Whether the last sound written was a vowel. Tamil voicing depends on it,
  // and it is false at the start of a word, which is exactly right.
  let afterVowel = false;

  const settle = (atBoundary) => {
    if (!pending) return;
    // Devanagari and its relatives drop a word-final "a" in speech (Hindi
    // "kaam", not "kaama"); the Dravidian scripts keep it. Getting this wrong
    // is the difference between a word and a word with a stutter on the end.
    if (!(atBoundary && pendingBlock?.dropFinalA)) {
      out += "a";
      afterVowel = true;
    }
    pending = false;
    pendingBlock = null;
  };

  const characters = Array.from(input);

  /** The offset of the next character, when it is in the same script. */
  const nextOffsetFrom = (position) => {
    const next = characters[position + 1];
    if (!next) return null;
    const nextBlock = blockFor(next.codePointAt(0));
    return nextBlock ? next.codePointAt(0) - nextBlock.base : null;
  };

  for (let position = 0; position < characters.length; position += 1) {
    const character = characters[position];
    const code = character.codePointAt(0);

    // Zero-width joiners hold conjuncts together on screen and mean nothing
    // aloud.
    if (code === 0x200c || code === 0x200d) continue;

    const block = blockFor(code);
    if (!block) {
      settle(true);
      out += character;
      afterVowel = false;
      continue;
    }

    const offset = code - block.base;

    if (offset === NUKTA) continue;

    if (offset === VIRAMA) {
      pending = false;
      pendingBlock = null;
      afterVowel = false;
      continue;
    }

    if (CONSONANTS[offset] !== undefined) {
      settle(false);
      // Not before a virama: a consonant that closes a syllable is half of a
      // cluster or a doubled letter, and those stay hard — "manikku", never
      // "manigku".
      const voiced =
        block.name === "tamil" &&
        afterVowel &&
        TAMIL_VOICED[offset] !== undefined &&
        nextOffsetFrom(position) !== VIRAMA;
      out += voiced ? TAMIL_VOICED[offset] : CONSONANTS[offset];
      pending = true;
      pendingBlock = block;
      afterVowel = false;
      continue;
    }

    if (MATRAS[offset] !== undefined) {
      out += MATRAS[offset];
      pending = false;
      pendingBlock = null;
      afterVowel = true;
      continue;
    }

    if (VOWELS[offset] !== undefined) {
      settle(false);
      out += VOWELS[offset];
      afterVowel = true;
      continue;
    }

    if (SIGNS[offset] !== undefined) {
      settle(false);
      out += offset === ANUSVARA ? anusvaraSound(nextOffsetFrom(position)) : SIGNS[offset];
      afterVowel = false;
      continue;
    }

    if (block.name === "malayalam" && MALAYALAM_CHILLU[offset] !== undefined) {
      settle(false);
      out += MALAYALAM_CHILLU[offset];
      afterVowel = false;
      continue;
    }

    if (offset >= DIGIT_START && offset <= DIGIT_END) {
      settle(false);
      out += String(offset - DIGIT_START);
      afterVowel = false;
      continue;
    }

    // Danda and double danda are full stops. Saying them as a pause rather
    // than dropping them is what keeps the sentence rhythm.
    if (offset === 0x64 || offset === 0x65) {
      settle(true);
      out += ".";
      afterVowel = false;
      continue;
    }

    settle(true);
  }

  settle(true);

  // A consonant cluster like "ktr" is unsayable to an English voice; a light
  // touch of spacing is not worth the risk of mangling real words, so the only
  // tidying done here is whitespace.
  return out.replace(/[ \t]+/g, " ").trim();
}
