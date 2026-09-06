# IvoryPay API — Verified Notes (Phase 0)

> Source: public docs at https://ivorypay.gitbook.io/ivorypay-api-documentation (extracted 2026-08-28).
> ⚠️ These shapes come from the public GitBook, not a live sandbox call. **Confirm every field against a real `IVORYPAY_ENV=test` response before shipping** — note the `currency` vs `fiatCurrency` naming inconsistency below as a known gotcha.

Base URL: `https://api.ivorypay.io/api/v1`
Auth: `Authorization: <secret-key>` (raw key, no `Bearer` prefix) — matches current `ivoryPayClient.headers()`.

---

## 🔴 Critical finding: the current code uses the wrong endpoint

IvoryPay has two distinct namespaces:

| Namespace | Purpose | Direction |
| :--- | :--- | :--- |
| `POST /transactions` | **Accept Payment** — "create a payment collection request" | Money comes **IN** (charge/deposit) |
| `POST /fiat-transfer` | **Fiat Transfer** — "initiate a fiat bank transfer" | Money goes **OUT** (payout/disbursement) |

GramPay's "cashout" today (`ivoryPayClient.createTransaction` → `POST /transactions`) calls the **collection** endpoint. So the live `cashout_to_ngn` / `create_transaction` path **creates a charge, not a payout** — it does not send money to anyone's bank account. The real payout endpoint (`/fiat-transfer`) is currently only used for `/simulate` and `/banks`, never to actually disburse.

**→ Phase 1a is not "wire in the account number"; it is "rebuild the payout on `POST /fiat-transfer`."**

---

## Payout — `POST /v1/fiat-transfer`

Request body (all required):

| Field | Type | Notes |
| :--- | :--- | :--- |
| `amount` | number | Amount in the **token** (not fiat). Positive. |
| `token` | string | Crypto to debit — `USDC` / `USDT` |
| `fiatCurrency` | string | Target fiat for recipient, e.g. `NGN` |
| `payoutMethod` | string | `BANK_TRANSFER` or `MOBILE_MONEY` |
| `accountNumber` | string | Recipient bank account number |
| `bankCode` | string | Must be > 3 chars |
| `reference` | string | Unique per transfer — **"Used for idempotency"** |

- **No** `recipientName`, **no** `narration`, **no** `baseFiat` field (all present in GramPay's current schema — they are not sent to this endpoint).
- **Idempotency**: the `reference` body field IS the idempotency key. No dedicated header. → generate `reference` server-side, store it, never trust the LLM's.
- Response returns `id` + `status`. Lifecycle: `PENDING → PROCESSING → SUCCESS ↘ FAILED`.

## Bank list — `GET /v1/fiat-transfer/banks`
Returns bank objects: `{ id, name, code, country, currency }`. (Already wired as `listBanks()`.) → prefer this over the hardcoded local `BANK_DIRECTORY`.

## Account name resolution — `POST /v1/fiat-transfer/account-resolution`
Body (all required): `accountNumber` (string), `bankCode` (string, min 3), `currency` (string).
Returns: `{ accountName, accountNumber, bankCode }`.
→ **Safety win**: verify the destination name before paying out. Not currently used at all.
⚠️ Gotcha: this endpoint names the fiat field `currency`, but `/fiat-transfer` names it `fiatCurrency`.

## Status / cancel
- **No** documented status-lookup or cancel endpoint in the fiat-transfer docs.
- Status is delivered via **webhooks** (`payout request declined` carries `reasonForDecline`). → Phase 3 webhook endpoint is the right way to track settlement; the current synchronous `verify` may not apply to payouts (it hits `/business/transactions/{ref}/verify`, which is the collection namespace — needs verification).

---

## Impact summary on the codebase
1. `createTransaction()` (collection) is the wrong primitive for cashout → add `createFiatTransfer()` for `POST /fiat-transfer`.
2. Add `resolveAccount()` for `POST /fiat-transfer/account-resolution`; call it before every payout.
3. Payout requires `token` + `fiatCurrency` + `payoutMethod` + `accountNumber` + `bankCode` + `reference`; the current body sends `amount, email, firstName, lastName, baseFiat, reference` — nearly all wrong for a payout.
4. `reference` = idempotency key → server-generated + persisted (Phase 1b).
5. `verify_transaction` uses the collection namespace — verify whether payouts are queryable there or only via webhook.
