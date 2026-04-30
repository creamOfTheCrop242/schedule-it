function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[auth] JWT_SECRET not set; using dev fallback. Set JWT_SECRET in .env for production.',
    );
    return 'dev-secret-do-not-use-in-production';
  }
  throw new Error('JWT_SECRET environment variable is required in production');
}

/** Access token lifetime in seconds (JWT `exp` and cookie `maxAge` stay aligned). */
export const JWT_ACCESS_TOKEN_TTL_SECONDS = Math.floor(
  100 * 365.25 * 24 * 60 * 60,
);

export const jwtConstants = {
  get secret() {
    return getJwtSecret();
  },
};
