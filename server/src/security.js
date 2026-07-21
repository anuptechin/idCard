import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { DEV_ORIGINS, IS_PROD } from './config.js';

/**
 * Content-Security-Policy tuned for this app:
 * - fonts & logos are embedded as data: URIs in the bundle
 * - uploaded photos are served same-origin as blob/data or /api/uploads
 * - no third-party scripts, no inline eval
 */
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Vite/React inject a few inline styles
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", ...(IS_PROD ? [] : DEV_ORIGINS)],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  });
}

export function corsPolicy() {
  return cors({
    origin: IS_PROD ? false : DEV_ORIGINS, // in prod client is same-origin; in dev allow Vite
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: false,
    maxAge: 600,
  });
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached, please try again later.' },
});
