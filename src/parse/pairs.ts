export interface Pair {
  key: string;
  value: string;
}

const COMMENT = /^(%|#|;|>>>)/;
const BRACKET = /^(?:[a-z]\.\s*)?\[([^\]]+)\]\s*(.*)$/i;
const KEY_VALUE = /^([\p{L}][\p{L} .\-_/()'&]{0,60}?)[\s.]*:(?!\/\/)\s*(.*)$/u;
const IMPLICIT_HEADER = /^[\p{L}][\p{L} /&()-]{0,40}$/u;
const CONTACT_SECTION = /registrant|admin|tech|billing|contact|holder|owner|manager|on-site/;

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s.]+$/, "");
}

class Reader {
  readonly found: Pair[] = [];
  private section: string | undefined;
  private explicit = false;
  private filled = false;
  private lastKey: string | undefined;

  blank(): void {
    if (this.filled || this.section === undefined) this.section = this.lastKey = undefined;
  }

  header(key: string, explicit: boolean): void {
    this.section = key;
    this.explicit = explicit;
    this.filled = false;
    this.lastKey = undefined;
  }

  pair(key: string, value: string): void {
    if (this.section === undefined || !CONTACT_SECTION.test(this.section)) this.found.push({ key, value });
    if (this.section !== undefined && this.section !== key) this.found.push({ key: `${this.section} ${key}`, value });
    this.filled = true;
    this.lastKey = key;
  }

  bare(line: string, indented: boolean): void {
    if (indented && this.lastKey !== undefined) {
      this.pair(this.lastKey, line);
    } else if (this.section !== undefined && (indented || this.explicit)) {
      this.found.push({ key: this.section, value: line });
      this.filled = true;
    } else if (!indented && IMPLICIT_HEADER.test(line) && line.split(" ").length <= 5) {
      this.header(normalizeKey(line), false);
    }
  }
}

export function pairs(text: string): Pair[] {
  const reader = new Reader();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^\*+\s*/, "");
    if (line === "") reader.blank();
    if (line === "" || COMMENT.test(line)) continue;
    const match = BRACKET.exec(line) ?? KEY_VALUE.exec(line);
    const key = match?.[1] === undefined ? undefined : normalizeKey(match[1]);
    const value = match?.[2]?.trim() ?? "";
    if (key === undefined) reader.bare(line, /^\s/.test(raw));
    else if (value === "") reader.header(key, true);
    else reader.pair(key, value);
  }
  return reader.found;
}
