export class AppError extends Error {
  readonly code:       string;
  readonly statusCode: number;
  readonly field:      string | undefined;

  constructor(code: string, message: string, statusCode = 400, field?: string) {
    super(message);
    this.name       = 'AppError';
    this.code       = code;
    this.statusCode = statusCode;
    this.field      = field;
  }
}

export const Errors = {
  unauthorized:   (msg = 'Authentication required') => new AppError('UNAUTHORIZED', msg, 401),
  forbidden:      (msg = 'Access denied') => new AppError('FORBIDDEN', msg, 403),
  notFound:       (resource: string) => new AppError('NOT_FOUND', `${resource} not found`, 404),
  conflict:       (msg: string) => new AppError('CONFLICT', msg, 409),
  validation:     (msg: string, field?: string) => new AppError('VALIDATION_ERROR', msg, 422, field),
  internal:       (msg = 'An unexpected error occurred') => new AppError('INTERNAL_ERROR', msg, 500),
  badRequest:     (msg: string, field?: string) => new AppError('BAD_REQUEST', msg, 400, field),
};
