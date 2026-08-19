// Tool chunk preloading utilities for instant cold-route transitions
const toolChunkLoaders: Record<string, () => Promise<any>> = {
  '/merge': () => import('../tools/MergeTool'),
  '/split': () => import('../tools/SplitTool'),
  '/compress': () => import('../tools/CompressTool'),
  '/edit': () => import('../tools/EditTool'),
  '/pdf-to-word': () => import('../tools/PDFToWordTool'),
  '/pdf-to-excel': () => import('../tools/PDFToExcelTool'),
  '/pdf-to-jpg': () => import('../tools/PDFToJPGTool'),
  '/image-to-pdf': () => import('../tools/ImageToPDFTool'),
  '/rotate': () => import('../tools/RotateTool'),
  '/organise': () => import('../tools/OrganiseTool'),
  '/generate-image': () => import('../tools/ImageGenTool'),
  '/transcribe': () => import('../tools/AudioTranscribeTool'),
};

const preloadedPaths = new Set<string>();

/**
 * Prefetches the code chunk for a given tool route on hover/focus.
 */
export function preloadTool(path: string) {
  // Normalize path by checking prefix / exact match
  const base = Object.keys(toolChunkLoaders).find(key => 
    path === key || path.startsWith(key + '-') || (key === '/edit' && path.startsWith('/edit-'))
  );
  
  const targetKey = base || path;
  if (!preloadedPaths.has(targetKey) && toolChunkLoaders[targetKey]) {
    preloadedPaths.add(targetKey);
    // Use requestIdleCallback or immediate execution
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        toolChunkLoaders[targetKey]().catch(() => {});
      });
    } else {
      setTimeout(() => {
        toolChunkLoaders[targetKey]().catch(() => {});
      }, 0);
    }
  }
}

/**
 * Preloads the top 4 most frequently accessed tool routes during idle time.
 */
export function preloadPriorityTools() {
  if (typeof window === 'undefined') return;
  
  const priorityRoutes = ['/compress', '/merge', '/split', '/edit'];
  const runPreload = () => {
    priorityRoutes.forEach((route, index) => {
      setTimeout(() => {
        preloadTool(route);
      }, index * 200);
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => runPreload(), { timeout: 3000 });
  } else {
    setTimeout(runPreload, 1500);
  }
}
