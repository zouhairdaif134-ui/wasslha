/**
 * WASSLHA
 * Backend Request Validation Foundation
 *
 * Server-side validation helpers for API requests.
 * Backend validation is authoritative.
 *
 * Berrechid MVP.
 */

export interface ValidationResult<T> {
  valid: boolean;
  data: T | null;
  errors: string[];
}

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "object";
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export function validateObject<T extends Record<string, unknown>>(
  input: unknown,
  rules: ValidationRule<T>[],
): ValidationResult<T> {
  const errors: string[] = [];

  if (
    input === null ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    return {
      valid: false,
      data: null,
      errors: ["Request body must be a JSON object"],
    };
  }

  const object = input as Record<string, unknown>;

  for (const rule of rules) {
    const fieldName = String(rule.field);
    const value = object[fieldName];

    if (
      value === undefined ||
      value === null
    ) {
      if (rule.required) {
        errors.push(
          `${fieldName} is required`,
        );
      }

      continue;
    }

    if (
      rule.type &&
      typeof value !== rule.type
    ) {
      errors.push(
        `${fieldName} must be a ${rule.type}`,
      );

      continue;
    }

    if (
      rule.type === "string" &&
      typeof value === "string"
    ) {
      if (
        rule.minLength !== undefined &&
        value.length < rule.minLength
      ) {
        errors.push(
          `${fieldName} must be at least ${rule.minLength} characters`,
        );
      }

      if (
        rule.maxLength !== undefined &&
        value.length > rule.maxLength
      ) {
        errors.push(
          `${fieldName} must not exceed ${rule.maxLength} characters`,
        );
      }
    }

    if (
      rule.type === "number" &&
      typeof value === "number"
    ) {
      if (
        !Number.isFinite(value)
      ) {
        errors.push(
          `${fieldName} must be a finite number`,
        );
      }

      if (
        rule.min !== undefined &&
        value < rule.min
      ) {
        errors.push(
          `${fieldName} must be greater than or equal to ${rule.min}`,
        );
      }

      if (
        rule.max !== undefined &&
        value > rule.max
      ) {
        errors.push(
          `${fieldName} must be less than or equal to ${rule.max}`,
        );
      }
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      data: null,
      errors,
    };
  }

  return {
    valid: true,
    data: object as T,
    errors: [],
  };
}

export function validateUuid(
  value: unknown,
): boolean {
  if (typeof value !== "string") {
    return false;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function validateEmail(
  value: unknown,
): boolean {
  if (typeof value !== "string") {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value,
  );
}

export function validateNonEmptyString(
  value: unknown,
): boolean {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

export function validatePositiveInteger(
  value: unknown,
): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

export function validateNonNegativeInteger(
  value: unknown,
): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
  );
}

export function validatePagination(
  page: unknown,
  limit: unknown,
): ValidationResult<{
  page: number;
  limit: number;
}> {
  const errors: string[] = [];

  const parsedPage =
    page === undefined
      ? 1
      : Number(page);

  const parsedLimit =
    limit === undefined
      ? 20
      : Number(limit);

  if (
    !Number.isInteger(parsedPage) ||
    parsedPage < 1
  ) {
    errors.push(
      "page must be a positive integer",
    );
  }

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > 100
  ) {
    errors.push(
      "limit must be an integer between 1 and 100",
    );
  }

  if (errors.length > 0) {
    return {
      valid: false,
      data: null,
      errors,
    };
  }

  return {
    valid: true,
    data: {
      page: parsedPage,
      limit: parsedLimit,
    },
    errors: [],
  };
}
