import { Request, Response, NextFunction } from 'express';
import { LoggingService } from './LoggingService.js';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Handle entity.too.large from express body-parser
  if (err.type === 'entity.too.large' || err.status === 413) {
    LoggingService.warn(`Payload too large error on ${req.method} ${req.originalUrl}`);
    return res.status(413).json({
      status: 'error',
      statusCode: 413,
      error: 'Payload Too Large: The uploaded file exceeds the 50MB request body size limit.',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  
  // Clean message for production 500s to avoid leaking backend details
  let publicMessage = err.message || 'An internal server error occurred.';
  if (statusCode >= 500 && isProd && !err.isOperational) {
    publicMessage = 'An unexpected server error occurred. Please try again later.';
  }

  LoggingService.error(`API Error on ${req.method} ${req.originalUrl} (${statusCode}): ${err.message}`, {
    stack: err.stack,
    isOperational: err.isOperational
  });

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    error: publicMessage,
  });
}
