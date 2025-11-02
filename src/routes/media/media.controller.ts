import { Controller, FileTypeValidator, MaxFileSizeValidator, ParseFilePipe, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { MediaService } from './media.service'

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}


  @Post('images/upload')
  @UseInterceptors(FilesInterceptor('file',100, {
    limits: {
      fileSize: 1 * 1024 * 1024, // 1MB
    },
  }))
  uploadFile(@UploadedFiles(new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
      new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/, skipMagicNumbersValidation: true }),
    ],
  }),) files: Array<Express.Multer.File>) {
    return this.mediaService.uploadFile(files)
  }
}