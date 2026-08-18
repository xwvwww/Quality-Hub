import { BadRequestException } from '@nestjs/common';

export type BufferedUpload = { originalname: string; mimetype: string; size: number; buffer: Buffer };

const extensions: Record<string, string> = {
  'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
  'application/pdf': '.pdf', 'application/json': '.json', 'text/plain': '.txt',
};

function has(buffer: Buffer, bytes: number[], offset = 0) {
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

export function validateUpload(file: BufferedUpload, allowed: readonly string[], maxBytes: number) {
  if (!file?.buffer?.length || file.size !== file.buffer.length) throw new BadRequestException('Файл пустой или повреждён');
  if (file.size > maxBytes) throw new BadRequestException(`Размер файла превышает ${Math.floor(maxBytes / 1024 / 1024)} МБ`);
  if (!allowed.includes(file.mimetype)) throw new BadRequestException('Тип файла не разрешён');

  const valid = file.mimetype === 'image/png' ? has(file.buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    : file.mimetype === 'image/jpeg' ? has(file.buffer, [0xff, 0xd8, 0xff])
      : file.mimetype === 'image/webp' ? file.buffer.subarray(0, 4).toString('ascii') === 'RIFF' && file.buffer.subarray(8, 12).toString('ascii') === 'WEBP'
        : file.mimetype === 'application/pdf' ? file.buffer.subarray(0, 5).toString('ascii') === '%PDF-'
          : file.mimetype === 'application/json' ? isJson(file.buffer)
            : file.mimetype === 'text/plain' ? !file.buffer.includes(0) : false;
  if (!valid) throw new BadRequestException('Содержимое файла не соответствует заявленному типу');
  return { extension: extensions[file.mimetype], mimeType: file.mimetype };
}

export function validateUploads(files: BufferedUpload[] | undefined, allowed: readonly string[], maxBytes: number) {
  if (!files?.length) throw new BadRequestException('Файлы не выбраны');
  return files.map((file) => validateUpload(file, allowed, maxBytes));
}

function isJson(buffer: Buffer) {
  try { JSON.parse(buffer.toString('utf8')); return !buffer.includes(0); } catch { return false; }
}
