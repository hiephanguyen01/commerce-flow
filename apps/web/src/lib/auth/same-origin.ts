export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');

  if (!origin) {
    return true;
  }

  const appUrl = process.env.APP_URL;

  return origin === appUrl;
}
