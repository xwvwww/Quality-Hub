import { AsyncLocalStorage } from 'async_hooks';
import { isIP } from 'net';

type Context = { ipAddress?: string };

export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<Context>();

  static run(rawIp: string | undefined, next: () => void) {
    const normalized = rawIp?.startsWith('::ffff:') ? rawIp.slice(7) : rawIp;
    const ipAddress = normalized && isIP(normalized) ? normalized : undefined;
    this.storage.run({ ipAddress }, next);
  }

  static ip() { return this.storage.getStore()?.ipAddress; }
}
