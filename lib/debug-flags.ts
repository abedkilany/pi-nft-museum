export const isProduction = process.env.NODE_ENV === 'production';

export const isPiDebugEnabled = !isProduction;

export function isInternalDebugRouteEnabled() {
  return !isProduction;
}
