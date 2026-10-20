# Payments

The storefront never sees card numbers. GCash, Maya and card payments go
through a provider-hosted checkout; bank transfer and cash on delivery are
handled in-house.

| Method        | Flow |
|---------------|------|
| GCash / Maya / Card | Order created → stock reserved → customer redirected to the provider's hosted checkout → provider calls `/api/webhooks/payments/<provider>` → signature verified, event de-duplicated (`WebhookEvent`), payment matched by idempotency key → order `PAID`, reservation converted to a sale. |
| Bank transfer | Order created (`PENDING_PAYMENT`) → customer sees bank details and submits their reference → `PAYMENT_UNDER_REVIEW` → owner verifies the deposit in Admin › Orders → `PAID`. |
| Cash on delivery | Only when enabled in Admin › Settings. Order created → owner confirms (`PROCESSING`) → payment recorded when delivered. |

An order is never shown as paid until a verified webhook or an owner verification says so.

## Choosing a provider (owner decision)

`PAYMENT_PROVIDER=stub` is a development simulator and is refused in production.
Before launch the owner needs to pick a Philippine provider after confirming
merchant eligibility, fees and API access — e.g. **PayMongo** or **Xendit** —
then finish the matching adapter (`paymongo.ts` / `xendit.ts`, each documents
what is left) and set `PAYMENT_PROVIDER` plus its keys.

Refunds are recorded in Admin › Orders; until the provider adapter is
finished, the money itself must be returned from the provider dashboard.
