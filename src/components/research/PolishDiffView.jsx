import React, { useMemo } from 'react';
import { diffWords } from '../../utils/textDiff';

const PlainColumn = ({ label, text }) => (
  <div className="ai-polish-diff-column">
    <div className="ai-polish-diff-column-label">{label}</div>
    <div className="ai-polish-diff-panel" dir="auto">
      {text?.trim() ? text : <span className="ai-polish-diff-empty">—</span>}
    </div>
  </div>
);

const DiffColumn = ({ label, segments, changedClassName }) => (
  <div className="ai-polish-diff-column">
    <div className="ai-polish-diff-column-label">{label}</div>
    <div className="ai-polish-diff-panel" dir="auto">
      {segments.length === 0 ? (
        <span className="ai-polish-diff-empty">—</span>
      ) : (
        segments.map((segment, index) => (
          <span
            key={`${segment.text}-${index}`}
            className={segment.type === 'changed' ? changedClassName : undefined}
          >
            {segment.text}
            {index < segments.length - 1 ? ' ' : ''}
          </span>
        ))
      )}
    </div>
  </div>
);

const PolishDiffView = ({
  originalText,
  revisedText,
  originalLabel,
  revisedLabel,
  legend,
  highlightChanges = true,
}) => {
  const { oldSegments, newSegments, hasChanges } = useMemo(
    () => (highlightChanges ? diffWords(originalText, revisedText) : { oldSegments: [], newSegments: [], hasChanges: false }),
    [originalText, revisedText, highlightChanges]
  );

  if (!highlightChanges) {
    return (
      <div className="ai-polish-diff-wrap">
        <div className="ai-polish-compare-grid">
          <PlainColumn label={originalLabel} text={originalText} />
          <PlainColumn label={revisedLabel} text={revisedText} />
        </div>
      </div>
    );
  }

  return (
    <div className="ai-polish-diff-wrap">
      {hasChanges && legend ? (
        <p className="ai-polish-diff-legend">{legend}</p>
      ) : null}
      <div className="ai-polish-compare-grid">
        <DiffColumn
          label={originalLabel}
          segments={oldSegments}
          changedClassName="ai-polish-diff-removed"
        />
        <DiffColumn
          label={revisedLabel}
          segments={newSegments}
          changedClassName="ai-polish-diff-changed"
        />
      </div>
    </div>
  );
};

export default PolishDiffView;
