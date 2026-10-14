import { isAxiosError } from "axios";
import type { ApiErrorBody } from "@/types/api";

/** Every failed API call (real or mock) rejects with this. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  /** 422 validation errors: field → messages. */
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, message: string, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code;
    this.fieldErrors = body?.errors;
  }
}

const FALLBACK: Record<number, string> = {
  0: "Can't reach the server. Check your connection and try again.",
  401: "Your session has ended. Sign in again.",
  403: "You don't have permission to do that.",
  404: "That item doesn't exist or was removed.",
  419: "Your session expired. Try again.",
  429: "Too many attempts. Wait a moment and try again.",
  500: "Something went wrong on our side. Try again in a moment.",
};

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError<ApiErrorBody>(error)) {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const message = body?.message || FALLBACK[status] || FALLBACK[status >= 500 ? 500 : 0] || error.message;
    return new ApiError(status, message, typeof body === "object" ? body : undefined);
  }
  return new ApiError(0, error instanceof Error ? error.message : FALLBACK[0]!);
}

/** Don't retry errors that won't change on a second try (auth, permission, validation, not found). */
export function shouldRetry(failureCount: number, error: unknown) {
  const status = error instanceof ApiError ? error.status : 0;
  if ([400, 401, 403, 404, 419, 422, 423, 429].includes(status)) return false;
  return failureCount < 2;
}
