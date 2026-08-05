import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createRemoteJWKSet, jwtVerify } from 'jose'

let _jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  const JWKS_URL = process.env.NEON_AUTH_JWKS_URL;
  if (!JWKS_URL) {
    throw new Error("Variable d'environnement manquante : NEON_AUTH_JWKS_URL.");
  }
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return _jwks;
}

export const requireNeonAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest();

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header provided');
    }
    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Only Bearer tokens are supported');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token || token.split('.').length !== 3) {
      throw new Error('Unauthorized: Invalid token');
    }

    const { payload } = await jwtVerify(token, getJwks()).catch(() => {
      throw new Error('Unauthorized: Invalid token');
    });

    if (!payload.sub) {
      throw new Error('Unauthorized: No user ID found in token');
    }

    return next({
      context: {
        userId: payload.sub,
        claims: payload,
      },
    });
  },
);
