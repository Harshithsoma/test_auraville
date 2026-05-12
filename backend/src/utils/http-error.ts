export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly errorCode: string;

  public constructor(statusCode: number, message: string, details?: unknown, errorCode = "HTTP_ERROR") {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
    this.errorCode = errorCode;
  }
}
