import { Request, Response, NextFunction } from 'express';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class LoggingService {
  private static currentLogLevel: LogLevel = LoggingService.determineLogLevel();

  private static determineLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel === 'DEBUG') return LogLevel.DEBUG;
    if (envLevel === 'INFO') return LogLevel.INFO;
    if (envLevel === 'WARN') return LogLevel.WARN;
    if (envLevel === 'ERROR') return LogLevel.ERROR;
    
    // Default to DEBUG in development and INFO in production
    return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  static setLogLevel(level: LogLevel) {
    this.currentLogLevel = level;
  }

  static debug(message: string, ...args: any[]) {
    if (this.currentLogLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${message}`, ...args);
    }
  }

  static info(message: string, ...args: any[]) {
    if (this.currentLogLevel <= LogLevel.INFO) {
      console.log(`[INFO] [${new Date().toISOString()}] ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: any[]) {
    if (this.currentLogLevel <= LogLevel.WARN) {
      console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, ...args);
    }
  }

  static error(message: string, error?: any, ...args: any[]) {
    if (this.currentLogLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error || '', ...args);
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const logMsg = `${method} ${originalUrl} - ${statusCode} (${duration}ms)`;

    if (statusCode >= 500) {
      LoggingService.error(`[HTTP] ${logMsg}`);
    } else if (statusCode >= 400) {
      LoggingService.warn(`[HTTP] ${logMsg}`);
    } else {
      LoggingService.info(`[HTTP] ${logMsg}`);
    }
  });

  next();
}
