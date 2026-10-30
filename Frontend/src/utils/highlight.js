/**
 * Small dependency-free tokenizer used by the read-only code viewer.
 * It returns an array of { text, kind } tokens per source string.
 */

const PY_KEYWORDS = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break",
  "class", "continue", "def", "del", "elif", "else", "except", "finally",
  "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal",
  "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
  "match", "case", "self", "cls",
])

const PY_BUILTINS = new Set([
  "abs", "all", "any", "bool", "bytes", "callable", "chr", "dict", "dir",
  "enumerate", "filter", "float", "format", "frozenset", "getattr", "hasattr",
  "hash", "id", "input", "int", "isinstance", "issubclass", "iter", "len",
  "list", "map", "max", "min", "next", "object", "open", "ord", "pow",
  "print", "range", "repr", "reversed", "round", "set", "setattr", "slice",
  "sorted", "staticmethod", "classmethod", "property", "str", "sum", "super",
  "tuple", "type", "vars", "zip", "Exception", "ValueError", "TypeError",
  "KeyError", "RuntimeError", "IndexError",
])

const GENERIC_KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "class", "new", "import", "from", "export", "default", "async", "await",
  "try", "catch", "finally", "throw", "typeof", "true", "false", "null",
  "undefined", "interface", "type", "enum", "public", "private", "static",
  "select", "insert", "update", "delete", "where", "join", "SELECT", "FROM",
])

const IDENT_START = /[A-Za-z_$]/
const IDENT_PART = /[A-Za-z0-9_$]/
const DIGIT = /[0-9]/
const OPERATOR = /[+\-*/%=<>!&|^~?:;,.()[\]{}@]/

function isPythonish(language) {
  return language === "python" || language === "py" || language === "python3"
}

/**
 * Tokenize source code for lightweight highlighting.
 * @param {string} source
 * @param {string} language
 */
export function tokenize(source, language = "python") {
  const text = String(source ?? "")
  const python = isPythonish(language)
  const keywords = python ? PY_KEYWORDS : GENERIC_KEYWORDS
  const tokens = []
  let index = 0
  let buffer = ""

  const flush = () => {
    if (buffer) {
      tokens.push({ text: buffer, kind: "plain" })
      buffer = ""
    }
  }

  const push = (value, kind) => {
    flush()
    tokens.push({ text: value, kind })
  }

  while (index < text.length) {
    const char = text[index]

    // Comments
    if (char === "#" && python) {
      const end = text.indexOf("\n", index)
      const stop = end === -1 ? text.length : end
      push(text.slice(index, stop), "com")
      index = stop
      continue
    }

    if (!python && char === "/" && (text[index + 1] === "/" || text[index + 1] === "*")) {
      if (text[index + 1] === "/") {
        const end = text.indexOf("\n", index)
        const stop = end === -1 ? text.length : end
        push(text.slice(index, stop), "com")
        index = stop
      } else {
        const end = text.indexOf("*/", index + 2)
        const stop = end === -1 ? text.length : end + 2
        push(text.slice(index, stop), "com")
        index = stop
      }
      continue
    }

    // Decorators
    if (python && char === "@" && IDENT_START.test(text[index + 1] || "")) {
      let end = index + 1
      while (end < text.length && (IDENT_PART.test(text[end]) || text[end] === ".")) end += 1
      push(text.slice(index, end), "dec")
      index = end
      continue
    }

    // Strings (including triple quoted and prefixed literals)
    if (char === '"' || char === "'" || char === "`") {
      let start = index
      let prefixLength = 0

      // Look backwards for a string prefix that was buffered as plain text.
      const prefixMatch = /(?:[rbfuRBFU]{1,2})$/.exec(buffer)
      if (python && prefixMatch) {
        prefixLength = prefixMatch[0].length
        buffer = buffer.slice(0, buffer.length - prefixLength)
        start = index - prefixLength
      }

      const triple = text.slice(index, index + 3)
      const isTriple = triple === '"""' || triple === "'''"
      const delimiter = isTriple ? triple : char
      let cursor = index + delimiter.length

      while (cursor < text.length) {
        if (text[cursor] === "\\") {
          cursor += 2
          continue
        }
        if (text.startsWith(delimiter, cursor)) {
          cursor += delimiter.length
          break
        }
        if (!isTriple && text[cursor] === "\n") break
        cursor += 1
      }

      push(text.slice(start, cursor), "str")
      index = cursor
      continue
    }

    // Numbers
    if (DIGIT.test(char) || (char === "." && DIGIT.test(text[index + 1] || ""))) {
      let end = index
      while (end < text.length && /[0-9a-fA-FxXoObB._+\-eE]/.test(text[end])) {
        // Stop on a sign that is not part of an exponent.
        if ((text[end] === "+" || text[end] === "-") && !/[eE]/.test(text[end - 1] || "")) break
        end += 1
      }
      push(text.slice(index, end), "num")
      index = end
      continue
    }

    // Identifiers and keywords
    if (IDENT_START.test(char)) {
      let end = index
      while (end < text.length && IDENT_PART.test(text[end])) end += 1
      const word = text.slice(index, end)

      let after = end
      while (after < text.length && text[after] === " ") after += 1
      const isCall = text[after] === "("

      const prevWord = /(\bdef|\bclass)\s+$/.exec(text.slice(Math.max(0, index - 12), index))

      let kind = "plain"
      if (keywords.has(word)) kind = "kw"
      else if (prevWord) kind = prevWord[1] === "class" ? "cls" : "fn"
      else if (PY_BUILTINS.has(word)) kind = "bi"
      else if (isCall) kind = "fn"
      else if (/^[A-Z][A-Za-z0-9_]*$/.test(word)) kind = "cls"

      if (kind === "plain") buffer += word
      else push(word, kind)

      index = end
      continue
    }

    if (OPERATOR.test(char)) {
      push(char, "op")
      index += 1
      continue
    }

    buffer += char
    index += 1
  }

  flush()
  return tokens
}

/** Split tokenized source into lines of tokens so line numbers stay aligned. */
export function tokenizeLines(source, language = "python") {
  const tokens = tokenize(source, language)
  const lines = [[]]

  for (const token of tokens) {
    const parts = token.text.split("\n")
    parts.forEach((part, partIndex) => {
      if (partIndex > 0) lines.push([])
      if (part) lines[lines.length - 1].push({ text: part, kind: token.kind })
    })
  }

  return lines
}
