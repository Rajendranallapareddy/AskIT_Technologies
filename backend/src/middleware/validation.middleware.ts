import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export function validate(req: Request, res: Response, next: NextFunction) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const errors = result.array().map((error: any) => ({
      field: error.path || error.param || 'unknown',
      message: error.msg || 'Invalid value',
    }));

    // Show the real validation problem instead of only "Validation failed".
    const message = errors.map((error) => error.message).join('. ');

    return res.status(422).json({
      success: false,
      message: message || 'Please check the entered details and try again.',
      errors,
    });
  }

  next();
}