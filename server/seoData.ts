export interface RouteSEO {
  title: string;
  description: string;
  ogImage?: string;
  ogImageAlt?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
  canonicalUrl?: string;
  keywords?: string;
  author?: string;
  robots?: string;
}

export const SEO_DATA: Record<string, RouteSEO> = {
  '/': {
    title: 'MakePDFRight – Online PDF & Document Processing Tools',
    description: 'MakePDFRight provides online PDF and document utilities. Merge, split, compress, edit, convert PDFs, and process documents with browser-first and ephemeral workflows.',
    ogImage: '/og-image.png'
  },
  '/compress': {
    title: 'Compress PDF Online Free – Reduce PDF File Size | MakePDFRight',
    description: 'Reduce PDF file size online for free. Learn how to optimize and shrink PDF files for email attachments while balancing file size and visual clarity.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-to-100kb': {
    title: 'Compress PDF to 100KB Online Free – Reduce File Size | MakePDFRight',
    description: 'Compress PDF files toward 100KB online for free. Fast, private, browser-based compression with target-oriented optimization where document contents allow.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-to-500kb': {
    title: 'Compress PDF to 500KB Online Free | MakePDFRight',
    description: 'Shrink your PDF toward 500KB for forms and uploads with mid-size limits. Free, fast, no signup required.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-to-1mb': {
    title: 'Compress PDF to 1MB Online Free | MakePDFRight',
    description: 'Shrink your PDF toward 1MB or smaller for uploads, forms, and email. Free, fast, no signup required.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-without-losing-quality': {
    title: 'Compress PDF with Balanced Quality | MakePDFRight',
    description: 'Reduce file size while balancing text and image clarity. Smart compression algorithms adjust image streams and remove redundant metadata.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-for-whatsapp': {
    title: 'Compress PDF for WhatsApp Free | MakePDFRight',
    description: 'Shrink your PDF to send smoothly over messaging apps without failed uploads. Free and instant.',
    ogImage: '/og-compress.png'
  },
  '/compress-pdf-for-job-application': {
    title: 'Compress PDF for Job Applications Free | MakePDFRight',
    description: 'Reduce your resume or portfolio PDF file size for application portals while maintaining text readability. Free and instant.',
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
  '/merge-pdf-files-free': {
    title: 'Merge PDF Files Free – No Sign-Up, No Watermark | MakePDFRight',
    description: 'Merge PDF files online for free. No sign-up, no watermark, no file limits. Fast, secure, and works in your browser.',
    ogImage: '/og-merge.png'
  },
  '/combine-pdf-files-online': {
    title: 'Combine PDF Files Online in Seconds – No Install | MakePDFRight',
    description: 'Combine multiple PDF files into one document online — no installation required. Fast, free, and browser-based.',
    ogImage: '/og-merge.png'
  },
  '/merge-multiple-pdf-files-into-one': {
    title: 'Merge Multiple PDF Files Into One Document | MakePDFRight',
    description: 'Combine 3, 10, or more PDF files into a single document. Free online tool, no file limits.',
    ogImage: '/og-merge.png'
  },
  '/merge-pdf-and-word-into-one-file': {
    title: 'Merge PDF and Word Files Into One PDF Document Free | MakePDFRight',
    description: 'Combine PDF and Word (DOCX) files into a single PDF document online for free.',
    ogImage: '/og-merge.png'
  },
  '/merge-scanned-pdf-pages': {
    title: 'Merge Scanned PDF Pages Into One Document | MakePDFRight',
    description: 'Combine multiple scanned PDF pages or phone scans into a single PDF, free and online.',
    ogImage: '/og-merge.png'
  },
  '/merge-pdf-on-iphone': {
    title: 'How to Merge PDF Files on iPhone | MakePDFRight',
    description: 'Merge PDF files on your iPhone — no app needed. Free, fast, works right in Safari or Chrome.',
    ogImage: '/og-merge.png'
  },
  '/merge-pdf-in-order': {
    title: 'Merge PDFs While Keeping Your Page Order | MakePDFRight',
    description: 'Combine PDF files in the exact order you choose. Drag and drop to reorder before merging — free online.',
    ogImage: '/og-merge.png'
  },
  '/merge-protected-pdf-files': {
    title: 'How to Merge Password-Protected PDF Files | MakePDFRight',
    description: 'Learn how to merge PDF files that are password-protected or locked, free and online.',
    ogImage: '/og-merge.png'
  },
  '/how-to-merge-pdf-files': {
    title: 'How to Merge PDF Files (Free, No Software Needed) | MakePDFRight',
    description: 'Step-by-step guide to merging PDF files online for free. No software installation required.',
    ogImage: '/og-merge.png'
  },
  '/merge-jpg-and-pdf-into-one-file': {
    title: 'Merge JPG and PDF Files Into One Document | MakePDFRight',
    description: 'Combine JPG images and PDF files into a single PDF document, free and online.',
    ogImage: '/og-merge.png'
  },
  '/merge-pdf-without-software': {
    title: 'Merge PDF Files Without Installing Any Software | MakePDFRight',
    description: 'Combine PDF files online without downloading or installing anything. Works on any device, including locked-down work computers.',
    ogImage: '/og-merge.png'
  },
  '/merge-pdf-keep-bookmarks': {
    title: 'Merge PDFs Without Losing Bookmarks or Formatting | MakePDFRight',
    description: 'Combine PDF files while preserving bookmarks, formatting, and document structure.',
    ogImage: '/og-merge.png'
  },
  '/merge-pdf-without-losing-quality': {
    title: 'Merge PDF Without Losing Quality Free – High-Fidelity PDF Merger | MakePDFRight',
    description: 'Combine multiple PDF files into one high-fidelity document without quality loss. Preserve original vector graphics, crisp text, images, and formatting for free online.',
    ogImage: '/og-merge.png'
  },
  '/split': {
    title: 'Split PDF Online Free – Extract PDF Pages | MakePDFRight',
    description: 'Split PDF into pages or extract page ranges online for free. Learn how to extract and reorganize large PDF files without installing software.'
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
    title: 'Split PDF with Preserved Quality Free | MakePDFRight',
    description: 'Split PDF files with preserved vector text, original image resolution, and page layouts.'
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
    description: 'Convert PDF to Word online for free. Turn regular and scanned PDFs into editable DOCX files with high layout and structural retention.'
  },
  '/pdf-to-word-without-losing-formatting': {
    title: 'Convert PDF to Word Without Losing Formatting | MakePDFRight',
    description: 'Convert PDF to an editable Word document while preserving fonts, tables, and layout. Free and online.'
  },
  '/scanned-pdf-to-word': {
    title: 'Convert a Scanned PDF to an Editable Word Document | MakePDFRight',
    description: 'Turn scanned PDFs and image-based documents into editable Word files using OCR, free and online.'
  },
  '/pdf-to-word-free-no-email': {
    title: 'Convert PDF to Word Free — No Email, No Sign-Up | MakePDFRight',
    description: 'Convert PDF to Word online for free. No email required, no account, no watermark.'
  },
  '/pdf-to-word-editable': {
    title: 'Convert PDF to a Fully Editable Word Document | MakePDFRight',
    description: 'Turn a PDF into a Word file you can actually edit — text, tables, and formatting all stay editable.'
  },
  '/pdf-to-word-on-iphone': {
    title: 'How to Convert PDF to Word on iPhone | MakePDFRight',
    description: 'Convert PDF to Word on your iPhone — no app needed. Free, fast, works right in Safari.'
  },
  '/pdf-to-word-with-tables': {
    title: 'Convert a PDF With Tables Into an Editable Word Document | MakePDFRight',
    description: 'Convert PDF files containing tables into Word documents while keeping table structure and formatting intact.'
  },
  '/pdf-to-word-for-resume': {
    title: 'Convert a PDF Resume to an Editable Word Document | MakePDFRight',
    description: 'Turn your PDF resume into an editable Word file so you can update it for each job application, free and online.'
  },
  '/pdf-to-word-multiple-pages': {
    title: 'Convert Multi-Page PDFs to Word Documents | MakePDFRight',
    description: 'Convert PDFs of any length into a single Word document, free and online — no page limit.'
  },
  '/pdf-to-word-for-contracts': {
    title: 'Convert a PDF Contract to an Editable Word Document | MakePDFRight',
    description: 'Turn a signed PDF contract into an editable Word document to revise terms or clauses, free and online.'
  },
  '/pdf-to-word-online-free': {
    title: 'Convert PDF to Word Online, Free | MakePDFRight',
    description: 'Convert PDF to Word documents online for free. No software, no sign-up, no watermark.'
  },
  '/pdf-to-word-without-software': {
    title: 'Convert PDF to Word Without Installing Any Software | MakePDFRight',
    description: 'Turn PDF files into Word documents online, no downloads or installations required. Works on any device.'
  },
  '/pdf-to-word-password-protected': {
    title: 'Convert a Password-Protected PDF to Word | MakePDFRight',
    description: 'Learn how to convert a locked or password-protected PDF into an editable Word document, free and online.'
  },
  '/pdf-to-excel': {
    title: 'PDF to Excel Converter – PDF to XLSX | MakePDFRight',
    description: 'Convert text-based PDF tables and data into editable Excel (.xlsx) spreadsheets online for free. Fast, private, and no sign-up required.',
    canonicalUrl: 'https://www.makepdfright.com/pdf-to-excel',
    author: 'MakePDFRight',
    keywords: 'PDF to Excel, PDF to XLSX, convert PDF to Excel, extract PDF tables, PDF spreadsheet converter, PDF data extraction',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogImage: '/og-image.png',
    ogImageAlt: 'Convert PDF data to an editable Excel spreadsheet with MakePDFRight',
    twitterTitle: 'PDF to Excel Converter – PDF to XLSX | MakePDFRight',
    twitterDescription: 'Convert text-based PDF tables and data into editable Excel spreadsheets online for free.',
    twitterImage: '/og-image.png',
    twitterImageAlt: 'MakePDFRight PDF to Excel converter'
  },
  '/extract-tables-from-pdf-to-excel': {
    title: 'Extract Tables from PDF to Excel | MakePDFRight',
    description: 'Extract rows, columns, and table data from text-based PDF files into editable Excel spreadsheets online. Free, private, and easy to use.',
    canonicalUrl: 'https://www.makepdfright.com/extract-tables-from-pdf-to-excel',
    author: 'MakePDFRight',
    keywords: 'extract tables from PDF to Excel, PDF table extractor, export PDF table to Excel, PDF table to XLSX, extract data from PDF table',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogImage: '/og-image.png',
    ogImageAlt: 'Extract tables from PDF to Excel with MakePDFRight',
    twitterTitle: 'Extract Tables from PDF to Excel | MakePDFRight',
    twitterDescription: 'Extract rows, columns, and table data from text-based PDF files into editable Excel spreadsheets online.',
    twitterImage: '/og-image.png',
    twitterImageAlt: 'Extract tables from PDF to Excel online'
  },
  '/pdf-bank-statement-to-excel': {
    title: 'Convert PDF Bank Statement to Excel | MakePDFRight',
    description: 'Convert text-based PDF bank statements to editable Excel spreadsheets for easier review, sorting, and reconciliation. Free and private.',
    canonicalUrl: 'https://www.makepdfright.com/pdf-bank-statement-to-excel',
    author: 'MakePDFRight',
    keywords: 'PDF bank statement to Excel, convert bank statement PDF to Excel, bank statement to spreadsheet, PDF bank transactions to Excel',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogImage: '/og-image.png',
    ogImageAlt: 'Convert PDF bank statements to Excel spreadsheets with MakePDFRight',
    twitterTitle: 'Convert PDF Bank Statement to Excel | MakePDFRight',
    twitterDescription: 'Convert text-based PDF bank statements to editable Excel spreadsheets for easier review, sorting, and reconciliation.',
    twitterImage: '/og-image.png',
    twitterImageAlt: 'Convert PDF bank statement to Excel'
  },
  '/invoice-pdf-to-excel': {
    title: 'Convert Invoice PDF to Excel Online | MakePDFRight',
    description: 'Convert text-based PDF invoices to Excel and organize descriptions, quantities, prices, dates, and totals in an editable XLSX spreadsheet.',
    canonicalUrl: 'https://www.makepdfright.com/invoice-pdf-to-excel',
    author: 'MakePDFRight',
    keywords: 'invoice PDF to Excel, convert PDF invoice to Excel, PDF receipt to Excel, invoice table extraction, invoice to XLSX',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogImage: '/og-image.png',
    ogImageAlt: 'Convert invoice PDF to Excel with MakePDFRight',
    twitterTitle: 'Convert Invoice PDF to Excel Online | MakePDFRight',
    twitterDescription: 'Convert text-based PDF invoices to Excel and organize descriptions, quantities, prices, dates, and totals in an editable XLSX spreadsheet.',
    twitterImage: '/og-image.png',
    twitterImageAlt: 'Convert invoice PDF to Excel online'
  },
  '/financial-statement-pdf-to-excel': {
    title: 'Financial Statement PDF to Excel | MakePDFRight',
    description: 'Convert text-based financial statement PDFs into editable Excel spreadsheets for reviewing tables, figures, expenses, and report data.',
    canonicalUrl: 'https://www.makepdfright.com/financial-statement-pdf-to-excel',
    author: 'MakePDFRight',
    keywords: 'financial statement PDF to Excel, PDF balance sheet to Excel, financial report to spreadsheet, convert accounting PDF to Excel',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogImage: '/og-image.png',
    ogImageAlt: 'Convert financial statement PDF to Excel with MakePDFRight',
    twitterTitle: 'Financial Statement PDF to Excel | MakePDFRight',
    twitterDescription: 'Convert text-based financial statement PDFs into editable Excel spreadsheets for reviewing tables, figures, expenses, and report data.',
    twitterImage: '/og-image.png',
    twitterImageAlt: 'Financial statement PDF to Excel'
  },
  '/multi-page-pdf-to-excel': {
    title: 'Convert Multi-Page PDF to Excel | MakePDFRight',
    description: 'Convert data from multiple PDF pages into an editable Excel workbook online. Works best with text-based PDFs using consistent table layouts.',
    canonicalUrl: 'https://www.makepdfright.com/multi-page-pdf-to-excel',
    author: 'MakePDFRight',
    keywords: 'multi page PDF to Excel, convert long PDF to Excel, multi-page PDF spreadsheet, extract all pages PDF to Excel',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogImage: '/og-image.png',
    ogImageAlt: 'Convert multi-page PDF to Excel with MakePDFRight',
    twitterTitle: 'Convert Multi-Page PDF to Excel | MakePDFRight',
    twitterDescription: 'Convert data from multiple PDF pages into an editable Excel workbook online. Works best with text-based PDFs using consistent table layouts.',
    twitterImage: '/og-image.png',
    twitterImageAlt: 'Convert multi-page PDF to Excel'
  },
  '/pdf-to-excel-on-iphone': {
    title: 'Convert PDF to Excel on iPhone | MakePDFRight',
    description: 'Convert a text-based PDF to an editable Excel spreadsheet on iPhone using Safari. No dedicated application or registration required.',
    canonicalUrl: 'https://www.makepdfright.com/pdf-to-excel-on-iphone',
    author: 'MakePDFRight',
    keywords: 'PDF to Excel on iPhone, convert PDF to Excel mobile, iOS PDF to Excel, Safari PDF to Excel converter',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogImage: '/og-image.png',
    ogImageAlt: 'Convert PDF to Excel on iPhone with MakePDFRight',
    twitterTitle: 'Convert PDF to Excel on iPhone | MakePDFRight',
    twitterDescription: 'Convert a text-based PDF to an editable Excel spreadsheet on iPhone using Safari. No dedicated application or registration required.',
    twitterImage: '/og-image.png',
    twitterImageAlt: 'Convert PDF to Excel on iPhone'
  },
  '/pdf-to-xlsx-online': {
    title: 'Convert PDF to XLSX Online | MakePDFRight',
    description: 'Convert text-based PDF data into a Microsoft Excel-compatible XLSX spreadsheet online for free. Fast, private, and simple to use.',
    canonicalUrl: 'https://www.makepdfright.com/pdf-to-xlsx-online',
    author: 'MakePDFRight',
    keywords: 'PDF to XLSX online, convert PDF to XLSX, PDF to Microsoft Excel, free PDF to XLSX converter',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogImage: '/og-image.png',
    ogImageAlt: 'Convert PDF to XLSX online with MakePDFRight',
    twitterTitle: 'Convert PDF to XLSX Online | MakePDFRight',
    twitterDescription: 'Convert text-based PDF data into a Microsoft Excel-compatible XLSX spreadsheet online for free. Fast, private, and simple to use.',
    twitterImage: '/og-image.png',
    twitterImageAlt: 'Convert PDF to XLSX online'
  },
  '/convert-pdf-data-to-excel': {
    title: 'Convert PDF Data to Excel Online | MakePDFRight',
    description: 'Turn reusable text and numerical data from PDF documents into editable Excel rows and columns without manually retyping the information.',
    canonicalUrl: 'https://www.makepdfright.com/convert-pdf-data-to-excel',
    author: 'MakePDFRight',
    keywords: 'convert PDF data to Excel, export PDF data to Excel, transfer PDF data to spreadsheet, PDF data extraction to Excel',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogImage: '/og-image.png',
    ogImageAlt: 'Convert PDF data to Excel online with MakePDFRight',
    twitterTitle: 'Convert PDF Data to Excel Online | MakePDFRight',
    twitterDescription: 'Turn reusable text and numerical data from PDF documents into editable Excel rows and columns without manually retyping the information.',
    twitterImage: '/og-image.png',
    twitterImageAlt: 'Convert PDF data to Excel online'
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
  '/resources': {
    title: 'PDF & Document Processing Resources & Guides | MakePDFRight',
    description: 'Technical guides, conversion standards, compression principles, and best practices for PDF, spreadsheet, and digital document workflows.',
    ogImage: '/og-image.png'
  },
  '/about': {
    title: 'About Us – Mission & Technology | MakePDFRight',
    description: 'Learn about MakePDFRight, our independent suite of browser-first PDF utilities, file lifecycle rules, and technical architecture.'
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
  '/ai-workspace': {
    title: 'AI Document Workspace | MakePDFRight',
    description: 'Personal AI document workspace to analyze, summarize, and query PDF documents with conversational intelligence.',
    robots: 'noindex, nofollow'
  },
  '/404': {
    title: 'Page Not Found | MakePDFRight',
    description: 'The page you requested could not be found. Explore our PDF tools including Merge PDF, Split PDF, Compress PDF, and PDF Editor.'
  }
};

