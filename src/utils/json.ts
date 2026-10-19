export type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function object(value: unknown): JsonObject | undefined {
  return isObject(value) ? value : undefined;
}

export function objects(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter(isObject) : [];
}

export function string(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

export function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.flatMap((item) => string(item) ?? []) : [];
}

export function boolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
