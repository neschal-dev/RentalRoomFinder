import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guard/guard.guard.js';
import { CreateUploadSignatureDto } from './dto/create-upload-signature.dto.js';
import { MediaService } from './media.service.js';

@Controller('media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  // POST /media/signature   (login needed)
  // The listing form calls this before each upload.
  @Post('signature')
  @HttpCode(200)
  @UseGuards(ClerkAuthGuard)
  createSignature(@Body() body: CreateUploadSignatureDto) {
    return this.media.createUploadSignature(body.mediaType);
  }
}
