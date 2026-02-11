declare const __ENV: Record<string, string | undefined>;
declare const __VU: number;
declare const __ITER: number;
declare function open(path: string): string;

declare module 'k6' {
  export function check(value: unknown, checks: Record<string, (value: any) => boolean>): boolean;
  export function group<T>(name: string, fn: () => T): T;
  export function sleep(seconds: number): void;
}

declare module 'k6/http' {
  type HttpParams = Record<string, any>;

  interface HttpResponse {
    status: number;
    body: string;
    headers: Record<string, string>;
    json(): any;
  }

  interface HttpApi {
    get(url: string, params?: HttpParams): HttpResponse;
    post(url: string, body?: any, params?: HttpParams): HttpResponse;
    expectedStatuses(...statuses: number[]): any;
  }

  const http: HttpApi;
  export default http;
}

declare module 'k6/data' {
  export class SharedArray<T = any> extends Array<T> {
    constructor(name: string, producer: () => T[]);
  }
}

declare module 'k6/metrics' {
  export class Counter {
    constructor(name: string);
    add(value: number): void;
  }

  export class Trend {
    constructor(name: string);
    add(value: number): void;
  }
}
