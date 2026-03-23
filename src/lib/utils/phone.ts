export function normalizePhoneNumber(value: string) {
  const digits = value.replace(/[^\d+]/g, "");

  if (digits.startsWith("+") && digits.length >= 11) {
    return digits;
  }

  const numeric = digits.replace(/\D/g, "");

  if (numeric.length === 10) {
    return `+1${numeric}`;
  }

  if (numeric.length === 11 && numeric.startsWith("1")) {
    return `+${numeric}`;
  }

  throw new Error("Phone number must be a valid E.164-compatible value");
}
