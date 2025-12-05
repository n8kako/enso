/**
 * Enso API Server
 *
 * Main entry point for the Fastify-based REST API.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';

import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { journalRoutes } from './routes/journal';
import { commitmentRoutes } from './routes/commitments';
import { insightsRoutes } from './routes/insights';
import { aiRoutes } from './routes/ai';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          }
        : undefined,
  },
});

async function buildServer() {
  // Register plugins
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  await server.register(cookie);

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API routes
  await server.register(authRoutes, { prefix: '/api/v1/auth' });
  await server.register(userRoutes, { prefix: '/api/v1/users' });
  await server.register(journalRoutes, { prefix: '/api/v1/journal' });
  await server.register(commitmentRoutes, { prefix: '/api/v1/commitments' });
  await server.register(insightsRoutes, { prefix: '/api/v1/insights' });
  await server.register(aiRoutes, { prefix: '/api/v1/ai' });

  // Error handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);

    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });

  return server;
}

async function start() {
  try {
    const app = await buildServer();
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.log(`🚀 Enso API server running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();

export { buildServer };
