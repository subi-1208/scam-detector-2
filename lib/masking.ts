export function maskSensitiveText(input: string): string {
  return input
    .replace(/([A-Z0-9._%+-])[A-Z0-9._%+-]*@([A-Z0-9.-]+\.[A-Z]{2,})/gi, "$1***@$2")
    .replace(/\b(\+?\d{2,3})?[-\s]?\d{2,4}[-\s]?\d{3,4}[-\s]?\d{4}\b/g, (value) => {
      const digits = value.replace(/\D/g, "");

      if (digits.length < 8) {
        return value;
      }

      return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
    })
    .replace(/\b[A-Z]{1,2}\d{6,8}\b/g, (value) => `${value.slice(0, 2)}***`)
    .replace(/\b\d{9,18}\b/g, (value) => `${value.slice(0, 3)}***${value.slice(-2)}`);
}

export function toPreview(input: string, maxLength = 180): string {
  const normalized = maskSensitiveText(input).replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}
