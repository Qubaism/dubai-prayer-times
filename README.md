# Dubai Prayer Times

Responsive Dubai prayer-times card for browsers and Microsoft Teams.

- Public site: <https://qubaism.github.io/dubai-prayer-times/>
- Prayer schedule source: Khaleej Times Dubai prayer times
- Weather source: Khaleej Times Dubai weather page
- Refresh: GitHub Actions approximately every 30 minutes
- Live clock and prayer countdown: calculated in the browser using Asia/Dubai time
- Optional browser push notifications: visitors can independently select any of the five prayers for adhan-time alerts and end-of-prayer reminders
- Reminder timing: 15 minutes by default, adjustable from 5 to 60 minutes per browser

On iPhone and iPad, Apple exposes Web Push only when the site has been added to the Home Screen and opened from its Home Screen icon. The notification panel shows this setup guidance when it is opened in a normal iOS browser tab.

Sunrise remains visible in the schedule but is not a selectable notification. It is used only as the Fajr reminder cutoff. Other reminders are calculated before the following adhan.

The workflow keeps the last successful page if either source cannot be read, preventing a temporary source outage from replacing the working site with an error page.
