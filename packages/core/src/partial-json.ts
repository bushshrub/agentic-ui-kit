type Frame = { close: "}" | "]"; expect: "key" | "colon" | "value" | "comma" };

const tryParse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/**
 * Best-effort value of JSON that is still streaming, so a tool call's fields can show while the model
 * writes them: `{"title":"Stand-up","day":"Tu` gives `{ title: "Stand-up", day: "Tu" }`. Open strings are
 * cut where the text ends, open objects and arrays are closed, and a key without its value yet is left
 * out. Returns undefined when nothing usable has arrived. One pass over the text.
 */
export function parsePartialJson(text: string): unknown {
  const whole = tryParse(text);
  if (whole !== undefined) return whole;

  const stack: Frame[] = [];
  const closers = () => stack.map((f) => f.close).reverse().join("");
  // The longest prefix known to close into valid JSON, with what closes it.
  let safe = 0;
  let safeClose = "";
  const valueDone = (end: number) => {
    const top = stack.at(-1);
    if (top) top.expect = "comma";
    safe = end;
    safeClose = closers();
  };

  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i]!;
    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
      i++;
      continue;
    }
    const top = stack.at(-1);
    if (ch === '"') {
      let j = i + 1;
      let escaped = false;
      for (; j < n; j++) {
        const c = text[j];
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') break;
      }
      const isKey = top?.close === "}" && top.expect === "key";
      if (j >= n) {
        if (isKey) break;
        // An open string value: show what has arrived, minus a half-written escape.
        const body = text.slice(i, n).replace(/\\(u[0-9a-fA-F]{0,3})?$/, "");
        return tryParse(text.slice(0, i) + body + '"' + closers()) ?? tryParse(text.slice(0, safe) + safeClose);
      }
      i = j + 1;
      if (isKey) top.expect = "colon";
      else valueDone(i);
      continue;
    }
    if (ch === ":") {
      if (top) top.expect = "value";
      i++;
      continue;
    }
    if (ch === ",") {
      if (top) top.expect = top.close === "}" ? "key" : "value";
      i++;
      continue;
    }
    if (ch === "{" || ch === "[") {
      stack.push({ close: ch === "{" ? "}" : "]", expect: ch === "{" ? "key" : "value" });
      i++;
      safe = i;
      safeClose = closers();
      continue;
    }
    if (ch === "}" || ch === "]") {
      stack.pop();
      i++;
      valueDone(i);
      continue;
    }
    // A number or true / false / null.
    let j = i;
    while (j < n && !" \n\r\t,]}:".includes(text[j]!)) j++;
    if (j >= n) {
      // A number may still grow but is already a number; a half-written literal is left out.
      if (/^-?\d+(\.\d+)?$/.test(text.slice(i, j))) return tryParse(text.slice(0, j) + closers()) ?? tryParse(text.slice(0, safe) + safeClose);
      break;
    }
    i = j;
    valueDone(i);
  }
  return safe === 0 ? undefined : tryParse(text.slice(0, safe) + safeClose);
}

/**
 * JSON as far as it is valid: a stray bracket midway keeps what came before it, instead of losing it all.
 * `error` says where it broke, for feedback to the model.
 */
export function salvageJson(text: string): { value: unknown; error?: string } {
  try {
    return { value: JSON.parse(text) };
  } catch (error) {
    // V8: "at position 1768"; Firefox: "at line 1 column 1769".
    const m = /position (\d+)|line 1 column (\d+)/.exec(String(error));
    const at = m ? Number(m[1] ?? Number(m[2]) - 1) : text.length;
    const near = text.slice(Math.max(0, at - 30), at + 10);
    return { value: parsePartialJson(text.slice(0, at)), error: `invalid JSON at character ${at}, near ${JSON.stringify(near)}` };
  }
}
