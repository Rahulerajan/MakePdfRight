export interface UploadProgressCallback {
  (percentage: number): void;
}

export interface UploadResult {
  objectKey: string;
  filename: string;
  size: number;
}

/**
 * Uploads a file directly to storage using short-lived signed upload URLs.
 */
export async function uploadFileForProcessing(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  if (!file) throw new Error('File is required for upload.');

  // Step 1: Request signed upload authorization from server
  const authRes = await fetch('/api/files/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/pdf',
      size: file.size
    })
  });

  if (!authRes.ok) {
    const errData = await authRes.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || `Failed to obtain upload authorization (${authRes.status}).`);
  }

  const { upload } = await authRes.json();
  if (!upload || !upload.url || !upload.objectKey) {
    throw new Error('Invalid upload authorization response received from server.');
  }

  // Step 2: Direct binary upload with upload progress tracking
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', upload.url, true);
    xhr.setRequestHeader('Content-Type', file.type || 'application/pdf');

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let errMessage = `Upload failed with HTTP ${xhr.status}`;
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.error) errMessage = res.error;
        } catch {}
        reject(new Error(errMessage));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during file upload. Please check your connection.'));
    xhr.onabort = () => reject(new Error('File upload was cancelled.'));

    xhr.send(file);
  });

  return {
    objectKey: upload.objectKey,
    filename: file.name,
    size: file.size
  };
}
