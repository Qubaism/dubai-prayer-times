# UAE Prayer Times

Responsive UAE prayer-times card for browsers and Microsoft Teams.

- Public site: <https://qubaism.github.io/dubai-prayer-times/>
- Prayer schedule and weather sources: Khaleej Times pages for all seven emirates
- Refresh: GitHub Actions approximately every 30 minutes
- Live clock and prayer countdown: calculated in the browser using Asia/Dubai time
- Optional browser push notifications: visitors can independently select any of the five prayers for adhan-time alerts and end-of-prayer reminders
- Reminder timing: 15 minutes by default, adjustable from 5 to 60 minutes per browser
- Emirate selector: Abu Dhabi, Dubai, Ajman, Fujairah, Ras Al Khaimah, Sharjah and Umm Al Quwain
- Reminder progression: the selected initial reminder alerts once, then five-minute updates down to five minutes are always silent; if a user swipes the notification away, the next update may reappear silently
- Adhan notifications replace any remaining reminder and always alert as a new prayer begins

On iPhone and iPad, Apple exposes Web Push only when the site has been added to the Home Screen and opened from its Home Screen icon. The notification panel shows this setup guidance when it is opened in a normal iOS browser tab.

At phone widths, the mosque artwork uses contain-fit scaling so the full background illustration remains visible inside each prayer card instead of being cropped.

Sunrise remains visible in the schedule but is not a selectable notification. It is used only as the Fajr reminder cutoff. Other reminders are calculated before the following adhan.

The workflow refreshes every emirate independently and preserves the last successful record for an emirate whose source is temporarily unavailable. If all sources fail, it preserves the previously published page.

## Verification status

- Code complete: seven-emirate refresh, persisted manual emirate selection, emirate-aware push subscriptions, an alerting initial reminder, always-silent five-minute follow-ups and alerting adhan replacement.
- Build verified: page scripts, Worker unit tests and Worker dry-run bundle.
- Live verified by user: scheduled reminder replacement and alert/silent behavior. Manual emirate selection remains the only location choice and requires no location permission.
