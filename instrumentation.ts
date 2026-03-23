export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');

    process.on('uncaughtException', (error) => {
      console.error('uncaughtException', error);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('unhandledRejection', reason);
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
