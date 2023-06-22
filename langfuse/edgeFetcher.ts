import { default as URLSearchParams } from '@ungap/url-search-params';

export type FetchFunction = <R = unknown>(
  args: Fetcher.Args,
) => Promise<APIResponse<R, Fetcher.Error>>;

type APIResponse<Success, Failure> =
  | SuccessfulResponse<Success>
  | FailedResponse<Failure>;

export interface SuccessfulResponse<T> {
  ok: true;
  body: T;
}

export interface FailedResponse<T> {
  ok: false;
  error: T;
}

export declare namespace Fetcher {
  export interface Args {
    url: string;
    method: string;
    contentType?: string;
    headers?: Record<string, string | undefined>;
    queryParameters?: URLSearchParams;
    body?: unknown;
    timeoutMs?: number;
    withCredentials?: boolean;
    responseType?: 'json' | 'blob';
  }

  export type Error =
    | FailedStatusCodeError
    | NonJsonError
    | TimeoutError
    | UnknownError;

  export interface FailedStatusCodeError {
    reason: 'status-code';
    statusCode: number;
    body: unknown;
  }

  export interface NonJsonError {
    reason: 'non-json';
    statusCode: number;
    rawBody: string;
  }

  export interface TimeoutError {
    reason: 'timeout';
  }

  export interface UnknownError {
    reason: 'unknown';
    errorMessage: string;
  }
}

async function fetcherImpl<R = unknown>(
  args: Fetcher.Args,
): Promise<APIResponse<R, Fetcher.Error>> {
  const headers: Record<string, string> = {};
  if (args.body !== undefined && args.contentType != null) {
    headers['Content-Type'] = args.contentType;
  }

  if (args.headers != null) {
    for (const [key, value] of Object.entries(args.headers)) {
      if (value != null) {
        headers[key] = value;
      }
    }
  }

  const controller = new AbortController();
  const signal = controller.signal;
  if (args.timeoutMs) {
    setTimeout(() => controller.abort(), args.timeoutMs);
  }

  let response;
  let body: unknown;

  try {
    response = await fetch(
      args.url + (args.queryParameters ? `?${args.queryParameters}` : ''),
      {
        method: args.method,
        headers,
        body: JSON.stringify(args.body),
        signal,
        credentials: args.withCredentials ? 'include' : 'omit',
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (args.responseType === 'blob') {
      body = await response.blob();
    } else if (
      response.headers.get('Content-Type')?.includes('application/json')
    ) {
      body = await response.json();
    } else {
      body = await response.text();
    }
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          ok: false,
          error: {
            reason: 'timeout',
          },
        };
      } else if (error.message.startsWith('HTTP error')) {
        return {
          ok: false,
          error: {
            reason: 'status-code',
            statusCode: response ? response.status : 0,
            body,
          },
        };
      }

      return {
        ok: false,
        error: {
          reason: 'unknown',
          errorMessage: error.message,
        },
      };
    }

    // Default catch-all error case if error is not an instance of Error
    return {
      ok: false,
      error: {
        reason: 'unknown',
        errorMessage: 'An unknown error occurred',
      },
    };
  }

  return {
    ok: true,
    body: body as R,
  };
}

export const fetcher: FetchFunction = fetcherImpl;
