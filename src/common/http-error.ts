/** An error that maps straight to an HTTP response */
export interface HttpError extends Error {
  status: number;
  body: Record<string, unknown>;
}

export function httpError(
  status: number,
  message: string,
  extra: Record<string, unknown> = {},
): HttpError {
  const err = new Error(message) as HttpError;
  err.status = status;
  err.body = { statusCode: status, message, ...extra };
  return err;
}

export function isHttpError(err: unknown): err is HttpError {
  return (
    err instanceof Error &&
    typeof (err as HttpError).status === "number" &&
    "body" in err
  );
}
