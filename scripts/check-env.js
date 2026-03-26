const required = ['DATABASE_URL', 'APP_SESSION_SECRET'];
const optional = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_PI_API_KEY',
  'PI_SERVER_API_KEY',
  'PINATA_JWT',
  'SENTRY_DSN',
];

function has(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0;
}

const missing = required.filter((name) => !has(name));

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Required env vars are present.');
for (const name of optional) {
  console.log(`${name}: ${has(name) ? 'set' : 'not set'}`);
}
