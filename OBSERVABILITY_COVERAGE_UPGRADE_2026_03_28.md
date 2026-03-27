# Observability coverage upgrade

This upgrade expands client-side and route-level observability without turning the app into noisy telemetry spam.

## Added coverage
- Page views for important routes
- Route change completion events
- Important button and link clicks
- Important form submissions
- Explicit tracking metadata on core navigation/auth/notification controls
- Better production persistence rules for important user actions and navigation flows

## Intentionally still excluded
- Every render
- Every scroll
- Every trivial click
- Extremely noisy low-value passive interactions

## Result
The app now captures important user journeys more consistently across client navigation, key UI actions, auth flows, notifications, account flows, artwork flows, upload flows, and admin entry points.
