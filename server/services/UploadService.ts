import { ValidationService } from './ValidationService.js';
import { StorageService } from './StorageService.js';

export class UploadService {
  static async handleBase64Upload(base64: string, filename: string = 'document.pdf'): Promise<string> {
    const buffer = await ValidationService.validateBase64(base64);
    return StorageService.writeTempFile(buffer, filename);
  }
}
