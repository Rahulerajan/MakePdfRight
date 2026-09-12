export interface GuideItem {
  id: string;
  title: string;
  category: 'fundamentals' | 'conversion' | 'optimization' | 'security';
  readTime: string;
  summary: string;
  keyPoints: string[];
  content: {
    heading: string;
    paragraphs: string[];
  }[];
  relatedTool: {
    name: string;
    path: string;
  };
}

export const GUIDES: GuideItem[] = [
  {
    id: 'pdf-vs-editable-formats',
    title: 'PDF vs Editable Document Formats: Why Layouts Behave Differently',
    category: 'fundamentals',
    readTime: '6 min read',
    summary: 'Understand the underlying postscript coordinates of PDF files compared to fluid paragraph flow in DOCX and XLSX documents.',
    keyPoints: [
      'PDFs position every glyph, line, and image using absolute page coordinates (X, Y points).',
      'Word (DOCX) and Excel (XLSX) rely on relative document flow, styling hierarchies, and fluid layout engines.',
      'Converting PDF to editable formats requires algorithmic layout reconstruction rather than direct file translation.'
    ],
    content: [
      {
        heading: 'The Architecture of a Fixed-Layout PDF',
        paragraphs: [
          'The Portable Document Format (PDF) was engineered by Adobe in 1993 to ensure that documents appear identical across any screen, printer, or operating system. To achieve this absolute visual fidelity, a PDF does not store paragraphs or tables in the traditional sense; instead, it stores drawing instructions and absolute coordinates on a fixed canvas.',
          'For example, a heading in a PDF is stored as raw glyphs placed at precise X/Y millimeter coordinates relative to the page margin. When you open a PDF on Windows, macOS, or a smartphone, the PDF rendering engine simply paints those exact coordinates.'
        ]
      },
      {
        heading: 'Why Paragraph Flow Shifts During Conversion',
        paragraphs: [
          'In contrast, word processing formats like Microsoft Word (.docx) and Google Docs use fluid layout models where text wraps dynamically based on font size, paragraph margins, line height, and page margins.',
          'When MakePDFRight converts a PDF into a Word document, our conversion engine analyzes proximity clusters—detecting whether separate text fragments belong to the same logical paragraph, header, or table column. Understanding this difference helps you anticipate minor typographic adjustments when converting complex multi-column brochures or newsletters.'
        ]
      }
    ],
    relatedTool: { name: 'PDF to Word Tool', path: '/pdf-to-word' }
  },
  {
    id: 'how-pdf-compression-works',
    title: 'How PDF Compression Actually Works: Lossless vs Lossy Optimization',
    category: 'optimization',
    readTime: '5 min read',
    summary: 'A technical breakdown of raster image subsampling, vector preservation, font subsetting, and internal PDF object stream compression.',
    keyPoints: [
      'Text and vector paths are compressed losslessly using Flate/Deflate algorithms with zero degradation.',
      'Embedded JPEG and PNG photographs are optimized through resolution subsampling and quantization.',
      'Unused embedded fonts and redundant metadata streams are safely stripped to maximize size reduction.'
    ],
    content: [
      {
        heading: 'The Three Main Components of a PDF File Size',
        paragraphs: [
          'Large PDF files are rarely caused by plain text. A 100-page novel of pure text usually takes less than 1 MB. High file sizes typically stem from three elements: high-DPI scanned photos (often 300 to 600 DPI from office copiers), uncompressed embedded raster graphics, and redundant font subsets.',
          'MakePDFRight’s compression engine targets these bloated components while leaving core vector structures completely untouched.'
        ]
      },
      {
        heading: 'Balancing File Size vs Visual Quality',
        paragraphs: [
          'When you select Recommended Compression, the system downsamples 300+ DPI images to screen-friendly 144–150 DPI, which reduces the file size by 60%–80% without noticeable pixelation on laptop screens and mobile phones.',
          'For strict job portals or government email attachment limits (e.g., under 2MB), Extreme Compression applies deeper DCT quantization, making the file ultra-lightweight while keeping text crisp and fully readable.'
        ]
      }
    ],
    relatedTool: { name: 'Compress PDF Tool', path: '/compress' }
  },
  {
    id: 'scanned-vs-digital-pdf',
    title: 'Scanned vs Digital PDFs: How to Identify and Prepare for OCR',
    category: 'fundamentals',
    readTime: '5 min read',
    summary: 'Learn how to detect whether a PDF contains live selectable vector text or flat pixel images, and how to prepare scans for optical character recognition.',
    keyPoints: [
      'Digital "Born-Digital" PDFs contain extractable font glyphs and selectable text layers.',
      'Scanned PDFs are flat bitmap pictures of physical paper encapsulated inside a PDF wrapper.',
      'OCR analyzes contrast and character shapes to reconstruct searchable text layers over scanned images.'
    ],
    content: [
      {
        heading: 'The 3-Second Selection Test',
        paragraphs: [
          'To determine if your PDF is digital or scanned, open it in any browser or viewer and try to highlight a sentence with your cursor. If you can highlight individual words and copy/paste them into a text editor, your document is a born-digital PDF with a native text layer.',
          'If clicking and dragging draws a selection box over the entire page or highlights nothing, the PDF is a scanned bitmap image. Standard conversion tools cannot extract text from image-only PDFs without Optical Character Recognition (OCR).'
        ]
      },
      {
        heading: 'Best Practices for High-Accuracy OCR',
        paragraphs: [
          'OCR accuracy depends heavily on scan quality. For optimal recognition, scan at 300 DPI, ensure pages are upright and aligned, avoid skewed or rotated orientation, and maintain high contrast between dark ink and clean white backgrounds.',
          'Handwritten notes, blurry mobile camera shots with heavy shadows, and crumpled receipts will require manual verification after transcription.'
        ]
      }
    ],
    relatedTool: { name: 'OCR PDF Tool', path: '/ocr' }
  },
  {
    id: 'extracting-pdf-tables-to-excel',
    title: 'Extracting PDF Tables to Excel: Structure, Numbers, and Audit Rules',
    category: 'conversion',
    readTime: '7 min read',
    summary: 'Best practices for converting invoices, bank statements, and financial schedules into clean, formula-ready XLSX spreadsheets.',
    keyPoints: [
      'Table converters identify coordinate boundaries, whitespace gutters, and cell grid lines.',
      'Always audit numerical columns for thousand-separators, currency symbols, and negative brackets.',
      'Multi-page tables should be structured into contiguous sheets for easy pivot and formula analysis.'
    ],
    content: [
      {
        heading: 'How Tabular Data is Detected in PDFs',
        paragraphs: [
          'Because PDFs have no native "cell" or "spreadsheet" tags, table conversion engines detect alignment grids by analyzing horizontal baselines and vertical whitespace gaps between numerical columns.',
          'When columns have clear headers (such as Date, Description, Debit, Credit, Balance), the algorithm maps each row into distinct spreadsheet cells.'
        ]
      },
      {
        heading: 'Essential Post-Conversion Financial Checklist',
        paragraphs: [
          'Whenever you convert bank statements, balance sheets, or payroll summaries from PDF to Excel, always perform a reconciliation check: run a `=SUM()` formula over credit and debit columns and compare the total against the PDF summary.',
          'Check that negative amounts (e.g., `-$150.00` or `($150.00)`) were correctly interpreted as negative numeric values rather than plain text strings.'
        ]
      }
    ],
    relatedTool: { name: 'PDF to Excel Tool', path: '/pdf-to-excel' }
  },
  {
    id: 'document-privacy-client-side',
    title: 'Document Privacy & Client-Side Processing: Protecting Confidential Files',
    category: 'security',
    readTime: '4 min read',
    summary: 'How modern WebAssembly and in-browser PDF engines allow file manipulation without sending sensitive data over external networks.',
    keyPoints: [
      'Core tools like Merge, Split, Rotate, and Organise execute directly inside your web browser’s memory sandbox.',
      'Files never leave your local device for purely client-side operations.',
      'Server-assisted tools use ephemeral memory buffers with immediate memory purge upon job completion.'
    ],
    content: [
      {
        heading: 'Client-Side Execution vs Traditional Cloud Uploads',
        paragraphs: [
          'Many legacy PDF websites require every file to be uploaded to an external server, processed on remote virtual machines, and stored in cloud buckets for download links. This introduces privacy risks when handling tax records, medical documents, and NDAs.',
          'MakePDFRight leverages modern WebAssembly and client-side JavaScript (pdf-lib, pdfjs) to perform operations like merging, splitting, reordering, and rotating entirely on your computer or phone. Your document bytes never traverse third-party servers for these tasks.'
        ]
      },
      {
        heading: 'Handling Sensitive and Confidential Records',
        paragraphs: [
          'For tools requiring server-assisted transformation (such as complex Word generation or AI analysis), all transmission is protected by strict TLS 1.3 encryption, processed in short-lived memory buffers, and permanently purged immediately after generation.',
          'We never log, monetize, or train machine learning models on your uploaded personal documents.'
        ]
      }
    ],
    relatedTool: { name: 'Privacy Policy', path: '/privacy' }
  },
  {
    id: 'post-conversion-validation-checklist',
    title: 'The Post-Conversion Verification Checklist: 5 Quality Steps',
    category: 'conversion',
    readTime: '4 min read',
    summary: 'A 5-point verification routine to confirm page sequence, text fidelity, image resolution, and numerical calculations before sending critical files.',
    keyPoints: [
      'Step 1: Check total page count and verify no pages were dropped or duplicated.',
      'Step 2: Inspect vector logos, signature blocks, and embedded charts for visual clarity.',
      'Step 3: Sample 3 random paragraphs to confirm character encodings and spacing.',
      'Step 4: Verify hyperlinks, bookmarks, and form fields if interactive elements were expected.',
      'Step 5: Run a quick sum check on any financial or numerical spreadsheet columns.'
    ],
    content: [
      {
        heading: 'Why Verification Matters',
        paragraphs: [
          'Automated conversion and compression algorithms are highly capable, but complex source documents with custom embedded fonts or unusual coordinate transformations can occasionally introduce subtle formatting shifts.',
          'Spending 30 seconds running through this 5-point checklist guarantees that your client proposals, tax submissions, and legal filings are 100% accurate before submission.'
        ]
      }
    ],
    relatedTool: { name: 'All PDF Tools', path: '/' }
  }
];

export const guidePath = (id: string): string => `/guides/${id}`;
export const GUIDE_ROUTES = GUIDES.map(guide => guidePath(guide.id));
