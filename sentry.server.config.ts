import * as Sentry from "@sentry/nextjs";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: "https://32f21f60f89a90951f863749c2eb50a8@o4511529673949184.ingest.us.sentry.io/4511625652404224",
    tracesSampleRate: 0.1,
    enableLogs: true,
    sendDefaultPii: true,
  });
}
