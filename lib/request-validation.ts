import { NextResponse } from 'next/server';

export type FieldErrors = Record<string, string>;

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; response: NextResponse };
export type ParseResult<T> = Ok<T> | Err;

export function validationError(message: string, fieldErrors?: FieldErrors, status = 400) {
  return NextResponse.json(
    fieldErrors ? { error: message, fieldErrors } : { error: message },
    { status },
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readJsonObject(request: Request): Promise<ParseResult<Record<string, unknown>>> {
  try {
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) {
      return { ok: false, response: validationError('Request body must be a JSON object.') };
    }
    return { ok: true, data: body };
  } catch {
    return { ok: false, response: validationError('Invalid JSON body.') };
  }
}

export function getStringField(
  source: Record<string, unknown>,
  key: string,
  options: { required?: boolean; maxLength?: number; trim?: boolean; allowEmpty?: boolean } = {},
): ParseResult<string> {
  const { required = false, maxLength, trim = true, allowEmpty = false } = options;
  const raw = source[key];

  if (raw == null) {
    return required
      ? { ok: false, response: validationError(`"${key}" is required.`, { [key]: 'Required' }) }
      : { ok: true, data: '' };
  }

  if (typeof raw !== 'string') {
    return { ok: false, response: validationError(`"${key}" must be a string.`, { [key]: 'Must be a string' }) };
  }

  const value = trim ? raw.trim() : raw;
  if (!allowEmpty && required && !value) {
    return { ok: false, response: validationError(`"${key}" is required.`, { [key]: 'Required' }) };
  }

  if (maxLength && value.length > maxLength) {
    return {
      ok: false,
      response: validationError(`"${key}" exceeds the maximum length of ${maxLength}.`, {
        [key]: `Must be at most ${maxLength} characters`,
      }),
    };
  }

  return { ok: true, data: value };
}

export function getOptionalBooleanField(source: Record<string, unknown>, key: string, defaultValue = false): boolean {
  const raw = source[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'on';
  }
  if (typeof raw === 'number') return raw !== 0;
  return defaultValue;
}

export function getNumberField(
  source: Record<string, unknown>,
  key: string,
  options: { required?: boolean; integer?: boolean; min?: number } = {},
): ParseResult<number> {
  const { required = false, integer = true, min } = options;
  const raw = source[key];

  if (raw == null || raw === '') {
    return required
      ? { ok: false, response: validationError(`"${key}" is required.`, { [key]: 'Required' }) }
      : { ok: true, data: 0 };
  }

  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    return { ok: false, response: validationError(`"${key}" must be a valid number.`, { [key]: 'Invalid number' }) };
  }
  if (integer && !Number.isInteger(value)) {
    return { ok: false, response: validationError(`"${key}" must be an integer.`, { [key]: 'Must be an integer' }) };
  }
  if (typeof min === 'number' && value < min) {
    return { ok: false, response: validationError(`"${key}" must be at least ${min}.`, { [key]: `Must be at least ${min}` }) };
  }
  return { ok: true, data: value };
}

export function getEnumField<T extends string>(
  source: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  options: { required?: boolean; normalize?: 'upper' | 'lower' | 'none'; defaultValue?: T } = {},
): ParseResult<T> {
  const { required = false, normalize = 'none', defaultValue } = options;
  const raw = source[key];

  if ((raw == null || raw === '') && defaultValue) {
    return { ok: true, data: defaultValue };
  }
  if (raw == null || raw === '') {
    return required
      ? { ok: false, response: validationError(`"${key}" is required.`, { [key]: 'Required' }) }
      : { ok: true, data: '' as T };
  }
  if (typeof raw !== 'string') {
    return { ok: false, response: validationError(`"${key}" must be a string.`, { [key]: 'Must be a string' }) };
  }

  const normalized =
    normalize === 'upper' ? raw.trim().toUpperCase() : normalize === 'lower' ? raw.trim().toLowerCase() : raw.trim();

  if (!allowed.includes(normalized as T)) {
    return {
      ok: false,
      response: validationError(`"${key}" has an invalid value.`, {
        [key]: `Must be one of: ${allowed.join(', ')}`,
      }),
    };
  }

  return { ok: true, data: normalized as T };
}

export function formDataToRecord(formData: FormData): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key in record) {
      const current = record[key];
      record[key] = Array.isArray(current) ? [...current, value] : [current, value];
    } else {
      record[key] = value;
    }
  }
  return record;
}

export function readOptionalStringFromFormData(
  formData: FormData,
  key: string,
  options: { maxLength?: number; trim?: boolean } = {},
): ParseResult<string> {
  return getStringField(formDataToRecord(formData), key, { required: false, allowEmpty: true, ...options });
}

export function readRequiredStringFromFormData(
  formData: FormData,
  key: string,
  options: { maxLength?: number; trim?: boolean } = {},
): ParseResult<string> {
  return getStringField(formDataToRecord(formData), key, { required: true, ...options });
}

export function readNumberFromFormData(
  formData: FormData,
  key: string,
  options: { required?: boolean; integer?: boolean; min?: number } = {},
): ParseResult<number> {
  return getNumberField(formDataToRecord(formData), key, options);
}

export function readEnumFromFormData<T extends string>(
  formData: FormData,
  key: string,
  allowed: readonly T[],
  options: { required?: boolean; normalize?: 'upper' | 'lower' | 'none'; defaultValue?: T } = {},
): ParseResult<T> {
  return getEnumField(formDataToRecord(formData), key, allowed, options);
}

export function readCheckboxFromFormData(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true' || formData.get(key) === '1';
}
