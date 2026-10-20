# TradeOS connection investigation

Verified October 20, 2026. No TradeOS code or user records were changed or queried.

The current trading journal is [TradeOS](https://tradeos-flax.vercel.app), deployed from [jab23/TradeOS at 6688dae](https://github.com/jab23/TradeOS/tree/6688daeacd9c9a26f04393f96b6ae18499b5cfa5). The Desktop checkout is older, has uncommitted work and no remote; it must not be overwritten to implement this connection.

TradeOS stores Firebase-authenticated cloud trades with a user ID and trading account ID, account settings under the user document, and daily adjustments separately. It calculates statistics in the client and merges unsynced browser records. An external integration can report only cloud-synced records. Its existing daily-review API generates reviews and writes logs; it does not provide a scoped read-only statistics grant.

## Proposed connection

Add support in both applications, beginning from their deployed repositories:

1. Invictus starts a short-lived linking request. The user signs into TradeOS and selects an account to share.
2. TradeOS verifies the authenticated user and explicitly grants access to aggregate statistics for that account. A single-use linking code binds the two authenticated identities, with state and origin validation. Matching email addresses alone must not link identities.
3. Keep the revocable stats-only credential on the server. Invictus must verify its own user's Firebase token before using that user's grant. Do not copy TradeOS admin credentials into Invictus or expose grants in browser storage or URLs.
4. TradeOS queries explicitly by authenticated owner and selected account, excluding legacy records without verified ownership. Return aggregate values only, using the same P&L and daily-adjustment semantics as its UI.
5. Invictus displays net P&L, win rate, trade count, currency, selected account, period and refresh timestamp. Include refresh, disconnected, empty, unavailable and revoked states. Keep Invictus manual journal entries separate to prevent double counting.

Suggested first scope: one selected account, current month, refresh on entry plus manual refresh, and disconnect support. Balance and drawdown require confirming deposits, adjustments and account semantics first.

## Remaining work

The current Invictus change does not claim a live connection. TradeOS needs an aggregate endpoint, grant storage and authenticated approval UI; Invictus needs authenticated server access and a connection UI. Verify deployed Firestore rules, Firebase project identities and allowed origins before implementation. The user was asked whether to include changes to TradeOS; that scope decision remains pending.
