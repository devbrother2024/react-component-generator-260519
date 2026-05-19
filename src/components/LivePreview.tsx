import { useState } from 'react';
import { LiveProvider, LivePreview as ReactLivePreview, LiveError } from 'react-live';

type Viewport = 'mobile' | 'tablet' | 'desktop';

const VIEWPORTS: { id: Viewport; label: string; width: string; hint: string }[] = [
  { id: 'mobile', label: '모바일', width: '375px', hint: '375px' },
  { id: 'tablet', label: '태블릿', width: '768px', hint: '768px' },
  { id: 'desktop', label: '데스크탑', width: '100%', hint: '전체 너비' },
];

interface LivePreviewProps {
  code: string;
}

export function LivePreview({ code }: LivePreviewProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const currentViewport = VIEWPORTS.find((v) => v.id === viewport)!;

  return (
    <div className="preview-panel">
      <div className="panel-header">
        <h3>미리보기</h3>
        <div className="viewport-switcher">
          {VIEWPORTS.map((v) => (
            <button
              key={v.id}
              className={`btn-viewport ${viewport === v.id ? 'btn-viewport--active' : ''}`}
              onClick={() => setViewport(v.id)}
              title={v.hint}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="preview-content">
        <LiveProvider code={code} noInline>
          <div className="preview-render">
            <div
              className="preview-viewport-frame"
              style={{ maxWidth: currentViewport.width }}
            >
              <ReactLivePreview />
            </div>
          </div>
          <LiveError className="preview-error" />
        </LiveProvider>
      </div>
    </div>
  );
}
