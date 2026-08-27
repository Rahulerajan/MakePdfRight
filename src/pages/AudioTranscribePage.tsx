/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { ToolPageShell } from '../components/common/ToolPageShell';
import { ToolSkeleton } from '../components/common/ToolSkeleton';

const AudioTranscribeTool = lazy(() => import('../tools/AudioTranscribeTool').then(m => ({ default: m.AudioTranscribeTool })));

export const AudioTranscribePage: React.FC = () => {
  return (
    <ToolPageShell
      title="Audio Transcribe"
      description="Transcribe voice recordings, dictations, interviews, and audio files into accurate, searchable text with Gemini AI."
    >
      <Suspense fallback={<ToolSkeleton toolName="Audio Transcribe" />}>
        <AudioTranscribeTool />
      </Suspense>
    </ToolPageShell>
  );
};
