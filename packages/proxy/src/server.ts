import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { Vault, sanitize, StreamRestorer, Finding } from '@privacyfirst/engine';
import { ProxyLogEntry, ProxyMode, ProxyOptions } from './types.js';

export class PrivacyFirstProxy {
  private server: http.Server | null = null;
  private vault: Vault;
  private mode: ProxyMode = 'SANITIZE';
  private port: number = 4040;
  private host: string = '127.0.0.1';
  private onLogCallback?: (entry: ProxyLogEntry) => void;
  private onModeChangeCallback?: (mode: ProxyMode) => void;

  constructor(options: ProxyOptions = {}) {
    this.port = options.port ?? 4040;
    this.host = options.host ?? '127.0.0.1';
    this.mode = options.mode ?? 'SANITIZE';
    this.onLogCallback = options.onLog;
    this.onModeChangeCallback = options.onModeChange;
    this.vault = new Vault();
  }

  public getVault(): Vault {
    return this.vault;
  }

  public getMode(): ProxyMode {
    return this.mode;
  }

  public setMode(newMode: ProxyMode): void {
    this.mode = newMode;
    if (this.onModeChangeCallback) {
      this.onModeChangeCallback(this.mode);
    }
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private detectCaller(req: http.IncomingMessage, route: string): 'opencode' | 'claude' | 'codex' | 'generic' {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    if (userAgent.includes('opencode')) return 'opencode';
    if (userAgent.includes('claude') || userAgent.includes('anthropic')) return 'claude';
    if (userAgent.includes('codex') || route === '/v1/responses') return 'codex';
    if (route.startsWith('/v1/messages')) return 'claude';
    return 'generic';
  }

  private getUpstreamTarget(route: string): { host: string; port: number } {
    if (route.startsWith('/v1/messages')) {
      return { host: 'api.anthropic.com', port: 443 };
    }
    // /v1/chat/completions, /v1/responses, or default
    return { host: 'api.openai.com', port: 443 };
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const startTime = Date.now();
    const route = req.url?.split('?')[0] || '/';
    const caller = this.detectCaller(req, route);
    const upstream = this.getUpstreamTarget(route);

    // Health check endpoint
    if (route === '/health' || route === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', mode: this.mode, port: this.port }));
      return;
    }

    // CORS preflight support
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      });
      res.end();
      return;
    }

    // Read incoming request body
    const bodyChunks: Buffer[] = [];
    req.on('data', (chunk) => bodyChunks.push(chunk));
    req.on('end', () => {
      const rawBody = Buffer.concat(bodyChunks).toString('utf-8');
      let forwardedBody = rawBody;
      let requestFindings: Finding[] = [];

      // If in SANITIZE mode and there's a JSON body, sanitize user content
      if (this.mode === 'SANITIZE' && rawBody) {
        try {
          const parsed = JSON.parse(rawBody);
          requestFindings = this.sanitizeJsonPayload(parsed);
          forwardedBody = JSON.stringify(parsed);
        } catch {
          // If not valid JSON, treat as raw text
          const result = sanitize(rawBody, this.vault);
          forwardedBody = result.sanitized;
          requestFindings = result.findings;
        }
      }

      // Prepare headers for upstream request
      const upstreamHeaders: http.OutgoingHttpHeaders = {
        ...req.headers,
        host: upstream.host,
        'accept-encoding': 'identity', // Ensure no compression for clean token stream parsing
        'content-length': Buffer.byteLength(forwardedBody, 'utf-8')
      };

      const upstreamReq = https.request(
        {
          host: upstream.host,
          port: upstream.port,
          path: req.url,
          method: req.method,
          headers: upstreamHeaders
        },
        (upstreamRes) => {
          const isSSE = (upstreamRes.headers['content-type'] || '').includes('text/event-stream');

          // Pass response headers, ensuring no gzip
          const resHeaders = { ...upstreamRes.headers };
          delete resHeaders['content-encoding'];
          delete resHeaders['content-length'];
          res.writeHead(upstreamRes.statusCode || 200, resHeaders);

          if (isSSE && this.mode === 'SANITIZE') {
            const streamRestorer = new StreamRestorer(this.vault);

            upstreamRes.on('data', (chunk: Buffer) => {
              const text = chunk.toString('utf-8');
              const restoredText = streamRestorer.processChunk(text);
              res.write(restoredText);
            });

            upstreamRes.on('end', () => {
              const flushed = streamRestorer.flush();
              if (flushed) {
                res.write(flushed);
              }
              res.end();
              this.logEntry(route, caller, upstream.host, upstreamRes.statusCode || 200, startTime, requestFindings);
            });
          } else {
            const resChunks: Buffer[] = [];
            upstreamRes.on('data', (chunk: Buffer) => resChunks.push(chunk));
            upstreamRes.on('end', () => {
              let responseBody = Buffer.concat(resChunks).toString('utf-8');
              if (this.mode === 'SANITIZE') {
                responseBody = this.vault.restore(responseBody);
              }
              res.end(responseBody);
              this.logEntry(route, caller, upstream.host, upstreamRes.statusCode || 200, startTime, requestFindings);
            });
          }
        }
      );

      upstreamReq.on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy upstream gateway error', message: err.message }));
        this.logEntry(route, caller, upstream.host, 502, startTime, requestFindings);
      });

      upstreamReq.write(forwardedBody);
      upstreamReq.end();
    });
  }

  private sanitizeJsonPayload(payload: any): Finding[] {
    const allFindings: Finding[] = [];

    const recurseAndSanitize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string') {
          const res = sanitize(val, this.vault);
          obj[key] = res.sanitized;
          allFindings.push(...res.findings);
        } else if (typeof val === 'object') {
          recurseAndSanitize(val);
        }
      }
    };

    recurseAndSanitize(payload);
    return allFindings;
  }

  private logEntry(
    route: string,
    caller: 'opencode' | 'claude' | 'codex' | 'generic',
    upstream: string,
    status: number,
    startTime: number,
    findings: Finding[]
  ): void {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0]; // HH:mm:ss
    const entry: ProxyLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      isoTimestamp: now.toISOString(),
      route,
      caller,
      upstream,
      mode: this.mode,
      findingsCount: findings.length,
      findings,
      status,
      durationMs: Date.now() - startTime
    };

    if (this.onLogCallback) {
      this.onLogCallback(entry);
    }
  }
}
