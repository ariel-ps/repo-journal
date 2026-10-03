#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);

// src/version.ts
var VERSION = "0.3.0";

// node_modules/axi-sdk-js/dist/errors.js
function exitCodeForError(error) {
  if (error instanceof AxiError && error.code === "VALIDATION_ERROR") {
    return 2;
  }
  return 1;
}
var AxiError;
var init_errors = __esm(() => {
  AxiError = class AxiError extends Error {
    code;
    suggestions;
    constructor(message, code, suggestions = []) {
      super(message);
      this.code = code;
      this.suggestions = suggestions;
      this.name = "AxiError";
    }
  };
});

// node_modules/@toon-format/toon/dist/index.mjs
function escapeString(value) {
  return value.replace(/\\/g, `\\\\`).replace(/"/g, `\\"`).replace(/\n/g, `\\n`).replace(/\r/g, `\\r`).replace(/\t/g, `\\t`).replace(/[\u0000-\u001F]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
function isBooleanOrNullLiteral(token) {
  return token === "true" || token === "false" || token === "null";
}
function setOwnProperty(target, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true
    });
    return;
  }
  target[key] = value;
}
function normalizeValue(value) {
  if (value === null)
    return null;
  if (typeof value === "object" && value !== null && "toJSON" in value && typeof value.toJSON === "function") {
    const next = value.toJSON();
    if (next !== value)
      return normalizeValue(next);
  }
  if (typeof value === "string" || typeof value === "boolean")
    return value;
  if (typeof value === "number") {
    if (Object.is(value, -0))
      return 0;
    if (!Number.isFinite(value))
      return null;
    return value;
  }
  if (typeof value === "bigint") {
    if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER)
      return Number(value);
    return value.toString();
  }
  if (value instanceof Date)
    return value.toISOString();
  if (Array.isArray(value))
    return value.map(normalizeValue);
  if (value instanceof Set)
    return Array.from(value).map(normalizeValue);
  if (value instanceof Map)
    return Object.fromEntries(Array.from(value, ([k, v]) => [String(k), normalizeValue(v)]));
  if (isPlainObject(value)) {
    const encodedValues = {};
    for (const key in value)
      if (Object.hasOwn(value, key))
        setOwnProperty(encodedValues, key, normalizeValue(value[key]));
    return encodedValues;
  }
  return null;
}
function isJsonPrimitive(value) {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function isJsonArray(value) {
  return Array.isArray(value);
}
function isJsonObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isEmptyObject(value) {
  return Object.keys(value).length === 0;
}
function isPlainObject(value) {
  if (value === null || typeof value !== "object")
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}
function isArrayOfPrimitives(value) {
  return value.length === 0 || value.every((item) => isJsonPrimitive(item));
}
function isArrayOfArrays(value) {
  return value.length === 0 || value.every((item) => isJsonArray(item));
}
function isArrayOfObjects(value) {
  return value.length === 0 || value.every((item) => isJsonObject(item));
}
function isValidUnquotedKey(key) {
  return /^[A-Z_][\w.]*$/i.test(key);
}
function isIdentifierSegment(key) {
  return /^[A-Z_]\w*$/i.test(key);
}
function isSafeUnquoted(value, delimiter = DEFAULT_DELIMITER) {
  if (!value)
    return false;
  if (value !== value.trim())
    return false;
  if (isBooleanOrNullLiteral(value) || isNumericLike(value))
    return false;
  if (value.includes(":"))
    return false;
  if (value.includes('"') || value.includes("\\"))
    return false;
  if (/[[\]{}]/.test(value))
    return false;
  if (/[\u0000-\u001F]/.test(value))
    return false;
  if (value.includes(delimiter))
    return false;
  if (value.startsWith("-"))
    return false;
  return true;
}
function isNumericLike(value) {
  return NUMERIC_LIKE_PATTERN.test(value) || LEADING_ZERO_PATTERN.test(value);
}
function tryFoldKeyChain(key, value, siblings, options, rootLiteralKeys, pathPrefix, flattenDepth) {
  if (options.keyFolding !== "safe")
    return;
  if (!isJsonObject(value))
    return;
  const { segments, tail, leafValue } = collectSingleKeyChain(key, value, flattenDepth ?? options.flattenDepth);
  if (segments.length < 2)
    return;
  if (!segments.every((seg) => isIdentifierSegment(seg)))
    return;
  const foldedKey = buildFoldedKey(segments);
  const absolutePath = pathPrefix ? `${pathPrefix}.${foldedKey}` : foldedKey;
  if (siblings.includes(foldedKey))
    return;
  if (rootLiteralKeys && rootLiteralKeys.has(absolutePath))
    return;
  return {
    foldedKey,
    remainder: tail,
    leafValue,
    segmentCount: segments.length
  };
}
function collectSingleKeyChain(startKey, startValue, maxDepth) {
  const segments = [startKey];
  let currentValue = startValue;
  while (segments.length < maxDepth) {
    if (!isJsonObject(currentValue))
      break;
    const keys = Object.keys(currentValue);
    if (keys.length !== 1)
      break;
    const nextKey = keys[0];
    const nextValue = currentValue[nextKey];
    segments.push(nextKey);
    currentValue = nextValue;
  }
  if (!isJsonObject(currentValue) || isEmptyObject(currentValue))
    return {
      segments,
      tail: undefined,
      leafValue: currentValue
    };
  return {
    segments,
    tail: currentValue,
    leafValue: currentValue
  };
}
function buildFoldedKey(segments) {
  return segments.join(".");
}
function encodePrimitive(value, delimiter) {
  if (value === null)
    return NULL_LITERAL;
  if (typeof value === "boolean")
    return String(value);
  if (typeof value === "number")
    return String(value);
  return encodeStringLiteral(value, delimiter);
}
function encodeStringLiteral(value, delimiter = DEFAULT_DELIMITER) {
  if (isSafeUnquoted(value, delimiter))
    return value;
  return `"${escapeString(value)}"`;
}
function encodeKey(key) {
  if (isValidUnquotedKey(key))
    return key;
  return `"${escapeString(key)}"`;
}
function encodeAndJoinPrimitives(values, delimiter = DEFAULT_DELIMITER) {
  return values.map((v) => encodePrimitive(v, delimiter)).join(delimiter);
}
function formatHeader(length, options) {
  const key = options?.key;
  const fields = options?.fields;
  const delimiter = options?.delimiter ?? ",";
  let header = "";
  if (key != null)
    header += encodeKey(key);
  header += `[${length}${delimiter !== DEFAULT_DELIMITER ? delimiter : ""}]`;
  if (fields) {
    const quotedFields = fields.map((f) => encodeKey(f));
    header += `{${quotedFields.join(delimiter)}}`;
  }
  header += ":";
  return header;
}
function* encodeJsonValue(value, options, depth) {
  if (isJsonPrimitive(value)) {
    const encodedPrimitive = encodePrimitive(value, options.delimiter);
    if (encodedPrimitive !== "")
      yield encodedPrimitive;
    return;
  }
  if (isJsonArray(value))
    yield* encodeArrayLines(undefined, value, depth, options);
  else if (isJsonObject(value))
    yield* encodeObjectLines(value, depth, options);
}
function* encodeObjectLines(value, depth, options, rootLiteralKeys, pathPrefix, remainingDepth) {
  const keys = Object.keys(value);
  if (depth === 0 && !rootLiteralKeys)
    rootLiteralKeys = new Set(keys.filter((k) => k.includes(".")));
  const effectiveFlattenDepth = remainingDepth ?? options.flattenDepth;
  for (const [key, val] of Object.entries(value))
    yield* encodeKeyValuePairLines(key, val, depth, options, keys, rootLiteralKeys, pathPrefix, effectiveFlattenDepth);
}
function* encodeKeyValuePairLines(key, value, depth, options, siblings, rootLiteralKeys, pathPrefix, flattenDepth) {
  const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
  const effectiveFlattenDepth = flattenDepth ?? options.flattenDepth;
  if (options.keyFolding === "safe" && siblings) {
    const foldResult = tryFoldKeyChain(key, value, siblings, options, rootLiteralKeys, pathPrefix, effectiveFlattenDepth);
    if (foldResult) {
      const { foldedKey, remainder, leafValue, segmentCount } = foldResult;
      const encodedFoldedKey = encodeKey(foldedKey);
      if (remainder === undefined) {
        if (isJsonPrimitive(leafValue)) {
          yield indentedLine(depth, `${encodedFoldedKey}: ${encodePrimitive(leafValue, options.delimiter)}`, options.indent);
          return;
        } else if (isJsonArray(leafValue)) {
          yield* encodeArrayLines(foldedKey, leafValue, depth, options);
          return;
        } else if (isJsonObject(leafValue) && isEmptyObject(leafValue)) {
          yield indentedLine(depth, `${encodedFoldedKey}:`, options.indent);
          return;
        }
      }
      if (isJsonObject(remainder)) {
        yield indentedLine(depth, `${encodedFoldedKey}:`, options.indent);
        const remainingDepth = effectiveFlattenDepth - segmentCount;
        const foldedPath = pathPrefix ? `${pathPrefix}.${foldedKey}` : foldedKey;
        yield* encodeObjectLines(remainder, depth + 1, options, rootLiteralKeys, foldedPath, remainingDepth);
        return;
      }
    }
  }
  const encodedKey = encodeKey(key);
  if (isJsonPrimitive(value))
    yield indentedLine(depth, `${encodedKey}: ${encodePrimitive(value, options.delimiter)}`, options.indent);
  else if (isJsonArray(value))
    yield* encodeArrayLines(key, value, depth, options);
  else if (isJsonObject(value)) {
    yield indentedLine(depth, `${encodedKey}:`, options.indent);
    if (!isEmptyObject(value))
      yield* encodeObjectLines(value, depth + 1, options, rootLiteralKeys, currentPath, effectiveFlattenDepth);
  }
}
function* encodeArrayLines(key, value, depth, options) {
  if (value.length === 0) {
    yield indentedLine(depth, key != null ? `${encodeKey(key)}: []` : "[]", options.indent);
    return;
  }
  if (isArrayOfPrimitives(value)) {
    yield indentedLine(depth, encodeInlineArrayLine(value, options.delimiter, key), options.indent);
    return;
  }
  if (isArrayOfArrays(value)) {
    if (value.every((arr) => isArrayOfPrimitives(arr))) {
      yield* encodeArrayOfArraysAsListItemsLines(key, value, depth, options);
      return;
    }
  }
  if (isArrayOfObjects(value)) {
    const header = extractTabularHeader(value);
    if (header)
      yield* encodeArrayOfObjectsAsTabularLines(key, value, header, depth, options);
    else
      yield* encodeMixedArrayAsListItemsLines(key, value, depth, options);
    return;
  }
  yield* encodeMixedArrayAsListItemsLines(key, value, depth, options);
}
function* encodeArrayOfArraysAsListItemsLines(prefix, values, depth, options) {
  yield indentedLine(depth, formatHeader(values.length, {
    key: prefix,
    delimiter: options.delimiter
  }), options.indent);
  for (const arr of values)
    if (isArrayOfPrimitives(arr)) {
      const arrayLine = encodeInlineArrayLine(arr, options.delimiter);
      yield indentedListItem(depth + 1, arrayLine, options.indent);
    }
}
function encodeInlineArrayLine(values, delimiter, prefix) {
  const header = formatHeader(values.length, {
    key: prefix,
    delimiter
  });
  const joinedValue = encodeAndJoinPrimitives(values, delimiter);
  if (values.length === 0)
    return header;
  return `${header} ${joinedValue}`;
}
function* encodeArrayOfObjectsAsTabularLines(prefix, rows, header, depth, options) {
  yield indentedLine(depth, formatHeader(rows.length, {
    key: prefix,
    fields: header,
    delimiter: options.delimiter
  }), options.indent);
  yield* writeTabularRowsLines(rows, header, depth + 1, options);
}
function extractTabularHeader(rows) {
  if (rows.length === 0)
    return;
  const firstRow = rows[0];
  const firstKeys = Object.keys(firstRow);
  if (firstKeys.length === 0)
    return;
  if (isTabularArray(rows, firstKeys))
    return firstKeys;
}
function isTabularArray(rows, header) {
  for (const row of rows) {
    if (Object.keys(row).length !== header.length)
      return false;
    for (const key of header) {
      if (!Object.hasOwn(row, key))
        return false;
      if (!isJsonPrimitive(row[key]))
        return false;
    }
  }
  return true;
}
function* writeTabularRowsLines(rows, header, depth, options) {
  for (const row of rows)
    yield indentedLine(depth, encodeAndJoinPrimitives(header.map((key) => row[key]), options.delimiter), options.indent);
}
function* encodeMixedArrayAsListItemsLines(prefix, items, depth, options) {
  yield indentedLine(depth, formatHeader(items.length, {
    key: prefix,
    delimiter: options.delimiter
  }), options.indent);
  for (const item of items)
    yield* encodeListItemValueLines(item, depth + 1, options);
}
function* encodeObjectAsListItemLines(obj, depth, options) {
  if (isEmptyObject(obj)) {
    yield indentedLine(depth, "-", options.indent);
    return;
  }
  const entries = Object.entries(obj);
  const [firstKey, firstValue] = entries[0];
  const restEntries = entries.slice(1);
  if (isJsonArray(firstValue) && isArrayOfObjects(firstValue)) {
    const header = extractTabularHeader(firstValue);
    if (header) {
      yield indentedListItem(depth, formatHeader(firstValue.length, {
        key: firstKey,
        fields: header,
        delimiter: options.delimiter
      }), options.indent);
      yield* writeTabularRowsLines(firstValue, header, depth + 2, options);
      if (restEntries.length > 0)
        yield* encodeObjectLines(Object.fromEntries(restEntries), depth + 1, options);
      return;
    }
  }
  const encodedKey = encodeKey(firstKey);
  if (isJsonPrimitive(firstValue))
    yield indentedListItem(depth, `${encodedKey}: ${encodePrimitive(firstValue, options.delimiter)}`, options.indent);
  else if (isJsonArray(firstValue))
    if (firstValue.length === 0)
      yield indentedListItem(depth, `${encodedKey}: []`, options.indent);
    else if (isArrayOfPrimitives(firstValue))
      yield indentedListItem(depth, `${encodedKey}${encodeInlineArrayLine(firstValue, options.delimiter)}`, options.indent);
    else {
      yield indentedListItem(depth, `${encodedKey}${formatHeader(firstValue.length, { delimiter: options.delimiter })}`, options.indent);
      for (const item of firstValue)
        yield* encodeListItemValueLines(item, depth + 2, options);
    }
  else if (isJsonObject(firstValue)) {
    yield indentedListItem(depth, `${encodedKey}:`, options.indent);
    if (!isEmptyObject(firstValue))
      yield* encodeObjectLines(firstValue, depth + 2, options);
  }
  if (restEntries.length > 0)
    yield* encodeObjectLines(Object.fromEntries(restEntries), depth + 1, options);
}
function* encodeListItemValueLines(value, depth, options) {
  if (isJsonPrimitive(value))
    yield indentedListItem(depth, encodePrimitive(value, options.delimiter), options.indent);
  else if (isJsonArray(value))
    if (isArrayOfPrimitives(value))
      yield indentedListItem(depth, encodeInlineArrayLine(value, options.delimiter), options.indent);
    else {
      yield indentedListItem(depth, formatHeader(value.length, { delimiter: options.delimiter }), options.indent);
      for (const item of value)
        yield* encodeListItemValueLines(item, depth + 1, options);
    }
  else if (isJsonObject(value))
    yield* encodeObjectAsListItemLines(value, depth, options);
}
function indentedLine(depth, content, indentSize) {
  return " ".repeat(indentSize * depth) + content;
}
function indentedListItem(depth, content, indentSize) {
  return indentedLine(depth, "- " + content, indentSize);
}
function applyReplacer(root, replacer) {
  const replacedRoot = replacer("", root, []);
  if (replacedRoot === undefined)
    return transformChildren(root, replacer, []);
  return transformChildren(normalizeValue(replacedRoot), replacer, []);
}
function transformChildren(value, replacer, path) {
  if (isJsonObject(value))
    return transformObject(value, replacer, path);
  if (isJsonArray(value))
    return transformArray(value, replacer, path);
  return value;
}
function transformObject(obj, replacer, path) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const childPath = [...path, key];
    const replacedValue = replacer(key, value, childPath);
    if (replacedValue === undefined)
      continue;
    setOwnProperty(result, key, transformChildren(normalizeValue(replacedValue), replacer, childPath));
  }
  return result;
}
function transformArray(arr, replacer, path) {
  const result = [];
  for (let i = 0;i < arr.length; i++) {
    const value = arr[i];
    const childPath = [...path, i];
    const replacedValue = replacer(String(i), value, childPath);
    if (replacedValue === undefined)
      continue;
    const normalizedValue = normalizeValue(replacedValue);
    result.push(transformChildren(normalizedValue, replacer, childPath));
  }
  return result;
}
function encode(input, options) {
  return Array.from(encodeLines(input, options)).join(`
`);
}
function encodeLines(input, options) {
  const normalizedValue = normalizeValue(input);
  const resolvedOptions = resolveOptions(options);
  return encodeJsonValue(resolvedOptions.replacer ? applyReplacer(normalizedValue, resolvedOptions.replacer) : normalizedValue, resolvedOptions, 0);
}
function resolveOptions(options) {
  return {
    indent: options?.indent ?? 2,
    delimiter: options?.delimiter ?? DEFAULT_DELIMITER,
    keyFolding: options?.keyFolding ?? "off",
    flattenDepth: options?.flattenDepth ?? Number.POSITIVE_INFINITY,
    replacer: options?.replacer
  };
}
var NULL_LITERAL = "null", DELIMITERS, DEFAULT_DELIMITER, NUMERIC_LIKE_PATTERN, LEADING_ZERO_PATTERN, QUOTED_KEY_MARKER;
var init_dist = __esm(() => {
  DELIMITERS = {
    comma: ",",
    tab: "\t",
    pipe: "|"
  };
  DEFAULT_DELIMITER = DELIMITERS.comma;
  NUMERIC_LIKE_PATTERN = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;
  LEADING_ZERO_PATTERN = /^0\d+$/;
  QUOTED_KEY_MARKER = Symbol("quotedKey");
});

// node_modules/axi-sdk-js/dist/output.js
import { homedir } from "node:os";
function collapseHomeDirectory(path, homeDir = homedir()) {
  if (!path.startsWith(homeDir)) {
    return path;
  }
  return `~${path.slice(homeDir.length)}`;
}
function homeHeaderOutput(options) {
  return {
    bin: collapseHomeDirectory(options.execPath ?? process.argv[1] ?? "", options.homeDir),
    description: options.description
  };
}
function errorOutput(message, code, suggestions = []) {
  const output = {
    error: message,
    code
  };
  if (suggestions.length > 0) {
    output.help = suggestions;
  }
  return output;
}
function renderOutput(output) {
  if (typeof output === "string") {
    return output;
  }
  return encode(output);
}
function renderError(message, code, suggestions = []) {
  return renderOutput(errorOutput(message, code, suggestions));
}
var init_output = __esm(() => {
  init_dist();
});

// node_modules/axi-sdk-js/dist/update.js
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { promisify } from "node:util";
function parseSemver(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+[0-9A-Za-z-.]+)?$/.exec(version.trim());
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : []
  };
}
function comparePrerelease(a, b) {
  if (a.length === 0 && b.length === 0)
    return 0;
  if (a.length === 0)
    return 1;
  if (b.length === 0)
    return -1;
  const length = Math.max(a.length, b.length);
  for (let index = 0;index < length; index += 1) {
    if (index >= a.length)
      return -1;
    if (index >= b.length)
      return 1;
    const left = a[index];
    const right = b[index];
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) {
      const delta = Number(left) - Number(right);
      if (delta !== 0)
        return delta < 0 ? -1 : 1;
    } else if (leftNumeric) {
      return -1;
    } else if (rightNumeric) {
      return 1;
    } else if (left !== right) {
      return left < right ? -1 : 1;
    }
  }
  return 0;
}
function compareSemver(a, b) {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);
  if (!parsedA || !parsedB) {
    if (a === b)
      return 0;
    return a < b ? -1 : 1;
  }
  if (parsedA.major !== parsedB.major) {
    return parsedA.major < parsedB.major ? -1 : 1;
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor < parsedB.minor ? -1 : 1;
  }
  if (parsedA.patch !== parsedB.patch) {
    return parsedA.patch < parsedB.patch ? -1 : 1;
  }
  return comparePrerelease(parsedA.prerelease, parsedB.prerelease);
}
function isUpdateAvailable(current, latest) {
  return compareSemver(latest, current) > 0;
}
function readNearestPackageJson(startPath, fs = nodeFs) {
  let dir = dirname(startPath);
  let previous = "";
  while (dir !== previous) {
    const packageJsonPath = join(dir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        if (typeof parsed.name === "string" && parsed.name.length > 0) {
          return {
            packageName: parsed.name,
            version: typeof parsed.version === "string" ? parsed.version : undefined,
            packageJsonPath
          };
        }
      } catch {}
    }
    previous = dir;
    dir = dirname(dir);
  }
  return {};
}
function detectInstallMethod(options) {
  const env = options.env ?? process.env;
  const path = options.entry.replaceAll("\\", "/");
  if (path.includes("/_npx/") || /\/dlx-[^/]+\//.test(path) || path.includes("/pnpm/dlx/") || path.includes("/bun/install/cache/")) {
    return { kind: "npx" };
  }
  const homebrewFormula = homebrewFormulaFromPath(path, env);
  if (homebrewFormula) {
    return { kind: "homebrew", formula: homebrewFormula };
  }
  const pnpmHome = normalizePathRoot(env.PNPM_HOME);
  if (isPathInsideRoot(path, pnpmHome) || isKnownPnpmGlobalStore(path, env)) {
    return { kind: "pnpm-global" };
  }
  if (isKnownNpmGlobalInstall(path, env)) {
    return { kind: "npm-global" };
  }
  return { kind: "unknown" };
}
function normalizePathRoot(path) {
  const normalized = path?.replaceAll("\\", "/").replace(/\/+$/, "");
  return normalized && normalized.length > 0 ? normalized : undefined;
}
function isPathInsideRoot(path, root) {
  return root !== undefined && (path === root || path.startsWith(`${root}/`));
}
function homebrewFormulaFromPath(path, env) {
  for (const root of homebrewCellarRoots(env)) {
    if (!isPathInsideRoot(path, root)) {
      continue;
    }
    const relative = path.slice(root.length).replace(/^\/+/, "");
    const formula = relative.split("/")[0];
    if (formula) {
      return formula;
    }
  }
  return null;
}
function homebrewCellarRoots(env) {
  const roots = [];
  const explicitCellar = normalizePathRoot(env.HOMEBREW_CELLAR);
  if (explicitCellar) {
    roots.push(explicitCellar);
  }
  const prefixes = [
    env.HOMEBREW_PREFIX,
    "/opt/homebrew",
    "/usr/local",
    "/home/linuxbrew/.linuxbrew"
  ];
  for (const prefix of prefixes) {
    const normalized = normalizePathRoot(prefix);
    if (normalized) {
      roots.push(`${normalized}/Cellar`);
    }
  }
  return [...new Set(roots)];
}
function isKnownPnpmGlobalStore(path, env) {
  return pnpmGlobalStoreRoots(env).some((root) => {
    if (!isPathInsideRoot(path, root)) {
      return false;
    }
    const relative = path.slice(root.length).replace(/^\/+/, "");
    return /^\d+\/\.pnpm\//.test(relative);
  });
}
function pnpmGlobalStoreRoots(env) {
  const roots = [];
  const home = normalizePathRoot(env.HOME ?? env.USERPROFILE);
  if (home) {
    roots.push(`${home}/Library/pnpm/global`);
    roots.push(`${home}/.local/share/pnpm/global`);
    roots.push(`${home}/AppData/Local/pnpm/global`);
  }
  const localAppData = normalizePathRoot(env.LOCALAPPDATA);
  if (localAppData) {
    roots.push(`${localAppData}/pnpm/global`);
  }
  return [...new Set(roots)];
}
function isKnownNpmGlobalInstall(path, env) {
  return npmGlobalNodeModulesRoots(env).some((root) => isPathInsideRoot(path, root)) || isKnownVersionManagerNpmGlobal(path, env);
}
function npmGlobalNodeModulesRoots(env) {
  const roots = [
    "/usr/local/lib/node_modules",
    "/usr/lib/node_modules",
    "/opt/homebrew/lib/node_modules",
    "/opt/local/lib/node_modules"
  ];
  const prefixes = [env.npm_config_prefix, env.NPM_CONFIG_PREFIX];
  for (const prefix of prefixes) {
    const normalized = normalizePathRoot(prefix);
    if (normalized) {
      roots.push(`${normalized}/lib/node_modules`, `${normalized}/node_modules`);
    }
  }
  const appData = normalizePathRoot(env.APPDATA);
  if (appData) {
    roots.push(`${appData}/npm/node_modules`);
  }
  const home = normalizePathRoot(env.HOME ?? env.USERPROFILE);
  if (home) {
    roots.push(`${home}/.npm-global/lib/node_modules`, `${home}/.npm-packages/lib/node_modules`);
  }
  return [...new Set(roots)];
}
function isKnownVersionManagerNpmGlobal(path, env) {
  return versionManagerNodeRoots(env).some((root) => isPathInsideRoot(path, root) && path.includes("/lib/node_modules/"));
}
function versionManagerNodeRoots(env) {
  const roots = [];
  const home = normalizePathRoot(env.HOME ?? env.USERPROFILE);
  if (home) {
    roots.push(`${home}/.nvm/versions/node`, `${home}/.local/share/fnm/node-versions`, `${home}/.asdf/installs/nodejs`, `${home}/.nodenv/versions`, `${home}/.local/share/mise/installs/node`, `${home}/.volta/tools/image/node`);
  }
  const nvmDir = normalizePathRoot(env.NVM_DIR);
  if (nvmDir) {
    roots.push(`${nvmDir}/versions/node`);
  }
  const fnmDir = normalizePathRoot(env.FNM_DIR);
  if (fnmDir) {
    roots.push(`${fnmDir}/node-versions`);
  }
  return [...new Set(roots)];
}
function planUpgrade(method, packageName) {
  switch (method.kind) {
    case "npm-global":
      return {
        method: method.kind,
        command: `npm install -g ${packageName}@latest`,
        argv: ["npm", "install", "-g", `${packageName}@latest`]
      };
    case "pnpm-global":
      return {
        method: method.kind,
        command: `pnpm add -g ${packageName}@latest`,
        argv: ["pnpm", "add", "-g", `${packageName}@latest`]
      };
    case "homebrew":
      if (method.formula) {
        return {
          method: method.kind,
          command: `brew upgrade ${method.formula}`,
          argv: ["brew", "upgrade", method.formula]
        };
      }
      return {
        method: method.kind,
        command: `brew upgrade ${packageName}`,
        argv: null,
        note: "Could not determine the Homebrew formula automatically"
      };
    case "npx":
      return {
        method: method.kind,
        command: `npx -y ${packageName}@latest`,
        argv: null,
        note: "npx always runs the latest published version, so no install is needed"
      };
    case "unknown":
      return {
        method: method.kind,
        command: `npm install -g ${packageName}@latest`,
        argv: null,
        note: "Could not determine how this tool was installed"
      };
  }
}
function packageManagerExecutable(command, platform) {
  if (platform === "win32" && (command === "npm" || command === "pnpm" || command === "npx")) {
    return `${command}.cmd`;
  }
  return command;
}
function shouldUseWindowsPackageManagerShell(command, platform) {
  return platform === "win32" && (command === "npm" || command === "pnpm" || command === "npx");
}
async function npmViewVersion(packageName, platform = process.platform) {
  try {
    const command = packageManagerExecutable("npm", platform);
    const { stdout } = await execFileAsync(command, ["view", packageName, "version"], {
      timeout: 20000,
      shell: shouldUseWindowsPackageManagerShell("npm", platform)
    });
    const version = stdout.trim();
    return version.length > 0 ? version : null;
  } catch {
    return null;
  }
}
function registryPath(packageName) {
  return packageName.startsWith("@") ? packageName.replace("/", "%2f") : packageName;
}
function notPublishedError(packageName) {
  return new AxiError(`${packageName} is not published to the npm registry`, "UPDATE_ERROR", [
    "Confirm the package name is correct",
    `Run \`npm view ${packageName} version\` to check manually`
  ]);
}
async function withRegistryTimeout(timeoutMs, operation) {
  const controller = new AbortController;
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Registry fetch timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref?.();
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
async function fetchRegistryVersion(fetchImpl, packageName, timeoutMs) {
  return withRegistryTimeout(timeoutMs, async (signal) => {
    const response = await fetchImpl(`${REGISTRY_BASE}/${registryPath(packageName)}/latest`, { headers: { accept: "application/json" }, signal });
    if (response.ok) {
      const data = await response.json();
      if (typeof data.version === "string" && data.version.length > 0) {
        return data.version;
      }
    } else if (response.status === 404) {
      throw new RegistryNotFoundError;
    }
    return null;
  });
}
async function fetchLatestVersion(packageName, options = {}) {
  const fetchImpl = options.fetchImpl === undefined ? globalThis.fetch : options.fetchImpl ?? undefined;
  let registryNotFound = false;
  if (typeof fetchImpl === "function") {
    try {
      const version = await fetchRegistryVersion(fetchImpl, packageName, options.fetchTimeoutMs ?? REGISTRY_FETCH_TIMEOUT_MS);
      if (version) {
        return version;
      }
    } catch (error) {
      if (error instanceof RegistryNotFoundError) {
        registryNotFound = true;
      } else if (error instanceof AxiError) {
        throw error;
      }
    }
  }
  const viewed = await (options.npmView ?? ((name) => npmViewVersion(name, options.platform)))(packageName);
  if (viewed) {
    return viewed;
  }
  if (registryNotFound) {
    throw notPublishedError(packageName);
  }
  throw new AxiError(`Could not reach the npm registry to check for updates to ${packageName}`, "UPDATE_ERROR", [
    "Check your network connection and try again",
    `Run \`npm view ${packageName} version\` to check manually`
  ]);
}
async function defaultRunInstall(plan, stdout, context) {
  const argv = plan.argv;
  if (!argv || argv.length === 0) {
    return { ok: false, message: "No runnable upgrade command" };
  }
  stdout.write(`running: ${plan.command}
`);
  return new Promise((resolve) => {
    const [command, ...args] = argv;
    const child = spawn(packageManagerExecutable(command, context.platform), args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: shouldUseWindowsPackageManagerShell(command, context.platform)
    });
    child.stdout?.on("data", (chunk) => {
      process.stderr.write(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      process.stderr.write(chunk);
    });
    child.on("error", (error) => {
      resolve({ ok: false, message: error.message });
    });
    child.on("close", (code) => {
      resolve(code === 0 ? { ok: true } : { ok: false, message: `${plan.command} exited with code ${code}` });
    });
  });
}
function binNameFromArgv(invokedAs) {
  return basename(invokedAs ?? "tool") || "tool";
}
function resolveEntry(invokedAs, realpath) {
  if (!invokedAs) {
    return;
  }
  try {
    return realpath(invokedAs);
  } catch {
    return invokedAs;
  }
}
function resolveInstalledVersion(invokedAs, realpath, fs) {
  const installedEntry = resolveEntry(invokedAs, realpath);
  return installedEntry ? readNearestPackageJson(installedEntry, fs).version : undefined;
}
function homebrewUpgradeOutput(options) {
  const update = {
    package: options.packageName,
    previous: options.current,
    latest: options.latest
  };
  if (options.installedVersion) {
    update.installed = options.installedVersion;
    update.available = isUpdateAvailable(options.installedVersion, options.latest);
  } else {
    update.action = "upgrade-command-ran";
    update.result = "installed version unknown";
  }
  return {
    update,
    command: options.command
  };
}
function parseUpdateArgs(args, binName) {
  if (args.length === 0) {
    return "install";
  }
  if (args.length === 1 && (args[0] === "--check" || args[0] === "--dry-run")) {
    return "check";
  }
  const unknown = args.find((arg) => arg !== "--check" && arg !== "--dry-run");
  throw new AxiError(unknown ? `Unknown update option: ${unknown}` : "Invalid update arguments", "VALIDATION_ERROR", [
    `Run \`${binName} update --help\``,
    `Use \`${binName} update --check\` to check without installing`
  ]);
}
async function runUpdate(options) {
  const invokedAs = options.invokedAs ?? process.argv[1];
  const binName = binNameFromArgv(invokedAs);
  const mode = parseUpdateArgs(options.args, binName);
  const platform = options.platform ?? process.platform;
  const realpath = options.realpath ?? ((path) => realpathSync(path));
  const entry = resolveEntry(invokedAs, realpath);
  const fs = options.fs ?? nodeFs;
  const fromPackageJson = entry ? readNearestPackageJson(entry, fs) : {};
  const packageName = options.packageName ?? fromPackageJson.packageName;
  const current = options.version ?? fromPackageJson.version;
  if (!packageName) {
    throw new AxiError("Could not determine the package name to update", "UPDATE_ERROR", [
      "Reinstall the tool from npm so its package.json is available",
      "Tool authors can pass `packageName` to runAxiCli()"
    ]);
  }
  if (!current) {
    throw new AxiError(`Could not determine the current version of ${packageName}`, "UPDATE_ERROR", [
      "Reinstall the tool from npm so its version is available",
      "Tool authors can pass `version` to runAxiCli()"
    ]);
  }
  const fetchLatest = options.fetchLatest ?? ((name) => fetchLatestVersion(name, { platform }));
  const latest = await fetchLatest(packageName);
  const available = isUpdateAvailable(current, latest);
  if (mode === "check") {
    const output = {
      update: { package: packageName, current, latest, available }
    };
    if (available) {
      output.help = [`Run \`${binName} update\` to upgrade`];
    }
    return output;
  }
  if (!available) {
    return {
      update: `${packageName} is already on the latest version (${current})`
    };
  }
  const method = entry ? detectInstallMethod({ entry, env: options.env }) : { kind: "unknown" };
  const plan = planUpgrade(method, packageName);
  if (!plan.argv) {
    const help = method.kind === "npx" ? `Re-run with \`${plan.command}\` to use the latest version` : `Run \`${plan.command}\` to upgrade`;
    return {
      update: {
        package: packageName,
        current,
        latest,
        available: true,
        action: "manual",
        ...plan.note ? { reason: plan.note } : {},
        run: plan.command
      },
      help: [help]
    };
  }
  const runInstall = options.runInstall ?? defaultRunInstall;
  const result = await runInstall(plan, options.stdout, { platform });
  if (!result.ok) {
    throw new AxiError(`Failed to upgrade ${packageName}`, "UPDATE_ERROR", [
      `Run \`${plan.command}\` manually`,
      ...result.message ? [result.message] : []
    ]);
  }
  if (method.kind === "homebrew") {
    return homebrewUpgradeOutput({
      packageName,
      current,
      latest,
      installedVersion: resolveInstalledVersion(invokedAs, realpath, fs),
      command: plan.command
    });
  }
  return {
    update: `${packageName} upgraded ${current} -> ${latest}`,
    command: plan.command
  };
}
var execFileAsync, REGISTRY_BASE = "https://registry.npmjs.org", REGISTRY_FETCH_TIMEOUT_MS = 20000, nodeFs, RegistryNotFoundError;
var init_update = __esm(() => {
  init_errors();
  execFileAsync = promisify(execFile);
  nodeFs = {
    existsSync,
    readFileSync: (path, encoding) => readFileSync(path, encoding)
  };
  RegistryNotFoundError = class RegistryNotFoundError extends Error {
  };
});

// node_modules/axi-sdk-js/dist/cli.js
import { basename as basename2 } from "node:path";
function defaultFormatError(error) {
  if (error instanceof AxiError) {
    return {
      output: `${renderError(error.message, error.code, error.suggestions)}
`,
      exitCode: exitCodeForError(error)
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    output: `${renderError(message, "UNKNOWN")}
`,
    exitCode: 1
  };
}
function defaultUnknownCommand(command) {
  return `${renderError(`Unknown command: ${command}`, "VALIDATION_ERROR", [
    "Run `--help` to see available commands"
  ])}
`;
}
async function runAxiCli(options) {
  const stdout = options.stdout ?? process.stdout;
  handleStdoutErrors(stdout);
  try {
    await options.initialize?.();
  } catch (error) {
    writeFormattedError(error, stdout, options);
    return;
  }
  const argv = options.argv ?? process.argv.slice(2);
  if (argv.length === 1 && argv[0] === "--help") {
    stdout.write(options.topLevelHelp);
    if (!options.commands.update) {
      if (options.topLevelHelp.length > 0 && !options.topLevelHelp.endsWith(`
`)) {
        stdout.write(`
`);
      }
      stdout.write(builtinCommandsHelp());
    }
    return;
  }
  if (argv.length === 1 && isVersionFlag(argv[0])) {
    if (!options.version) {
      stdout.write(`${renderError("Version is not configured for this tool", "VALIDATION_ERROR")}
`);
      process.exitCode = 2;
      return;
    }
    stdout.write(`${options.version}
`);
    return;
  }
  const command = argv[0];
  if (!command) {
    await runHandler(options.home, [], { command: undefined, args: [] }, stdout, options, true);
    return;
  }
  if (command.startsWith("-")) {
    stdout.write(renderLeadingFlagError(command));
    process.exitCode = 2;
    return;
  }
  const args = argv.slice(1);
  if (command === "update" && !options.commands.update) {
    await runBuiltinUpdate(args, stdout, options);
    return;
  }
  if (args.includes("--help")) {
    const help = options.getCommandHelp?.(command);
    if (help) {
      stdout.write(help);
      return;
    }
  }
  const handler = options.commands[command];
  if (!handler) {
    stdout.write((options.renderUnknownCommand ?? defaultUnknownCommand)(command));
    process.exitCode = 2;
    return;
  }
  await runHandler(handler, args, { command, args }, stdout, options, false);
}
function handleStdoutErrors(stdout) {
  const errorObservable = stdout;
  if (typeof errorObservable.on !== "function" || stdoutWithErrorHandler.has(stdout)) {
    return;
  }
  stdoutWithErrorHandler.add(stdout);
  errorObservable.on("error", (error) => {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "EPIPE") {
      process.exitCode = 0;
      return;
    }
    throw error;
  });
}
async function runHandler(handler, args, contextInput, stdout, options, isHomeView) {
  try {
    const context = await options.resolveContext?.(contextInput);
    const output = await handler(args, context);
    stdout.write(`${renderCommandOutput(output, options, isHomeView)}
`);
  } catch (error) {
    writeFormattedError(error, stdout, options);
  }
}
async function runBuiltinUpdate(args, stdout, options) {
  if (args.length === 1 && args[0] === "--help") {
    stdout.write(builtinUpdateHelp());
    return;
  }
  try {
    const output = await runUpdate({
      args,
      stdout,
      packageName: options.packageName,
      version: options.version
    });
    stdout.write(`${renderOutput(output)}
`);
  } catch (error) {
    writeFormattedError(error, stdout, options);
  }
}
function writeFormattedError(error, stdout, options) {
  const formatted = (options.formatError ?? defaultFormatError)(error);
  stdout.write(formatted.output);
  process.exitCode = formatted.exitCode;
}
function resolveBinName() {
  return basename2(process.argv[1] ?? "tool") || "tool";
}
function builtinCommandsHelp() {
  const bin = resolveBinName();
  return `${renderOutput({
    "built-in": {
      update: `Upgrade \`${bin}\` to the latest published version`,
      "update --check": "Report current vs latest without installing"
    }
  })}
`;
}
function builtinUpdateHelp() {
  const bin = resolveBinName();
  return `${renderOutput({
    command: "update",
    description: `Upgrade \`${bin}\` to the latest published npm version`,
    flags: {
      "--check": "Report current vs latest and exit without installing"
    },
    examples: [`${bin} update`, `${bin} update --check`]
  })}
`;
}
function renderLeadingFlagError(flag) {
  const bin = basename2(process.argv[1] ?? "tool") || "tool";
  return `${renderError("Flags must come after the command", "VALIDATION_ERROR", [
    `Run \`${bin} <command> [args] [flags]\``,
    `Move \`${flag}\` after the command instead of before it`
  ])}
`;
}
function isVersionFlag(flag) {
  return flag === "-v" || flag === "-V" || flag === "--version";
}
function renderCommandOutput(output, options, isHomeView) {
  if (!isHomeView) {
    return renderOutput(output);
  }
  const header = homeHeaderOutput({ description: options.description });
  if (typeof output === "string") {
    return `${renderOutput(header)}
${output}`;
  }
  return renderOutput(mergeHomeHeader(header, output));
}
function mergeHomeHeader(header, output) {
  const rest = { ...output };
  delete rest.bin;
  delete rest.description;
  return {
    ...header,
    ...rest
  };
}
var stdoutWithErrorHandler;
var init_cli = __esm(() => {
  init_errors();
  init_output();
  init_update();
  stdoutWithErrorHandler = new WeakSet;
});

// node_modules/axi-sdk-js/dist/hooks.js
var init_hooks = () => {};

// node_modules/axi-sdk-js/dist/index.js
var init_dist2 = __esm(() => {
  init_cli();
  init_errors();
  init_hooks();
  init_update();
});

// src/git.ts
import { execFileSync } from "node:child_process";
function git(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    throw new AxiError("repo-journal requires a git work tree", "NOT_GIT_REPO", ["cd into a clone", "run git init for a new project"]);
  }
}
function gitOr(args, cwd, fallback) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    return fallback;
  }
}
function resolveRepoRoot(cwd = process.cwd()) {
  return git(["rev-parse", "--show-toplevel"], cwd);
}
function gitStatus(repoRoot) {
  const branch = gitOr(["symbolic-ref", "--short", "HEAD"], repoRoot, "HEAD");
  const head = gitOr(["rev-parse", "--short", "HEAD"], repoRoot, "unborn");
  const dirty = gitOr(["status", "--porcelain"], repoRoot, "").length > 0;
  return { branch, head, dirty };
}
function listTrackedJournalFiles(repoRoot) {
  try {
    const out = execFileSync("git", ["ls-files", "--", ".journal"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
    if (!out)
      return [];
    return out.split(`
`).filter(Boolean);
  } catch {
    return [];
  }
}
var init_git = __esm(() => {
  init_dist2();
});

// src/context.ts
import { join as join2 } from "node:path";
function resolveActionCwd(raw = process.env.HERDR_PLUGIN_CONTEXT_JSON, fallback = process.cwd()) {
  if (!raw)
    return fallback;
  try {
    const context = JSON.parse(raw);
    for (const key of ["focused_pane_cwd", "workspace_cwd"]) {
      const value = context[key];
      if (typeof value === "string" && value.trim())
        return value;
    }
  } catch {}
  return fallback;
}
function resolveJournalContext(cwd = resolveActionCwd()) {
  const repoRoot = resolveRepoRoot(cwd);
  return {
    repoRoot,
    journalDir: join2(repoRoot, ".journal"),
    cwd
  };
}
var init_context = __esm(() => {
  init_git();
});

// src/gitignore.ts
import {
  appendFileSync,
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync as readFileSync2
} from "node:fs";
import { join as join3 } from "node:path";
function journalRuleIsEffective(text) {
  let ignored = false;
  for (const rawLine of text.split(`
`)) {
    const line = rawLine.trim();
    const match = /^(!?)\/?\.journal\/?$/.exec(line);
    if (match)
      ignored = match[1] !== "!";
  }
  return ignored;
}
function readGitignore(path) {
  try {
    const info = lstatSync(path);
    if (info.isSymbolicLink() || !info.isFile()) {
      throw new AxiError(`.gitignore must be a regular file: ${path}`, "UNSAFE_PATH");
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
  let descriptor;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw new AxiError(`refusing to read unsafe path: ${path}`, "UNSAFE_PATH");
  }
  try {
    if (!fstatSync(descriptor).isFile()) {
      throw new AxiError(`.gitignore must be a regular file: ${path}`, "UNSAFE_PATH");
    }
    return readFileSync2(descriptor, "utf8");
  } finally {
    closeSync(descriptor);
  }
}
function journalIgnoredInGitignore(repoRoot) {
  const path = join3(repoRoot, ".gitignore");
  const text = readGitignore(path);
  return text !== null && journalRuleIsEffective(text);
}
function ensureJournalGitignore(repoRoot) {
  const path = join3(repoRoot, ".gitignore");
  const text = readGitignore(path);
  if (text !== null && journalRuleIsEffective(text)) {
    return "ok";
  }
  const sep = text === null || text.endsWith(`
`) || text.length === 0 ? "" : `
`;
  let descriptor;
  try {
    const createFlags = text === null ? constants.O_CREAT | constants.O_EXCL : constants.O_APPEND;
    descriptor = openSync(path, constants.O_WRONLY | constants.O_NOFOLLOW | createFlags, 420);
  } catch {
    throw new AxiError(`refusing to write unsafe path: ${path}`, "UNSAFE_PATH");
  }
  try {
    if (!fstatSync(descriptor).isFile()) {
      throw new AxiError(`.gitignore must be a regular file: ${path}`, "UNSAFE_PATH");
    }
    appendFileSync(descriptor, `${sep}${GITIGNORE_BLOCK}`, "utf8");
  } finally {
    closeSync(descriptor);
  }
  return "appended";
}
var GITIGNORE_BLOCK = `# Repo Journal — local investigation scratch (repo-journal)
/.journal/
`;
var init_gitignore = __esm(() => {
  init_dist2();
});

// src/flags.ts
function parseGlobalFlags(args) {
  const stripped = [];
  let plain = false;
  let json = false;
  for (const arg of args) {
    if (arg === "--plain") {
      plain = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    stripped.push(arg);
  }
  return { stripped, plain, json };
}
function takeFlag(stripped, name) {
  const out = [];
  let present = false;
  for (const arg of stripped) {
    if (arg === name) {
      present = true;
      continue;
    }
    out.push(arg);
  }
  return { args: out, present };
}

// src/journal.ts
import {
  closeSync as closeSync2,
  constants as constants2,
  fstatSync as fstatSync2,
  lstatSync as lstatSync2,
  mkdirSync,
  openSync as openSync2,
  readdirSync,
  readFileSync as readFileSync3,
  realpathSync as realpathSync2,
  writeFileSync,
  appendFileSync as appendFileSync2
} from "node:fs";
import { basename as basename3, dirname as dirname2, join as join4 } from "node:path";
function slugify(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function parseBasename(name) {
  const m = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/.exec(name);
  if (!m)
    return null;
  return { date: m[1], slug: m[2] };
}
function readTitle(filePath) {
  const first = readRegularFile(filePath).split(`
`)[0] ?? "";
  const title = first.replace(/^#\s*/, "").trim();
  return title || "untitled";
}
function unsafePath(message) {
  return new AxiError(message, "UNSAFE_PATH");
}
function readRegularFile(path) {
  let descriptor;
  try {
    descriptor = openSync2(path, constants2.O_RDONLY | constants2.O_NOFOLLOW);
  } catch {
    throw unsafePath(`refusing to read unsafe journal path: ${path}`);
  }
  try {
    if (!fstatSync2(descriptor).isFile()) {
      throw unsafePath(`journal entry is not a regular file: ${path}`);
    }
    return readFileSync3(descriptor, "utf8");
  } finally {
    closeSync2(descriptor);
  }
}
function appendRegularFile(path, text) {
  let descriptor;
  try {
    descriptor = openSync2(path, constants2.O_WRONLY | constants2.O_APPEND | constants2.O_NOFOLLOW);
  } catch {
    throw unsafePath(`refusing to write unsafe journal path: ${path}`);
  }
  try {
    if (!fstatSync2(descriptor).isFile()) {
      throw unsafePath(`journal entry is not a regular file: ${path}`);
    }
    appendFileSync2(descriptor, text, "utf8");
  } finally {
    closeSync2(descriptor);
  }
}
function createRegularFile(path, text) {
  let descriptor;
  try {
    descriptor = openSync2(path, constants2.O_WRONLY | constants2.O_CREAT | constants2.O_EXCL | constants2.O_NOFOLLOW, 384);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST") {
      readRegularFile(path);
      return false;
    }
    throw unsafePath(`refusing to create unsafe journal path: ${path}`);
  }
  try {
    writeFileSync(descriptor, text, "utf8");
  } finally {
    closeSync2(descriptor);
  }
  return true;
}
function ensureJournalDir(journalDir) {
  try {
    mkdirSync(journalDir, { recursive: true });
    const info = lstatSync2(journalDir);
    if (info.isSymbolicLink() || !info.isDirectory() || realpathSync2(journalDir) !== join4(realpathSync2(dirname2(journalDir)), basename3(journalDir))) {
      throw unsafePath(`journal directory must be a real directory: ${journalDir}`);
    }
  } catch (error) {
    if (error instanceof AxiError)
      throw error;
    throw unsafePath(`cannot safely use journal directory: ${journalDir}`);
  }
}
function listEntryFiles(journalDir) {
  try {
    const info = lstatSync2(journalDir);
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw unsafePath(`journal directory must be a real directory: ${journalDir}`);
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }
    if (error instanceof AxiError)
      throw error;
    throw unsafePath(`cannot safely read journal directory: ${journalDir}`);
  }
  return readdirSync(journalDir, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => entry.name).sort().reverse().map((f) => join4(journalDir, f));
}
function listEntries(journalDir) {
  return listEntryFiles(journalDir).flatMap((path) => {
    const base = basename3(path);
    const parsed = parseBasename(base);
    if (!parsed)
      return [];
    return [
      {
        slug: parsed.slug,
        date: parsed.date,
        title: readTitle(path),
        basename: base.replace(/\.md$/, ""),
        path
      }
    ];
  });
}
function latestForSlug(journalDir, slug) {
  const files = listEntryFiles(journalDir).filter((path) => {
    const parsed = parseBasename(basename3(path));
    return parsed?.slug === slug;
  });
  return files[0];
}
function requireSlug(raw) {
  const slug = slugify(raw);
  if (!slug) {
    throw new AxiError("slug must contain at least one letter or digit", "VALIDATION_ERROR");
  }
  return slug;
}
function todayIso() {
  const d = new Date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function nowTime() {
  const d = new Date;
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}
function nowStamp() {
  const d = new Date;
  return `${todayIso()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function cmdNew(journalDir, slugRaw, titleWords) {
  const slug = requireSlug(slugRaw);
  ensureJournalDir(journalDir);
  const date = todayIso();
  const file = join4(journalDir, `${date}-${slug}.md`);
  const title = titleWords.length > 0 ? titleWords.join(" ") : slugRaw;
  const body = `# ${title}

_Investigation started ${nowStamp()}_

## Findings
`;
  if (!createRegularFile(file, body)) {
    return { path: file, created: false, slug };
  }
  return { path: file, created: true, slug };
}
function cmdAdd(journalDir, slugRaw, noteParts) {
  const slug = requireSlug(slugRaw);
  ensureJournalDir(journalDir);
  let file = latestForSlug(journalDir, slug);
  if (!file) {
    const created = cmdNew(journalDir, slugRaw, [slugRaw]);
    file = created.path;
  }
  const note = noteParts.join(" ");
  ensureJournalDir(journalDir);
  appendRegularFile(file, `- **${nowTime()}** ${note}
`);
  return { path: file, slug };
}
function readEntryContent(path, full) {
  const content = readRegularFile(path);
  if (full)
    return { content, truncated: false };
  const maxChars = 4000;
  if (content.length <= maxChars)
    return { content, truncated: false };
  return {
    content: `${content.slice(0, maxChars)}

… (${content.length - maxChars} more chars; use --full)
`,
    truncated: true
  };
}
var init_journal = __esm(() => {
  init_dist2();
});

// src/render.ts
import { homedir as homedir2 } from "node:os";
function collapseHomeDirectory2(path) {
  const home = homedir2();
  if (!path.startsWith(home))
    return path;
  return `~${path.slice(home.length)}`;
}
function homeHeader(description) {
  return {
    bin: collapseHomeDirectory2(process.argv[1] ?? ""),
    description
  };
}
function withHelp(body, help) {
  if (help.length === 0)
    return body;
  return { ...body, help };
}
var init_render = () => {};

// src/commands.ts
import { relative } from "node:path";
function rel(ctx, abs) {
  return relative(ctx.repoRoot, abs) || abs;
}
function shouldEnsureGitignore() {
  return process.env.REPO_JOURNAL_ENSURE_GITIGNORE !== "0";
}
function ensurePolicy(ctx) {
  if (!shouldEnsureGitignore())
    return "skipped";
  return ensureJournalGitignore(ctx.repoRoot);
}
async function homeCommand(_args, context) {
  if (!context)
    throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(_args);
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR", [
      "run with no arguments for the dashboard"
    ]);
  }
  const git2 = gitStatus(context.repoRoot);
  const tracked = listTrackedJournalFiles(context.repoRoot);
  const gitignoreOk = journalIgnoredInGitignore(context.repoRoot);
  const entries = listEntries(context.journalDir);
  const recent = entries.slice(0, DEFAULT_LIST);
  const body = mergeDashboard(context, git2, gitignoreOk, tracked.length, entries, recent);
  if (plain)
    return context.journalDir;
  if (json)
    return JSON.stringify(body);
  return body;
}
function mergeDashboard(ctx, git2, gitignoreOk, trackedCount, entries, recent) {
  return withHelp({
    ...homeHeader(DESCRIPTION),
    repo_root: ctx.repoRoot,
    journal_dir: ctx.journalDir,
    git: git2,
    policy: {
      gitignore: gitignoreOk ? "ok" : "missing",
      tracked_journal_files: trackedCount,
      ensure_gitignore: shouldEnsureGitignore()
    },
    summary: {
      entries_total: entries.length,
      entries_shown: recent.length,
      empty: entries.length === 0
    },
    entries_recent: recent.map((e) => ({
      slug: e.slug,
      date: e.date,
      title: e.title
    }))
  }, entries.length ? [
    `repo-journal show ${recent[0]?.slug ?? "<slug>"}`,
    'repo-journal new <slug> "<title>"'
  ] : ['repo-journal new <slug> "<title>"']);
}
async function newCommand(args, context) {
  if (!context)
    throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length < 1) {
    throw new AxiError("new requires a slug", "VALIDATION_ERROR", [
      'repo-journal new auth-timeout "Why login times out"'
    ]);
  }
  const slugRaw = stripped[0];
  requireSlug(slugRaw);
  const titleWords = stripped.slice(1);
  const gitignore = ensurePolicy(context);
  const { path, created, slug } = cmdNew(context.journalDir, slugRaw, titleWords);
  if (plain)
    return path;
  const body = withHelp({
    ok: {
      op: "new",
      slug,
      path: rel(context, path),
      created,
      gitignore
    }
  }, [`repo-journal add ${slug} "<finding>"`, `repo-journal show ${slug}`]);
  if (json)
    return JSON.stringify(body);
  return body;
}
async function addCommand(args, context) {
  if (!context)
    throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length < 2) {
    throw new AxiError("add requires a slug and note text", "VALIDATION_ERROR", [
      'repo-journal add auth-timeout "repro at 40 logins"'
    ]);
  }
  const slugRaw = stripped[0];
  requireSlug(slugRaw);
  const noteParts = stripped.slice(1);
  ensurePolicy(context);
  const { path, slug } = cmdAdd(context.journalDir, slugRaw, noteParts);
  if (plain)
    return path;
  const body = withHelp({
    ok: {
      op: "add",
      slug,
      path: rel(context, path)
    }
  }, [`repo-journal show ${slug}`, `repo-journal show ${slug} --full`]);
  if (json)
    return JSON.stringify(body);
  return body;
}
async function listCommand(args, context) {
  if (!context)
    throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped: afterGlobal } = parseGlobalFlags(args);
  const longAll = takeFlag(afterGlobal, "--all");
  const shortAll = takeFlag(longAll.args, "-a");
  const stripped = shortAll.args;
  const all = longAll.present || shortAll.present;
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR");
  }
  const entries = listEntries(context.journalDir);
  const shown = all ? entries : entries.slice(0, DEFAULT_LIST);
  if (plain) {
    return shown.map((e) => `${e.basename}  ${e.title}`).join(`
`);
  }
  const body = entries.length === 0 ? withHelp({
    entries: [],
    summary: { shown: 0, total: 0, empty: true }
  }, ['repo-journal new <slug> "<title>"']) : withHelp({
    entries: shown.map((e) => ({
      slug: e.slug,
      date: e.date,
      title: e.title
    })),
    summary: {
      shown: shown.length,
      total: entries.length,
      truncated: !all && entries.length > DEFAULT_LIST
    }
  }, ["repo-journal show <slug>", "repo-journal list --all"]);
  if (json)
    return JSON.stringify(body);
  return body;
}
async function showCommand(args, context) {
  if (!context)
    throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped: afterGlobal } = parseGlobalFlags(args);
  const { args: stripped, present: full } = takeFlag(afterGlobal, "--full");
  if (stripped.length !== 1) {
    throw new AxiError("show requires exactly one slug", "VALIDATION_ERROR", [
      "repo-journal show auth-timeout"
    ]);
  }
  const slug = requireSlug(stripped[0]);
  const file = latestForSlug(context.journalDir, slug);
  if (!file) {
    throw new AxiError(`no entry matching '${stripped[0]}' under ${context.journalDir}`, "NOT_FOUND", ["repo-journal list", `repo-journal new ${stripped[0]} "<title>"`]);
  }
  const { content, truncated } = readEntryContent(file, full || plain);
  if (plain)
    return content;
  const body = withHelp({
    slug,
    path: rel(context, file),
    truncated,
    content
  }, truncated ? [`repo-journal show ${slug} --full`] : []);
  if (json)
    return JSON.stringify(body);
  return body;
}
async function pathCommand(args, context) {
  if (!context)
    throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR");
  }
  ensureJournalDir(context.journalDir);
  ensurePolicy(context);
  if (plain)
    return context.journalDir;
  const body = { journal_dir: context.journalDir };
  if (json)
    return JSON.stringify(body);
  return body;
}
async function rootCommand(args, context) {
  if (!context)
    throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR");
  }
  if (plain)
    return context.repoRoot;
  const body = { repo_root: context.repoRoot };
  if (json)
    return JSON.stringify(body);
  return body;
}
async function doctorCommand(args, context) {
  if (!context)
    throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR");
  }
  const git2 = gitStatus(context.repoRoot);
  const tracked = listTrackedJournalFiles(context.repoRoot);
  const gitignoreOk = journalIgnoredInGitignore(context.repoRoot);
  const issues = [];
  if (!gitignoreOk)
    issues.push("gitignore_missing");
  if (tracked.length > 0)
    issues.push("journal_tracked_in_git");
  const body = withHelp({
    ok: issues.length === 0,
    repo_root: context.repoRoot,
    journal_dir: context.journalDir,
    git: git2,
    gitignore: gitignoreOk ? "ok" : "missing",
    tracked_journal_files: tracked.length,
    tracked_paths: tracked.slice(0, 5),
    issues
  }, [
    ...gitignoreOk ? [] : ["repo-journal ensure-gitignore"],
    ...tracked.length ? ["git rm -r --cached .journal/  # then commit if you intentionally track nothing"] : [],
    'repo-journal new <slug> "<title>"'
  ]);
  if (plain)
    return issues.length === 0 ? "ok" : issues.join(",");
  if (json)
    return JSON.stringify(body);
  return body;
}
async function ensureGitignoreCommand(args, context) {
  if (!context)
    throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR");
  }
  const result = ensureJournalGitignore(context.repoRoot);
  if (plain)
    return result;
  const body = withHelp({ ok: { op: "ensure-gitignore", result } }, ["repo-journal doctor"]);
  if (json)
    return JSON.stringify(body);
  return body;
}
var DESCRIPTION = "Git-root .journal/ scratch for agent investigations. TOON by default; --plain for scripting.", DEFAULT_LIST = 20, TOP_HELP = `usage: repo-journal [command] [args] [flags]
commands[10]:
  (none)=dashboard, dashboard, new, add, list, show, path, root, doctor, ensure-gitignore
flags[3]:
  --plain (scripting: paths or raw text), --json (machine-readable), --help, -v/--version
examples:
  repo-journal
  repo-journal new auth-timeout "Why login times out" --plain
  repo-journal add auth-timeout "repro at 40 logins"
  repo-journal list
  repo-journal show auth-timeout --full
  repo-journal doctor
`, COMMAND_HELP;
var init_commands = __esm(() => {
  init_dist2();
  init_git();
  init_gitignore();
  init_journal();
  init_render();
  COMMAND_HELP = {
    dashboard: "usage: repo-journal dashboard [--plain|--json]",
    new: "usage: repo-journal new <slug> [title words...] [--plain|--json]",
    add: "usage: repo-journal add <slug> <text...> [--plain|--json]",
    list: "usage: repo-journal list [--all] [--plain|--json]",
    show: "usage: repo-journal show <slug> [--full] [--plain|--json]",
    path: "usage: repo-journal path [--plain|--json]",
    root: "usage: repo-journal root [--plain|--json]",
    doctor: "usage: repo-journal doctor [--plain|--json]",
    "ensure-gitignore": "usage: repo-journal ensure-gitignore [--plain|--json]"
  };
});

// src/cli.ts
var exports_cli = {};
__export(exports_cli, {
  main: () => main
});
async function main(argv) {
  const rawArgv = argv ?? process.argv.slice(2);
  const dashboardFlags = rawArgv.length > 0 && rawArgv.every((arg) => arg === "--plain" || arg === "--json");
  const normalizedArgv = dashboardFlags ? ["dashboard", ...rawArgv] : rawArgv;
  const jsonErrors = normalizedArgv.includes("--json");
  await runAxiCli({
    argv: normalizedArgv,
    description: DESCRIPTION,
    version: VERSION,
    packageName: "repo-journal-axi",
    topLevelHelp: TOP_HELP,
    home: homeCommand,
    resolveContext: async () => resolveJournalContext(),
    getCommandHelp: (command) => COMMAND_HELP[command] ?? null,
    ...jsonErrors ? {
      renderUnknownCommand: (command) => `${JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: `Unknown command: ${command}`,
          suggestions: ["Run `--help` to see available commands"]
        }
      })}
`,
      formatError: (error) => {
        const known = error instanceof AxiError;
        return {
          output: `${JSON.stringify({
            error: {
              code: known ? error.code : "UNKNOWN",
              message: error instanceof Error ? error.message : String(error),
              suggestions: known ? error.suggestions : []
            }
          })}
`,
          exitCode: exitCodeForError(error)
        };
      }
    } : {},
    commands: {
      dashboard: homeCommand,
      new: newCommand,
      add: addCommand,
      list: listCommand,
      show: showCommand,
      path: pathCommand,
      root: rootCommand,
      doctor: doctorCommand,
      "ensure-gitignore": ensureGitignoreCommand
    }
  });
}
var init_cli2 = __esm(() => {
  init_dist2();
  init_context();
  init_commands();
});

// node_modules/axi-sdk-js/dist/fast-path.js
function tryFastPath(argv, options) {
  if (argv.length !== 1) {
    return false;
  }
  const flag = argv[0];
  if (flag !== "-v" && flag !== "-V" && flag !== "--version") {
    return false;
  }
  (options.stdout ?? process.stdout).write(`${options.version}
`);
  return true;
}

// bin/repo-journal.ts
if (!tryFastPath(process.argv.slice(2), { version: VERSION })) {
  const { main: main2 } = await Promise.resolve().then(() => (init_cli2(), exports_cli));
  await main2();
}
