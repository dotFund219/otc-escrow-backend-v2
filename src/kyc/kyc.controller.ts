import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Multer } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/auth.guard';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeExt(mime: string, original: string) {
  const extFromName = path.extname(original || '').toLowerCase();
  if (mime === 'image/jpeg') return '.jpg';
  if (mime === 'image/png') return '.png';
  if (mime === 'image/webp') return '.webp';
  // fallback: only allow known
  if (extFromName === '.jpg' || extFromName === '.jpeg') return '.jpg';
  if (extFromName === '.png') return '.png';
  if (extFromName === '.webp') return '.webp';
  return '';
}

@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        const ok =
          file.mimetype === 'image/jpeg' ||
          file.mimetype === 'image/png' ||
          file.mimetype === 'image/webp';
        if (!ok)
          return cb(
            new BadRequestException('Only JPG/PNG/WEBP allowed.'),
            false,
          );
        cb(null, true);
      },
      storage: diskStorage({
        destination: (req, file, cb) => {
          // store in project root under /uploads/kyc instead of inside dist
          const uploadRoot = path.join(process.cwd(), 'uploads', 'kyc');
          ensureDir(uploadRoot);
          cb(null, uploadRoot);
        },
        filename: (req: any, file, cb) => {
          const ext = safeExt(file.mimetype, file.originalname);
          if (!ext)
            return cb(new BadRequestException('Unsupported image type.'), '');
          const rand = randomBytes(8).toString('hex');
          const address =
            req.user?.address ??
            req.user?.wallet ??
            req.user?.sub ??
            req.user?.seller;

          cb(null, `${address}_${Date.now()}_${rand}${ext}`);
        },
      }),
    }),
  )
  async upload(@UploadedFile() file: Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('No file uploaded.');

    // ✅ identify user here:
    // 1) if the auth guard has populated req.user, use it
    // 2) otherwise temporarily accept an "x-address" header as fallback
    const address =
      req.user?.address ??
      req.user?.wallet ??
      req.user?.sub ??
      req.user?.seller;

    const user = await this.kyc.resolveUserByAddress(address);

    const relativePath = `kyc/${file.filename}`;
    const saved = await this.kyc.saveUpload({ user, file, relativePath });

    return {
      ok: true,
      file: saved,
    };
  }
}
