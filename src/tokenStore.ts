/**
 * Stateless JWT-based prepare-token store.
 *
 * Tokens are signed JWTs — they encode their own payload and expiry, so
 * no Map, Redis, or database is needed. Any server instance that holds
 * the same JWT_SECRET can verify a token produced by any other instance.
 */

import jwt from "jsonwebtoken";

export interface PrepareTokenPayload {
  amount_usd: number;
  amount_ngn: number;
  bank_name: string;
  bank_account: string;
  timestamp: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is not set. " +
        "Add a long random string (e.g. openssl rand -hex 32) to your .env file."
    );
  }
  return secret;
}

/**
 * Sign a new prepare-token that expires in 5 minutes.
 */
export function signPrepareToken(payload: PrepareTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "5m" });
}

/**
 * Verify and decode a prepare-token.
 * Throws if the token is invalid, tampered with, or expired.
 */
export function verifyPrepareToken(token: string): PrepareTokenPayload {
  try {
    const decoded = jwt.verify(token, getSecret()) as PrepareTokenPayload & {
      iat?: number;
      exp?: number;
    };
    return {
      amount_usd: decoded.amount_usd,
      amount_ngn: decoded.amount_ngn,
      bank_name: decoded.bank_name,
      bank_account: decoded.bank_account,
      timestamp: decoded.timestamp,
    };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new Error("Preparation token has expired. Please prepare a new cashout.");
    }
    throw new Error("Invalid or tampered preparation token.");
  }
}
