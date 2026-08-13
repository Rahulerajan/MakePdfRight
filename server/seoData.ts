export interface RouteSEO {
  title: string;
  description: string;
  ogImage?: string;
}

export const SEO_DATA: Record<string, RouteSEO> = {
  '/': {
    title: 'MakePDFRight – Fast, Private & Free Online PDF & Media Tools',
    description: 'MakePDFRight is your all-in-one suite of online PDF and media tools. Merge, split, compress, edit, convert PDFs to Word/Excel/JPG, generate images, and transcribe audio securely in your browser.',
    ogImage: '/og-image.png'
  },
  '/compress': {
    title: 'Compress PDF Online Free – Reduce PDF File Size | MakePDFRight',
    description: 'Reduce PDF file size online for free. Learn how to shrink PDF files for email attachments without losing text clarity or visual quality.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-to-100kb': {
    title: 'Compress PDF to 100KB Online Free – Reduce File Size | MakePDFRight',
    description: 'Compress PDF files down to 100KB online for free without losing essential quality or readability. Fast, private, browser-based compression with instant download.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-to-500kb': {
    title: 'Compress PDF to 500KB Online Free | MakePDFRight',
    description: 'Shrink your PDF to 500KB for forms and uploads with mid-size limits. Free, instant, no signup.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-to-1mb': {
    title: 'Compress PDF to 1MB Online Free | MakePDFRight',
    description: 'Shrink your PDF to 1MB or smaller for uploads, forms, and email. Free, instant, no signup required.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-without-losing-quality': {
    title: 'Compress PDF Without Losing Quality | MakePDFRight',
    description: 'Reduce file size while keeping text and images sharp. Smart compression, not blind quality loss. Free and instant.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-for-whatsapp': {
    title: 'Compress PDF for WhatsApp Free | MakePDFRight',
    description: 'Shrink your PDF to send smoothly over WhatsApp without failed uploads. Free and instant.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-for-job-application': {
    title: 'Compress PDF for Job Applications Free | MakePDFRight',
    description: 'Get your resume or portfolio PDF under application portal size limits without losing quality. Free and instant.',
    ogImage: '/og-compress.png'
  },
  '/compress-multiple-pdf-files': {
    title: 'Compress Multiple PDF Files at Once Free | MakePDFRight',
    description: 'Batch compress several PDFs in one go — free, fast, no software needed.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-on-iphone': {
    title: 'Compress PDF on iPhone Free – No App Needed | MakePDFRight',
    description: 'Shrink PDF file size directly in Safari on your iPhone. No app download required.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-under-2mb': {
    title: 'Compress PDF Under 2MB Free Online | MakePDFRight',
    description: 'Shrink your PDF to under 2MB for email attachments, portal submissions, and job applications. Free and fast.',
    ogImage: '/og-compress.png'
  },
  '/reduce-pdf-size-for-email': {
    title: 'Reduce PDF Size for Email Attachments Free | MakePDFRight',
    description: 'Shrink large PDF documents so they send smoothly as email attachments without bounce-backs or size limit errors.',
    ogImage: '/og-compress.png'
  },
  '/merge': {
    title: 'Merge PDF Online Free – Combine PDF Files | MakePDFRight',
    description: 'Combine PDF files online for free without watermarks or formatting loss. Learn how to join multiple PDFs into one unified file in seconds.',
    ogImage: '/og-merge.png'
  },
  '/merge-pdf-without-losing-quality': {
    title: 'Merge PDF Without Losing Quality Free – High-Fidelity PDF Merger | MakePDFRight',
    description: 'Combine multiple PDF files into one high-fidelity document without quality loss. Preserve original vector graphics, crisp text, images, and formatting for free online.',
    ogImage: '/og-merge.png'
  },
  '/split': {
    title: 'Split PDF Online Free – Extract PDF Pages | MakePDFRight',
    description: 'Split PDF into pages or extract page ranges online for free. Learn how to split large PDF files without losing quality or installing Acrobat.'
  },
  '/split-pdf-by-page-number': {
    title: 'Split PDF by Page Number Free Online | MakePDFRight',
    description: 'Specify exact page numbers or custom page ranges (e.g., 1-5, 8, 10-12) to split and extract pages from your PDF instantly for free.'
  },
  '/extract-pages-from-pdf': {
    title: 'Extract Pages from PDF Online Free | MakePDFRight',
    description: 'Pull out and save individual pages or page groups from your PDF document for free. No software installation needed.'
  },
  '/split-pdf-into-single-pages': {
    title: 'Split PDF into Single Pages Free Online | MakePDFRight',
    description: 'Separate every page of your PDF file into standalone individual PDF documents in one click. Free, fast, and secure.'
  },
  '/delete-pages-from-pdf': {
    title: 'Delete Pages from PDF Online Free | MakePDFRight',
    description: 'Remove blank, duplicate, or unwanted pages from your PDF document online for free and download the cleaned file.'
  },
  '/split-pdf-in-half': {
    title: 'Split PDF in Half Free Online | MakePDFRight',
    description: 'Divide any PDF document into two separate halves quickly and easily. Free, browser-based, no signups required.'
  },
  '/split-pdf-every-n-pages': {
    title: 'Split PDF Every N Pages Free Online | MakePDFRight',
    description: 'Automatically split large PDF documents into equal parts every N pages. Perfect for batch processing and chapter splitting.'
  },
  '/split-large-pdf-file': {
    title: 'Split Large PDF File Free Online | MakePDFRight',
    description: 'Break giant PDF files and heavy multi-gigabyte documents into smaller, lightweight PDFs. Free, fast, with zero file caps.'
  },
  '/split-pdf-odd-even-pages': {
    title: 'Split PDF Odd and Even Pages Online Free | MakePDFRight',
    description: 'Separate odd-numbered and even-numbered pages from your PDF document for duplex printing and booklet assembly.'
  },
  '/split-pdf-on-iphone': {
    title: 'Split PDF on iPhone Free – No App Needed | MakePDFRight',
    description: 'Split and extract PDF pages on your iPhone or iPad directly in Safari. No app downloads, no watermarks, completely free.'
  },
  '/split-pdf-without-losing-quality': {
    title: 'Split PDF Without Losing Quality Free | MakePDFRight',
    description: 'Split PDF files without quality loss. Preserve 100% vector text, original image resolution, and page layouts.'
  },
  '/split-pdf-without-acrobat': {
    title: 'Split PDF Without Acrobat Free Online | MakePDFRight',
    description: 'Split PDF files online for free without Adobe Acrobat or paid software. Quick, private, browser-based PDF page extractor.'
  },
  '/how-to-split-a-pdf': {
    title: 'How to Split a PDF Online Free Step-by-Step | MakePDFRight',
    description: 'Learn how to split a PDF file into separate pages or ranges online for free in 3 easy steps. Works on any device.'
  },
  '/split-pdf-by-range': {
    title: 'Split PDF by Page Range Online | MakePDFRight',
    description: 'Split PDF files by specifying exact page ranges like 1-5, 6-10, or 2-4 online for free. Fast, private, browser-first PDF extractor with no file limits.'
  },
  '/split-pdf-into-multiple-files': {
    title: 'Split PDF into Multiple Files Online | MakePDFRight',
    description: 'Divide a single PDF document into multiple separate PDF files by page ranges or sections. Free, private, and instant browser-based PDF splitter.'
  },
  '/separate-pdf-pages': {
    title: 'Separate PDF Pages Online | MakePDFRight',
    description: 'Separate specific pages or groups of pages from any PDF document quickly and easily online. Free, private, with instant browser-based download.'
  },
  '/extract-specific-pages-from-pdf': {
    title: 'Extract Specific Pages from PDF Online | MakePDFRight',
    description: 'Extract selected pages (e.g. 1, 3, 7-10) from your PDF file for free. Select exact pages via interactive thumbnail selection or range inputs.'
  },
  '/extract-single-page-from-pdf': {
    title: 'Extract a Single Page from PDF Online | MakePDFRight',
    description: 'Extract just one specific page from a large PDF document in seconds. Free, private, browser-based extraction with zero quality loss.'
  },
  '/split-pdf-for-email': {
    title: 'Split PDF for Email Online | MakePDFRight',
    description: 'Split oversized PDF files into smaller documents to send smoothly as email attachments without exceeding file size limits.'
  },
  '/split-pdf-for-whatsapp': {
    title: 'Split PDF for WhatsApp Online | MakePDFRight',
    description: 'Divide large PDF files into smaller, shareable documents for quick sending over WhatsApp and messaging apps without upload failures.'
  },
  '/split-pdf-for-upload': {
    title: 'Split PDF for Upload | MakePDFRight',
    description: 'Split large PDF files into smaller sections to meet strict upload limits on job portals, application websites, and cloud forms.'
  },
  '/split-pdf-online-free': {
    title: 'Free Online PDF Splitter | MakePDFRight',
    description: 'Split PDF files online for free with zero page limits or watermarks. Extract page ranges, pull out specific pages, and split documents fast and privately.'
  },
  '/pdf-to-jpg': {
    title: 'Convert PDF to JPG High Quality – Image Converter | MakePDFRight',
    description: 'Convert PDF pages to high quality JPG images online for free. Turn document pages into sharp graphics ready for presentations and web sharing.'
  },
  '/image-to-pdf': {
    title: 'Convert JPG to PDF Online – Combine Images | MakePDFRight',
    description: 'Convert JPG, PNG, and photos to PDF online for free. Learn how to combine multiple images into one organized, printable PDF document.'
  },
  '/pdf-to-word': {
    title: 'Convert PDF to Word Online Free – Editable DOCX | MakePDFRight',
    description: 'Convert PDF to Word online for free without formatting loss. Turn regular and scanned PDFs into fully editable DOCX files in seconds.'
  },
  '/pdf-to-excel': {
    title: 'PDF to Excel Converter Online – Extract Tables | MakePDFRight',
    description: 'Extract tables from PDF to Excel spreadsheets online for free. Turn PDF invoices, financial reports, and data grids into editable XLSX files.'
  },
  '/edit': {
    title: 'Edit PDF Online Free – Add Signature & Text | MakePDFRight',
    description: 'Edit PDF files online for free. Add signatures, fill out forms, insert text boxes, and annotate documents directly in your web browser.'
  },
  '/rotate': {
    title: 'Rotate PDF Online Free – Fix Sideways PDF Pages | MakePDFRight',
    description: 'Rotate PDF pages permanently online for free. Fix upside-down or sideways PDF scans in seconds with no software installation.'
  },
  '/organise': {
    title: 'Organize PDF Pages Online – Reorder & Delete | MakePDFRight',
    description: 'Reorder, delete, and rearrange PDF pages online for free. Drag and drop thumbnails to clean up multi-page documents instantly.'
  },
  '/ocr': {
    title: 'OCR PDF Online Free – Extract Text from Scanned PDF | MakePDFRight',
    description: 'Extract text from scanned PDFs online for free with optical character recognition. Turn unsearchable document scans into copyable, editable text.'
  },
  '/generate-image': {
    title: 'Free AI Image Generator Online – Text to Image | MakePDFRight',
    description: 'Generate custom artwork and photos from text prompts using AI. Free, fast, with adjustable aspect ratios and no account required.'
  },
  '/transcribe': {
    title: 'Audio to Text Converter Online Free – Speech to Text | MakePDFRight',
    description: 'Transcribe voice recordings, interviews, and audio files to text online for free with AI speech recognition. Fast, accurate, and multi-language.'
  },
  '/about': {
    title: 'About Us – Mission & Technology | MakePDFRight',
    description: 'Learn about MakePDFRight, our commitment to 100% private document processing, and modern browser-first software.'
  },
  '/contact': {
    title: 'Contact Us – Support & Feedback | MakePDFRight',
    description: 'Get in touch with the MakePDFRight team for support, feature suggestions, or business inquiries.'
  },
  '/privacy': {
    title: 'Privacy Policy | MakePDFRight',
    description: 'Learn how MakePDFRight protects your document privacy, handles short-term processing, and automatically deletes files.'
  },
  '/terms': {
    title: 'Terms of Service | MakePDFRight',
    description: 'Review the terms and conditions for using MakePDFRight\'s free online PDF and AI document processing tools.'
  },
  '/cookie-policy': {
    title: 'Cookie Policy | MakePDFRight',
    description: 'Review how MakePDFRight uses essential cookies, local preferences, and Google AdSense advertising cookies.'
  },
  '/disclaimer': {
    title: 'Disclaimer | MakePDFRight',
    description: 'Review legal disclaimers, document safety notices, and terms of service for MakePDFRight.'
  },
  '/404': {
    title: 'Page Not Found (404) | MakePDFRight',
    description: 'The page you requested could not be found. Explore our free PDF tools including Merge PDF, Split PDF, Compress PDF, and PDF Editor.'
  }
};

