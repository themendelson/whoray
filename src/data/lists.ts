export const words = (text: string): string[] => text.trim().split(/\s+/);

export const phrases = (text: string): string[] => text.trim().split(/\s*,\s*/);
