import { ValidationService } from './ValidationService';
import { StorageService } from './StorageService';

export class UploadService {
  static async handleBase64Upload(base64: string, filename: string = 'document.pdf'): Promise<string> {
    const buffer = await ValidationService.validateBase64(base64);
    return StorageService.writeTempFile(buffer, filename);
  }
}
