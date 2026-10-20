Local fixture preview, never referenced by the production Vite configuration.

Run from the repository root:

    npx vite --config tests/vite.config.js --port 4174

Verify the fixture double with `node tests/fixtures/verify.mjs`.

Open http://127.0.0.1:4174/ (or /workout, /meals, /trading, /coach, /auth).
Use `?empty=1` for an independent empty dataset, `?signedout=1` for authentication.
The browser tab title identifies the fixture. All data is synthetic and labelled here.

Data persists in localStorage across reloads, independently for full and empty mode.
Signed-out state persists in sessionStorage until fixture sign-in. Query modes apply on
initial page load; use a fresh URL/reload when switching mode.

Browser console controls:

    window.__fixture.reset()             // reseed current mode; reload getDocs pages
    window.__fixture.reset({empty:true}) // clear dataset; reload getDocs pages
    window.__fixture.failWrites = true   // next save/delete/batch fails
    window.__fixture.failWrites = false  // allow saves again
    window.__fixture.failChat = true     // coach/plan request fails
    window.__fixture.failReads = true    // future reads/subscriptions fail
    window.__fixture.dump()              // inspect stored records
    window.__fixture.signIn()
    window.__fixture.signOut()

The mock preserves production collection/document paths, timestamps, queries, atomic
batch notifications, and unsubscribe behavior. It is a UI test double, not a Firebase
rules, index, network-retry, transaction, or production API test.
