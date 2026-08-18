import { RequestContext } from './request-context';

describe('RequestContext', () => {
  it('normalizes IPv4-mapped addresses', (done) => RequestContext.run('::ffff:127.0.0.1', () => {
    expect(RequestContext.ip()).toBe('127.0.0.1'); done();
  }));
  it('drops invalid values instead of writing spoofed headers', (done) => RequestContext.run('attacker, 10.0.0.1', () => {
    expect(RequestContext.ip()).toBeUndefined(); done();
  }));
});
