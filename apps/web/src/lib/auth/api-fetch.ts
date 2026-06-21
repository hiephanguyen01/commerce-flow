let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
  });

  return response.ok;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response = await fetch(input, init);

  if (response.status !== 401) {
    return response;
  }

  refreshPromise ??= refreshSession().finally(() => {
    refreshPromise = null;
  });

  const refreshed = await refreshPromise;

  if (!refreshed) {
    return response;
  }

  response = await fetch(input, init);

  return response;
}
