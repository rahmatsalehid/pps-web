const BASE_URL = process.env.BACKEND_API_URL ?? "http://localhost:5002";

export class ApiRequestError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ApiRequestError";
  }
}

export type ApiResult<T> = {
  status: number;
  data: T;
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new ApiRequestError("Tidak dapat terhubung ke server", { cause: error });
  }

  const data = (await response.json().catch(() => null)) as T | null;

  if (data === null) {
    throw new ApiRequestError("Respons server tidak valid");
  }

  return { status: response.status, data };
}

export async function apiFetchAuth<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new ApiRequestError("Tidak dapat terhubung ke server", { cause: error });
  }

  const data = (await response.json().catch(() => null)) as T | null;

  if (data === null) {
    throw new ApiRequestError("Respons server tidak valid");
  }

  return { status: response.status, data };
}
