export const API_BASE_URL = "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(`API error: ${res.statusText}`, res.status);
  }
  return res.json();
}
