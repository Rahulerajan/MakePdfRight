import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/constants/toolSeoData.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const replacements: [RegExp, string][] = [
  [/100% free and private/gi, 'Free and privacy-conscious'],
  [/100% free & private/gi, 'Free & Privacy-Conscious'],
  [/100% free and secure/gi, 'Free and secure'],
  [/100% free & secure/gi, 'Free & Secure'],
  [/100% free online tool/gi, 'Free online tool'],
  [/100% free forever/gi, 'Free to use'],
  [/100% free & unlimited/gi, 'Free & Unlimited'],
  [/100% free/gi, 'Free to use'],
  [/100% privacy/gi, 'Strong document privacy'],
  [/100% private/gi, 'Privacy-conscious'],
  [/100% original resolution/gi, 'Original Resolution'],
  [/100% original quality/gi, 'Original Quality'],
  [/100% original/gi, 'Original'],
  [/100% vector-sharp/gi, 'Vector-sharp'],
  [/100% vector/gi, 'Vector'],
  [/100% crisp/gi, 'Crisp'],
  [/100% sharp/gi, 'Sharp'],
  [/100% untouched/gi, 'Untouched'],
  [/100% pixel-perfect/gi, 'High-fidelity'],
  [/100% fidelity/gi, 'High fidelity'],
  [/100% identical/gi, 'High fidelity'],
  [/100% inside Safari/gi, 'Directly inside Safari'],
  [/zero formula corruption/gi, 'High data integrity'],
  [/sub-100ms fcp/gi, 'Fast initial render'],
  [/zero permanent server storage/gi, 'Automatic 15-minute temporary file deletion'],
  [/zero permanent storage/gi, 'Isolated temporary storage with automatic 15-minute deletion'],
  [/never permanently stored/gi, 'Temporarily processed and automatically deleted within 15 minutes'],
  [/never leave your device/gi, 'Processed in isolated memory or client-side'],
  [/without losing quality/gi, 'with high fidelity'],
  [/without quality loss/gi, 'with high fidelity'],
  [/zero quality loss/gi, 'high visual fidelity'],
  [/lossless stream-extraction/gi, 'Direct stream-extraction'],
  [/lossless PDF Merger/gi, 'High-Fidelity PDF Merger'],
  [/lossless merge process/gi, 'High-fidelity merge process'],
  [/lossless engine/gi, 'Direct extraction engine'],
  [/guaranteeing 100%/gi, 'maintaining high'],
  [/Combine PDFs without quality loss/gi, 'Combine PDFs with high fidelity']
];

for (const [regex, replacement] of replacements) {
  content = content.replace(regex, replacement);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully sanitized claims in src/constants/toolSeoData.ts');
