/**
 * Stateless JWT-based prepare-token store.
 *
 * Tokens are signed JWTs — they encode their own payload and expiry, so
 * no Map, Redis, or database is needed. Any server instance that holds
 * the same JWT_SECRET can verify a token produced by any other instance.
 */

import jwt from "jsonwebtoken";

export interface PrepareTokenPayload {
  /** Idempotency key, locked at prepare time so execute retries never double-pay. */
  reference: string;
  /** Amount to debit, in USDC (token units). The caller specifies this. */
  amount_usdc: number;
  /** Display-only NGN estimate at prepare-time rate; IvoryPay sets the real rate. */
  estimated_ngn: number;
  rate_usd_ngn: number;
  token: "USDC" | "USDT";
  account_number: string;
  bank_code: string;
  bank_name: string;
  /** Recipient name resolved via account-resolution (empty in mock mode). */
  account_name: string;
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
      reference: decoded.reference,
      amount_usdc: decoded.amount_usdc,
      estimated_ngn: decoded.estimated_ngn,
      rate_usd_ngn: decoded.rate_usd_ngn,
      token: decoded.token,
      account_number: decoded.account_number,
      bank_code: decoded.bank_code,
      bank_name: decoded.bank_name,
      account_name: decoded.account_name,
      timestamp: decoded.timestamp,
    };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new Error("Preparation token has expired. Please prepare a new cashout.");
    }
    throw new Error("Invalid or tampered preparation token.");
  }
}
