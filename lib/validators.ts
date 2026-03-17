export function toTrimmedString(value: unknown): string {
  return String(value ?? '').trim();
}

export function toLowerTrimmedString(value: unknown): string {
  return toTrimmedString(value).toLowerCase();
}

export function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function toSafeInt(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isSafeInteger(parsed) ? parsed : NaN;
}

export function normalizePhoneNumber(value: unknown): string {
  return toTrimmedString(value).replace(/[^\d+\-()\s]/g, '');
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function isValidUrl(value: string): boolean {
  if (!value) return false;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export function isSafeRelativeUrl(value: string): boolean {
  return /^\/(?!\/)/.test(value);
}

export function isValidPublicUrl(value: string): boolean {
  return isValidUrl(value) || isSafeRelativeUrl(value);
}

export function validateRequiredText(value: string, min: number, max: number, fieldLabel: string): string | null {
  if (value.length < min || value.length > max) {
    return `${fieldLabel} must be between ${min} and ${max} characters.`;
  }

  return null;
}

export function validateOptionalText(value: string, max: number, fieldLabel: string): string | null {
  if (value && value.length > max) {
    return `${fieldLabel} must be ${max} characters or fewer.`;
  }

  return null;
}

export function validateOptionalUrl(value: string, fieldLabel: string): string | null {
  if (value && !isValidPublicUrl(value)) {
    return `${fieldLabel} must be a valid URL.`;
  }

  return null;
}

export function validateArtworkInput(input: {
  title: string;
  description: string;
  category?: string;
  imageUrl?: string;
  price: number;
}) {
  const errors: string[] = [];

  const titleError = validateRequiredText(input.title, 3, 120, 'Artwork title');
  if (titleError) errors.push(titleError);

  const descriptionError = validateRequiredText(input.description, 20, 5000, 'Artwork description');
  if (descriptionError) errors.push(descriptionError);

  const categoryError = validateOptionalText(input.category || '', 60, 'Artwork category');
  if (categoryError) errors.push(categoryError);

  if (!Number.isFinite(input.price) || input.price <= 0) {
    errors.push('Artwork price must be greater than zero.');
  }

  if (input.imageUrl && !isValidPublicUrl(input.imageUrl)) {
    errors.push('Artwork image URL must be a valid URL or local path.');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

export function validateUsername(username: string) {
  return /^[a-zA-Z0-9_\-.]{3,30}$/.test(username);
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
