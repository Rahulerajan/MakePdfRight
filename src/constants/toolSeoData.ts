import { ToolSEOData } from '../components/seo/ToolSEOContent';

export const TOOL_SEO_CONTENT_MAP: Record<string, ToolSEOData> = {
  '/merge': {
    toolName: 'Merge PDF',
    category: 'PDF Tools',
    overview: 'MakePDFRight Merge PDF lets you combine multiple PDF documents into a single, cohesive file in seconds. Drag and drop your PDFs, arrange the files in your preferred sequence, and download your consolidated document with zero quality loss.',
    howItWorks: [
      { step: 1, title: 'Upload PDF Files', desc: 'Select or drag and drop multiple PDF documents from your computer, smartphone, or cloud storage.' },
      { step: 2, title: 'Reorder Files', desc: 'Drag and drop file cards into your exact desired order. You can add or remove files anytime.' },
      { step: 3, title: 'Merge & Download', desc: 'Click "Merge PDF" to combine all files. Your new unified PDF document is generated instantly.' }
    ],
    benefits: [
      { title: 'Preserves Original Quality', desc: 'Vectors, typography, embeds, and image quality remain completely crisp and unaltered.' },
      { title: 'Client-First Security', desc: 'Your files are processed securely in short-lived memory and auto-purged within minutes.' },
      { title: 'Unlimited File Count', desc: 'Combine as many PDFs as you need without artificial page caps or watermark penalties.' },
      { title: 'Cross-Device Compatible', desc: 'Works seamlessly across Windows, macOS, iOS, Android, and Linux browsers.' }
    ],
    useCases: [
      'Combining monthly bank statements or receipts for tax filing',
      'Merging job application resumes, cover letters, and portfolio PDFs',
      'Bundling research papers or chapters into a master eBook',
      'Consolidating scanned contract pages into a single legal document'
    ],
    faqs: [
      { question: 'Is the Merge PDF tool completely free to use?', answer: 'Yes! MakePDFRight Merge PDF is 100% free with no registration, software installation, or credit card required.' },
      { question: 'Are my uploaded PDF files safe and confidential?', answer: 'Absolutely. All files uploaded to MakePDFRight are encrypted using SSL during transfer and automatically deleted from our secure servers shorty after processing.' },
      { question: 'Can I reorder pages or files before merging?', answer: 'Yes, our visual interface lets you drag and reorder your files before initiating the merge process.' }
    ],
    relatedTools: [
      { name: 'Split PDF', path: '/split', desc: 'Separate or extract specific pages from a large PDF document.' },
      { name: 'Compress PDF', path: '/compress', desc: 'Shrink file size for easy emailing and storage.' },
      { name: 'Organize PDF', path: '/organise', desc: 'Reorder, rotate, or delete individual pages within a PDF.' }
    ]
  },
  '/split': {
    toolName: 'Split PDF',
    category: 'PDF Tools',
    overview: 'Quickly extract individual pages, page ranges, or split an entire PDF document into separate standalone PDF files. Ideal for separating contracts, removing unwanted pages, or extracting specific chapters.',
    howItWorks: [
      { step: 1, title: 'Upload Your PDF', desc: 'Upload the PDF document you wish to split or extract pages from.' },
      { step: 2, title: 'Choose Page Ranges', desc: 'Select specific page numbers or split mode (e.g. page ranges, single pages, or custom selections).' },
      { step: 3, title: 'Extract & Save', desc: 'Download your extracted pages as individual PDF files or a bundled ZIP archive.' }
    ],
    benefits: [
      { title: 'Precise Page Selection', desc: 'Extract exact page numbers (e.g. 1-3, 5, 8-12) or split every single page.' },
      { title: 'Fast Rendering', desc: 'Instant page thumbnails let you visually inspect before splitting.' },
      { title: 'Zero Quality Loss', desc: 'Text formatting, images, and fonts remain pixel-perfect.' },
      { title: 'Private & Secure', desc: 'Files are processed in isolated sessions and auto-deleted automatically.' }
    ],
    useCases: [
      'Extracting specific chapters or contract clauses from long agreements',
      'Removing unnecessary cover pages or blank pages',
      'Splitting multi-page invoices into separate files for accounting'
    ],
    faqs: [
      { question: 'Can I split password-protected PDFs?', answer: 'If you know the password, you can unlock and split the file seamlessly.' },
      { question: 'How many pages can I extract at once?', answer: 'There is no limit on page count. You can extract individual pages or whole ranges.' }
    ],
    relatedTools: [
      { name: 'Merge PDF', path: '/merge', desc: 'Combine extracted pages back into a single document.' },
      { name: 'Rotate PDF', path: '/rotate', desc: 'Fix page orientation for extracted PDF documents.' }
    ]
  },
  '/compress': {
    toolName: 'Compress PDF',
    category: 'PDF Tools',
    overview: 'Reduce PDF file size significantly without sacrificing readable text or visual clarity. MakePDFRight optimizes vector paths, downsamples oversized images, and cleans redundant metadata streams.',
    howItWorks: [
      { step: 1, title: 'Upload PDF File', desc: 'Drop your heavy or oversized PDF document into the upload area.' },
      { step: 2, title: 'Select Compression Level', desc: 'Choose between Recommended, Extreme, or Less compression depending on your needs.' },
      { step: 3, title: 'Download Compact PDF', desc: 'Get your compressed PDF immediately with exact space saved metrics displayed.' }
    ],
    benefits: [
      { title: 'Smart Image Optimization', desc: 'Re-encodes embedded images intelligently to maximize disk space savings.' },
      { title: 'Email-Ready Files', desc: 'Easily get large PDFs under 10MB or 25MB attachment limits.' },
      { title: 'Instant Preview', desc: 'Displays exact file size reduction and percentage saved.' }
    ],
    useCases: [
      'Compressing scanned documents for email attachments',
      'Reducing PDF manual sizes for mobile reading and fast website downloads',
      'Optimizing portfolio PDFs before submitting to online job portals'
    ],
    faqs: [
      { question: 'Will compressing my PDF affect text quality?', answer: 'No! Text vectors and fonts remain 100% sharp. Only high-resolution bitmap images are optimized.' },
      { question: 'How much file size reduction can I expect?', answer: 'Depending on embedded image resolution, compression typically reduces file size by 30% to 80%.' }
    ],
    relatedTools: [
      { name: 'PDF to JPG', path: '/pdf-to-jpg', desc: 'Convert PDF pages directly into compressed JPG images.' },
      { name: 'Edit PDF', path: '/edit', desc: 'Add text and annotations to your compressed PDF.' }
    ]
  },
  '/pdf-to-word': {
    toolName: 'PDF to Word',
    category: 'Convert',
    overview: 'Convert PDF documents into editable Microsoft Word (.docx) documents. Preserve document layout, headings, paragraphs, and tables for hassle-free editing.',
    howItWorks: [
      { step: 1, title: 'Upload PDF', desc: 'Select the PDF file you want to convert into Word.' },
      { step: 2, title: 'Automatic Conversion', desc: 'Our conversion engine extracts text elements, structure, and formatting.' },
      { step: 3, title: 'Download DOCX', desc: 'Save your editable Word document directly to your device.' }
    ],
    benefits: [
      { title: 'Editable Text & Tables', desc: 'Turns static PDF text into fully customizable Word text blocks.' },
      { title: 'High Layout Retention', desc: 'Keeps font styles, alignments, lists, and spacing intact.' },
      { title: 'Free & Fast', desc: 'No email required, download your converted .docx file right away.' }
    ],
    useCases: [
      'Editing older PDF documents where source Word files were lost',
      'Updating resumes, letters, or policies saved only in PDF format',
      'Extracting editable quotes and clauses for legal drafting'
    ],
    faqs: [
      { question: 'Is the converted Word document editable in Microsoft Word?', answer: 'Yes! The output is a standard .docx file editable in MS Word, Google Docs, or LibreOffice.' }
    ],
    relatedTools: [
      { name: 'PDF to Excel', path: '/pdf-to-excel', desc: 'Extract financial tables and spreadsheets from PDF to XLSX.' },
      { name: 'Edit PDF', path: '/edit', desc: 'Edit PDF directly in browser without converting to Word.' }
    ]
  },
  '/pdf-to-excel': {
    toolName: 'PDF to Excel',
    category: 'Convert',
    overview: 'Extract tables, numerical grids, and financial statements from PDF files into organized Microsoft Excel (.xlsx) spreadsheets.',
    howItWorks: [
      { step: 1, title: 'Upload PDF File', desc: 'Select a PDF containing tables or numerical data.' },
      { step: 2, title: 'Extract Tables', desc: 'Automated table detection identifies rows, columns, and numeric cell values.' },
      { step: 3, title: 'Download XLSX', desc: 'Save as an openable spreadsheet ready for data analysis.' }
    ],
    benefits: [
      { title: 'Accurate Column Alignment', desc: 'Separates table data into distinct, editable spreadsheet cells.' },
      { title: 'Saves Hours of Data Entry', desc: 'Eliminates manual typing of receipts, invoices, and audit reports.' }
    ],
    useCases: [
      'Converting PDF bank statements into Excel for budgeting',
      'Importing PDF sales reports into financial models',
      'Extracting scientific survey data tables into spreadsheets'
    ],
    faqs: [
      { question: 'Does this tool support scanned table PDFs?', answer: 'Yes! Our built-in OCR engine recognizes characters inside scanned image tables.' }
    ],
    relatedTools: [
      { name: 'PDF to Word', path: '/pdf-to-word', desc: 'Convert entire document text to editable Word files.' }
    ]
  },
  '/pdf-to-jpg': {
    toolName: 'PDF to JPG',
    category: 'Convert',
    overview: 'Convert each page of a PDF document into a high-definition JPG image file. Download individual image pages or a convenient ZIP archive.',
    howItWorks: [
      { step: 1, title: 'Select PDF File', desc: 'Upload the PDF file you wish to turn into images.' },
      { step: 2, title: 'Render Pages', desc: 'High-speed canvas renderer turns each PDF page into crisp JPG graphics.' },
      { step: 3, title: 'Download Images', desc: 'Download selected pages or all pages as a ZIP file.' }
    ],
    benefits: [
      { title: 'Ultra High Resolution', desc: 'Renders crisp text and images suitable for printing or presentations.' },
      { title: 'ZIP Download Option', desc: 'Download all converted pages bundled cleanly in one click.' }
    ],
    useCases: [
      'Posting PDF flyer pages or infographics on social media',
      'Inserting PDF diagrams into PowerPoint presentations'
    ],
    faqs: [
      { question: 'Are the images high resolution?', answer: 'Yes, images are generated at standard 300 DPI equivalent quality.' }
    ],
    relatedTools: [
      { name: 'Image to PDF', path: '/image-to-pdf', desc: 'Convert JPG or PNG images back into a unified PDF.' }
    ]
  },
  '/image-to-pdf': {
    toolName: 'Image to PDF',
    category: 'Convert',
    overview: 'Convert JPG, PNG, WEBP, and BMP images into a beautifully formatted PDF document. Adjust margins, page orientation, and image order.',
    howItWorks: [
      { step: 1, title: 'Upload Photos / Images', desc: 'Select one or multiple image files from your device.' },
      { step: 2, title: 'Arrange & Adjust', desc: 'Reorder images and pick portrait or landscape mode.' },
      { step: 3, title: 'Create PDF', desc: 'Generate and download your newly compiled PDF document.' }
    ],
    benefits: [
      { title: 'Multi-Format Support', desc: 'Supports JPG, JPEG, PNG, WEBP, and GIF image files.' },
      { title: 'Custom Orientation', desc: 'Automatic or manual page orientation matching.' }
    ],
    useCases: [
      'Converting photos of notes or whiteboards into a single PDF document',
      'Creating digital photo portfolios or catalog PDFs from image files'
    ],
    faqs: [
      { question: 'Can I combine multiple JPG files into one PDF?', answer: 'Yes, you can upload dozens of photos and combine them into a single PDF.' }
    ],
    relatedTools: [
      { name: 'PDF to JPG', path: '/pdf-to-jpg', desc: 'Extract JPG images from your PDF files.' }
    ]
  },
  '/edit': {
    toolName: 'Edit PDF',
    category: 'Edit',
    overview: 'An intuitive online PDF editor. Add custom text boxes, digital signatures, images, highlights, shapes, and annotations directly to your PDF.',
    howItWorks: [
      { step: 1, title: 'Upload PDF Document', desc: 'Open your PDF document in our feature-packed editor.' },
      { step: 2, title: 'Annotate & Edit', desc: 'Use text, drawing tools, signatures, and image inserts.' },
      { step: 3, title: 'Save & Export', desc: 'Download your updated PDF with all modifications embedded.' }
    ],
    benefits: [
      { title: 'Full Annotation Suite', desc: 'Text, freehand drawing, highlights, shapes, and e-signatures.' },
      { title: 'Browser-First Speed', desc: 'No bulky desktop software required.' }
    ],
    useCases: [
      'Filling out PDF forms and signing contracts digitally',
      'Adding approval stamps, notes, or highlighting key text'
    ],
    faqs: [
      { question: 'Can I add my signature to a PDF?', answer: 'Yes! Draw or upload your digital signature and place it anywhere on the document.' }
    ],
    relatedTools: [
      { name: 'Rotate PDF', path: '/rotate', desc: 'Rotate document pages before editing.' }
    ]
  },
  '/rotate': {
    toolName: 'Rotate PDF',
    category: 'PDF Tools',
    overview: 'Rotate upside-down or sideways PDF pages clockwise or counter-clockwise by 90°, 180°, or 270° and save them permanently.',
    howItWorks: [
      { step: 1, title: 'Upload PDF', desc: 'Choose the PDF file with misoriented pages.' },
      { step: 2, title: 'Rotate Pages', desc: 'Rotate all pages or click individual thumbnails to fix orientation.' },
      { step: 3, title: 'Save File', desc: 'Download your correctly oriented PDF document.' }
    ],
    benefits: [
      { title: 'Permanent Rotation', desc: 'Saves page orientation permanently into the PDF file structure.' }
    ],
    useCases: [
      'Fixing sideways scanned pages or upside-down mobile document scans'
    ],
    faqs: [
      { question: 'Can I rotate only a specific page in a large PDF?', answer: 'Yes, you can select and rotate individual pages independently.' }
    ],
    relatedTools: [
      { name: 'Organize PDF', path: '/organise', desc: 'Reorder, delete, and manage PDF pages.' }
    ]
  },
  '/organise': {
    toolName: 'Organize PDF',
    category: 'PDF Tools',
    overview: 'Easily reorder, delete, rotate, and manage PDF pages with intuitive drag-and-drop page visualizers.',
    howItWorks: [
      { step: 1, title: 'Upload PDF', desc: 'Load your PDF into the interactive page grid.' },
      { step: 2, title: 'Reorder & Delete', desc: 'Drag thumbnails to reorder or click the trash icon to delete unwanted pages.' },
      { step: 3, title: 'Save Organized PDF', desc: 'Export your newly structured PDF document.' }
    ],
    benefits: [
      { title: 'Visual Grid Preview', desc: 'See all page thumbnails clearly before finalizing structure.' }
    ],
    useCases: [
      'Deleting blank pages or reordering chapters in large reports'
    ],
    faqs: [
      { question: 'Can I delete pages from a PDF?', answer: 'Yes, simply hover over any page thumbnail and click delete.' }
    ],
    relatedTools: [
      { name: 'Merge PDF', path: '/merge', desc: 'Combine multiple PDFs into one.' }
    ]
  },
  '/generate-image': {
    toolName: 'AI Image Generator',
    category: 'AI Tools',
    overview: 'Turn natural language text descriptions into high-resolution, artistic visual images using cutting-edge Gemini AI models.',
    howItWorks: [
      { step: 1, title: 'Enter Prompt', desc: 'Describe the scene, subject, style, or visual artwork you want to create.' },
      { step: 2, title: 'Choose Aspect Ratio', desc: 'Select 1:1, 16:9 widescreen, 4:3, or vertical portrait dimensions.' },
      { step: 3, title: 'Generate & Download', desc: 'Watch AI render your image in seconds and download in high quality.' }
    ],
    benefits: [
      { title: 'High Visual Fidelity', desc: 'Produces detailed lighting, realistic textures, and artistic styles.' },
      { title: 'Instant Download', desc: 'Save generated images directly as PNG or JPG graphics.' }
    ],
    useCases: [
      'Generating custom illustrations for blog posts, presentations, and eBooks',
      'Creating concept artwork, avatars, and social media banners'
    ],
    faqs: [
      { question: 'Are generated images free to use commercially?', answer: 'Yes! Images generated through our AI model can be downloaded and used freely.' }
    ],
    relatedTools: [
      { name: 'Audio Transcription', path: '/transcribe', desc: 'Convert audio recordings to text with AI.' }
    ]
  },
  '/transcribe': {
    toolName: 'Audio Transcription',
    category: 'AI Tools',
    overview: 'Convert speech, voice notes, lectures, and audio files into accurate written text transcripts instantly using Google Gemini AI.',
    howItWorks: [
      { step: 1, title: 'Upload Audio', desc: 'Drop MP3, WAV, M4A, or AAC audio files.' },
      { step: 2, title: 'AI Processing', desc: 'Gemini AI transcribes speech with automatic punctuation and formatting.' },
      { step: 3, title: 'Copy or Download', desc: 'Copy the transcript or export as a formatted text file.' }
    ],
    benefits: [
      { title: 'High Accuracy Speech Recognition', desc: 'Handles accents, background noise, and specialized terminology.' }
    ],
    useCases: [
      'Transcribing recorded interviews, podcasts, meeting notes, and lectures'
    ],
    faqs: [
      { question: 'What audio formats are supported?', answer: 'We support MP3, WAV, M4A, AAC, WEBP, and OGG audio recordings.' }
    ],
    relatedTools: [
      { name: 'AI Image Generator', path: '/generate-image', desc: 'Generate images from text prompts.' }
    ]
  }
};
