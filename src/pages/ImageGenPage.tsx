/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { ToolPageShell } from '../components/common/ToolPageShell';
import { ToolSkeleton } from '../components/common/ToolSkeleton';

const ImageGenTool = lazy(() => import('../tools/ImageGenTool').then(m => ({ default: m.ImageGenTool })));

export const ImageGenPage: React.FC = () => {
  return (
    <ToolPageShell
      title="AI Image Generator"
      description="Transform descriptive text prompts into high-resolution visuals, concepts, and document graphics with Google Gemini AI."
    >
      <Suspense fallback={<ToolSkeleton toolName="AI Image Generator" />}>
        <ImageGenTool />
      </Suspense>
    </ToolPageShell>
  );
};
