import { Controller, FileTypeValidator, MaxFileSizeValidator, ParseFilePipe, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { MediaService } from './media.service'
import { CloudinaryService } from './cloudinary.service'

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService, 
    private readonly cloudinaryService: CloudinaryService) {}


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

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadFile(file);
    return {
      url: result.secure_url,
      public_id: result.public_id
    };
  }
}