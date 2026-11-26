/** Same shape as the real HTTP client's error, so screens handle both alike. */
export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
