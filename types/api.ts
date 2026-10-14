// Shapes shared by every Laravel endpoint.

/** A single Laravel JsonResource: `{ data: T }`. */
export interface ApiResource<T> {
  data: T;
}

/** Laravel's paginator `meta` block (snake_case, as the framework sends it). */
export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

/** A paginated Laravel resource collection. `TMeta` adds endpoint-specific meta fields. */
export interface PaginatedResource<T, TMeta = unknown> {
  data: T[];
  meta: PaginationMeta & TMeta;
}

/** Body of an error response (422 validation, 403, 419, 429 …). `code` is our own machine-readable reason. */
export interface ApiErrorBody {
  message?: string;
  code?: string;
  /** 422 only: field → messages. */
  errors?: Record<string, string[]>;
}
