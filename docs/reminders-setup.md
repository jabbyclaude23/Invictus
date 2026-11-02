# Planning, routines and Ajax prayer reminders

The Plan page contains a day scheduler, goal projects, repeating routines, and a prayer timetable for Ajax, Ontario. All schedule times use America/Toronto, including daylight saving changes. ISNA/North America and Hanafi Asr are the defaults. Prayer calculations run locally with the MIT-licensed Adhan library, with selectable methods, per-prayer offsets, individual mutes and optional protected prayer periods. They are prayer starts, not a mosque's azaan or iqamah timetable.

## What works without notification server access

- Preview and accept a schedule around fixed commitments, routines and prayers. Choose another date to plan ahead. Completed tasks are excluded from replanning. Overloaded work remains open and is explicitly listed.
- Set estimated durations, deadlines and priorities; split work across free blocks when allowed.
- Draft goal milestones with Coach, edit them, and accept linked tasks. Add manual steps as well.
- Create repeating routines and tick their checklists. Quiet hours apply to routine/focus reminders; enabled prayer reminders bypass those quiet hours.
- View prayer times offline once the app has loaded. Play the bundled azaan after tapping Play, and export a dated 30-day prayer calendar. Imported calendar alarms depend on the receiving calendar app and do not update themselves.
- Show due reminders while the app is open and visible, including a five-minute snooze.

## Background push delivery setup

Server code is implemented, but background delivery is intentionally shown as inactive until the required configuration exists. Do not describe it as enabled merely because the notification permission was granted.

1. In the existing Firebase project invictus-8f5ad, obtain a server service-account credential through Firebase/Google Cloud administration. Add the JSON directly to Vercel as the encrypted production variable FIREBASE_SERVICE_ACCOUNT_JSON. Never commit it or paste it in chat.
2. VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and CRON_SECRET were generated and configured as encrypted production variables during this implementation. Keep the private key and secret server-only; the public key is returned by the status endpoint. Do not rotate the pair without resubscribing devices.
3. Configure a scheduler to GET https://invictus-app.vercel.app/api/reminders?action=dispatch every minute, sending Authorization: Bearer <CRON_SECRET>. Vercel Pro supports per-minute cron. Vercel Hobby's daily/hourly precision is unsuitable for prayer reminders. An existing external scheduler may invoke the same endpoint instead. No plan upgrade or paid scheduler is provisioned automatically.
4. For Vercel Pro, merge the following into vercel.json, redeploy, and confirm the scheduled function runs:

    "crons": [{ "path": "/api/reminders?action=dispatch", "schedule": "* * * * *" }]

5. After verifying the scheduler, set REMINDERS_SCHEDULER_ENABLED=true in Vercel production and redeploy.
6. In Plan → Prayer, enable prayer reminders and save. In Reminder delivery, enable push alerts on the intended device and send a test alert. On iPhone, first add the app to the Home Screen and enable notification permission from a direct button tap.

If the credential, VAPID pair or scheduler flag is absent, the UI says background alerts are not active and does not accept new subscriptions.

## Delivery and security boundaries

The server verifies Firebase ID tokens before registering or deleting the signed-in user's subscriptions. Push endpoint validation restricts delivery to known browser push providers, and dispatch requires CRON_SECRET. Device subscriptions and delivery records live under the user, within the existing user-scoped Firestore model. The server service account must not be exposed to the client. Use minimal Google Cloud permissions appropriate to Firestore and Firebase Auth verification.

Each event/device/time combination has a transaction claim to suppress repeat dispatches. Failed sends release their claim for a later scheduler attempt; expired device endpoints are removed. A five-minute catch-up window avoids replaying old reminders. Delivery remains best effort: device connectivity, OS settings, Focus modes, scheduler delays and push-provider availability affect arrival. A network response lost after a successful send can produce a duplicate during retry.

The current dispatcher handles up to 500 subscriptions per run, suitable for this personal app; increase with pagination/queueing before broader use. Delivery records include expiresAt; configure a Firestore TTL policy for that field if long-term retention cleanup is needed.

An iPhone PWA cannot force a full azaan recording to play automatically while locked. A prayer push opens the prayer screen, where the user taps Play. The OS controls the notification sound. The bundled audio is credited and licensed in audio-license.md and on screen.

## Verification

Run npm test, npm run test:fixtures, npm run lint and npm run build. Tests cover daylight saving and date boundaries, five-prayer output, Hanafi Asr, offsets, calendar alarms, scheduling conflicts/overflow, routine recurrence, quiet hours, completed-work suppression, push endpoint validation, repeated dispatch suppression, failed writes and server-rendered UI states.

Browser access is disabled in this session's Work settings. Actual mobile/desktop appearance, permission prompts and locked-device delivery still require browser/device verification. No live prayer or test push was sent from this development session.

References: [Adhan JS](https://github.com/batoulapps/adhan-js), [Apple web push](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Firebase Admin setup](https://firebase.google.com/docs/admin/setup).
