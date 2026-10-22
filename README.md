# Dubai Prayer Times

Responsive Dubai prayer-times card for browsers and Microsoft Teams.

- Public site: <https://qubaism.github.io/dubai-prayer-times/>
- Prayer schedule source: Khaleej Times Dubai prayer times
- Weather source: Khaleej Times Dubai weather page
- Refresh: GitHub Actions approximately every 30 minutes
- Live clock and prayer countdown: calculated in the browser using Asia/Dubai time

The workflow keeps the last successful page if either source cannot be read, preventing a temporary source outage from replacing the working site with an error page.
