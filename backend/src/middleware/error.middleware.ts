import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
}

// Centralized error handler. Never leaks stack traces in production.
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      message: `A record with this ${err.meta?.target?.join(', ') || 'value'} already exists`,
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }
  if (err.code === 'P2003') {
    // Foreign key constraint violation — most commonly hit when deleting a
    // record (e.g. a user) that still has related rows elsewhere (payments,
    // registrations, certificates...). Deleting those related rows too would
    // destroy financial/audit history, so we surface a clear, actionable
    // message instead of the raw Postgres error and point toward the safer
    // alternative (deactivating) where relevant.
    const field = err.meta?.field_name || '';
    return res.status(409).json({
      success: false,
      message:
        'This record cannot be deleted because other records still reference it (for example, payments, ' +
        'registrations, or certificates). Deactivate it instead of deleting it if you want to preserve that history.' +
        (field ? ` (constraint: ${field})` : ''),
    });
  }

  const statusCode = err instanceof AppError ? err.statusCode : err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
