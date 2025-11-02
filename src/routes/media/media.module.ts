import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import multer from "multer";
import path from "path";
import { generateRandomFilename } from "src/shared/helpers";
import { MediaController } from "./media.controller";
import { existsSync, mkdirSync } from "fs";
import { MediaService } from "./media.service";


const UPLOAD_DIR = path.resolve('upload')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename: function (req, file, cb) {
    const newFilename = generateRandomFilename(file.originalname)
    cb(null, newFilename)
  },
})
@Module({
  providers: [MediaService],
  imports: [
    MulterModule.register({
      storage,
    }),
  ],
  controllers: [MediaController],
})
export class MediaModule {
  constructor() {
    if (!existsSync(UPLOAD_DIR)) {
      mkdirSync(UPLOAD_DIR, { recursive: true })
    }
  }
}