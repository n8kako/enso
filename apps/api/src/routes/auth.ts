/**
 * Authentication Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../services/database';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
  timezone: z.string().optional().default('UTC'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function authRoutes(server: FastifyInstance) {
  /**
   * POST /auth/register - Create a new user account
   */
  server.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'An account with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Create user with preferences and Maslow profile
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        displayName: body.displayName,
        timezone: body.timezone,
        preferences: {
          create: {
            focusAreas: [],
          },
        },
        maslowProfile: {
          create: {},
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        timezone: true,
        subscription: true,
        onboardingCompleted: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = server.jwt.sign(
      { userId: user.id },
      { expiresIn: '15m' }
    );

    const refreshToken = server.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    // Store session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set cookie
    reply.setCookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    return {
      user,
      accessToken,
      refreshToken,
    };
  });

  /**
   * POST /auth/login - Authenticate user
   */
  server.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(body.password, user.passwordHash);

    if (!isValid) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const accessToken = server.jwt.sign(
      { userId: user.id },
      { expiresIn: '15m' }
    );

    const refreshToken = server.jwt.sign(
      { userId: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    // Store session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set cookie
    reply.setCookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        timezone: user.timezone,
        subscription: user.subscription,
        onboardingCompleted: user.onboardingCompleted,
      },
      accessToken,
      refreshToken,
    };
  });

  /**
   * POST /auth/refresh - Refresh access token
   */
  server.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = refreshSchema.parse(request.body);

    // Verify refresh token
    let payload: { userId: string; type: string };
    try {
      payload = server.jwt.verify(body.refreshToken) as any;
    } catch {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid refresh token',
      });
    }

    if (payload.type !== 'refresh') {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token type',
      });
    }

    // Check session exists
    const session = await prisma.session.findFirst({
      where: {
        userId: payload.userId,
        token: body.refreshToken,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Session expired or invalid',
      });
    }

    // Generate new access token
    const accessToken = server.jwt.sign(
      { userId: payload.userId },
      { expiresIn: '15m' }
    );

    // Set cookie
    reply.setCookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60,
    });

    return { accessToken };
  });

  /**
   * POST /auth/logout - End user session
   */
  server.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = server.jwt.verify(token) as { userId: string };

        // Delete all sessions for user
        await prisma.session.deleteMany({
          where: { userId: payload.userId },
        });
      } catch {
        // Token invalid, continue with logout anyway
      }
    }

    // Clear cookie
    reply.clearCookie('token');

    return { success: true };
  });

  /**
   * GET /auth/me - Get current user
   */
  server.get('/me', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        timezone: true,
        subscription: true,
        onboardingCompleted: true,
        createdAt: true,
        preferences: true,
        maslowProfile: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return { user };
  });
}

/**
 * Authentication middleware
 */
async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies.token) {
      token = request.cookies.token;
    }

    if (!token) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    const payload = await (request as any).jwtVerify();
    (request as any).userId = payload.userId;
  } catch {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

export { authenticate };
