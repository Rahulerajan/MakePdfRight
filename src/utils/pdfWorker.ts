import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
}

export { pdfjs };
