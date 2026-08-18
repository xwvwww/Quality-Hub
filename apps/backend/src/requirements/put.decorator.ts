import { Patch } from '@nestjs/common';
Object.assign(globalThis, { Put: Patch });
declare global { const Put: typeof Patch; }
