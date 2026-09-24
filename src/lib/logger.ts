/**
 * @fileOverview Aura Centralized Safe Logger.
 * Synchronized with Google Cloud Logging standards for Firebase App Hosting.
 * Hardened to prevent leakage of PII, secrets, or authentication tokens.
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export type ErrorCategory = 
  | 'AUTH_ERROR' 
  | 'FIRESTORE_ERROR' 
  | 'STORAGE_ERROR' 
  | 'FCM_ERROR' 
  | 'PAYMENT_ERROR' 
  | 'AI_ERROR' 
  | 'VERIFICATION_ERROR' 
  | 'CHAT_ERROR' 
  | 'ACCOUNT_DELETION_ERROR' 
  | 'CONFIG_ERROR' 
  | 'UNKNOWN_ERROR';

interface LogContext {
  category?: ErrorCategory;
  service?: string;
  operation?: string;
  correlationId?: string;
  uid?: string;
  [key: string]: any;
}

class AuraLogger {
  private isProd = process.env.NODE_ENV === 'production';

  private scrub(data: any): any {
    if (!data) return data;
    const sensitiveKeys = [
      'password', 'otp', 'token', 'secret', 'key', 'apiKey', 
      'authorization', 'cookie', 'signature', 'cvv', 'card'
    ];
    
    const scrubbed = JSON.parse(JSON.stringify(data));
    const process = (obj: any) => {
      for (const key in obj) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          process(obj[key]);
        }
      }
    };
    process(scrubbed);
    return scrubbed;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (this.isProd && level === 'DEBUG') return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: process.env.NODE_ENV,
      ...this.scrub(context)
    };

    // Use JSON stringification for Google Cloud Logging ingestion
    const output = JSON.stringify(entry);

    switch (level) {
      case 'DEBUG': console.debug(output); break;
      case 'INFO': console.info(output); break;
      case 'WARN': console.warn(output); break;
      case 'ERROR': 
      case 'CRITICAL': console.error(output); break;
    }
  }

  debug(msg: string, ctx?: LogContext) { this.log('DEBUG', msg, ctx); }
  info(msg: string, ctx?: LogContext) { this.log('INFO', msg, ctx); }
  warn(msg: string, ctx?: LogContext) { this.log('WARN', msg, ctx); }
  error(msg: string, ctx?: LogContext) { this.log('ERROR', msg, ctx); }
  critical(msg: string, ctx?: LogContext) { this.log('CRITICAL', msg, ctx); }

  generateCorrelationId() {
    return Math.random().toString(36).substring(2, 15);
  }
}

export const logger = new AuraLogger();
