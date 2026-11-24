import "server-only";

export class RequestError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function reportEvent(code: string, reference?: string) {
  console.warn(JSON.stringify({ event: code, ...(reference ? { reference } : {}) }));
}
