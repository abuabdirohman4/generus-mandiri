import * as Sentry from "@sentry/nextjs";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://32f21f60f89a90951f863749c2eb50a8@o4511529673949184.ingest.us.sentry.io/4511625652404224",
    integrations: [Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    enableLogs: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: true,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
