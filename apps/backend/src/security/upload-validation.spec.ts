import { BadRequestException } from '@nestjs/common';
import { validateUpload } from './upload-validation';

const file = (mimetype: string, bytes: number[]) => ({ originalname: 'file.bin', mimetype, size: bytes.length, buffer: Buffer.from(bytes) });

describe('upload validation', () => {
  it('accepts a PNG signature', () => {
    expect(validateUpload(file('image/png', [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), ['image/png'], 100)).toEqual({ extension: '.png', mimeType: 'image/png' });
  });
  it('rejects executable content disguised as an image', () => {
    expect(() => validateUpload(file('image/png', [0x4d,0x5a,0x90,0x00]), ['image/png'], 100)).toThrow(BadRequestException);
  });
  it('rejects malformed JSON', () => {
    const payload = Buffer.from('{broken');
    expect(() => validateUpload({ originalname:'x.json',mimetype:'application/json',size:payload.length,buffer:payload }, ['application/json'], 100)).toThrow('Содержимое файла');
  });
});
