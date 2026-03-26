Final admin gate fix:
- Removed server-side admin page gate from app/admin/layout.tsx to allow token-first app sessions to reach the admin shell.
- Updated ProtectedPageGate to attempt one silent restore via refreshUser() before treating a guest state as unauthenticated.
- Delayed guest rendering until the silent restore attempt completes, preventing premature redirects/login prompts after successful token-based login.
