import { Request, Response, NextFunction } from 'express';
import { LoggingService } from './LoggingService';

export class AppError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
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
  const message = err.message || 'Internal Server Error';
  
  LoggingService.error(`API Error on ${req.method} ${req.originalUrl}: ${message}`, err);
  
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    error: message,
  });
}
