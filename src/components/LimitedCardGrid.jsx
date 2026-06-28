import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { useGridColumnCount } from '../hooks/useGridColumnCount';

const LimitedCardGrid = ({
  items = [],
  maxRows = 3,
  minColumnWidth = 280,
  gap = 25,
  getItemKey = (item) => item.id,
  renderItem,
  addCard = null,
  showAllModalTitle,
  showAllLabel,
  className = 'research-grid',
  modalClassName = 'research-grid limited-card-grid-modal-grid',
}) => {
  const { t } = useLanguage();
  const gridRef = useRef(null);
  const columns = useGridColumnCount(gridRef, { minColumnWidth, gap });
  const [showAllOpen, setShowAllOpen] = useState(false);

  const { visibleItems, hasOverflow } = useMemo(() => {
    const maxSlots = columns * maxRows;
    const addSlotCount = addCard ? 1 : 0;
    const maxItemsWithoutShowAll = Math.max(0, maxSlots - addSlotCount);
    const overflow = items.length > maxItemsWithoutShowAll;
    const visibleCount = overflow
      ? Math.max(0, maxItemsWithoutShowAll - 1)
      : items.length;

    return {
      visibleItems: items.slice(0, visibleCount),
      hasOverflow: overflow,
    };
  }, [items, columns, maxRows, addCard]);

  const resolvedShowAllLabel = showAllLabel || t('showAll', 'הצג הכל');

  return (
    <>
      <div ref={gridRef} className={className}>
        {addCard}
        {visibleItems.map((item) => (
          <React.Fragment key={getItemKey(item)}>
            {renderItem(item)}
          </React.Fragment>
        ))}
        {hasOverflow && (
          <button
            type="button"
            className="research-card show-all-card"
            onClick={() => setShowAllOpen(true)}
          >
            <h3 className="add-research-title">{resolvedShowAllLabel}</h3>
            <p className="show-all-count">
              {t('showAllCount', '{count} פריטים').replace('{count}', String(items.length))}
            </p>
          </button>
        )}
      </div>

      {showAllOpen &&
        createPortal(
          <div
            className="limited-card-grid-modal-overlay"
            onClick={() => setShowAllOpen(false)}
            role="presentation"
          >
            <div
              className="limited-card-grid-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="limited-card-grid-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="limited-card-grid-modal-header">
                <h3 id="limited-card-grid-modal-title">{showAllModalTitle}</h3>
                <button
                  type="button"
                  className="limited-card-grid-modal-close"
                  onClick={() => setShowAllOpen(false)}
                  aria-label={t('close', 'סגור')}
                >
                  ×
                </button>
              </div>
              <div className="limited-card-grid-modal-body">
                <div className={modalClassName}>
                  {items.map((item) => (
                    <React.Fragment key={getItemKey(item)}>
                      {renderItem(item, { inModal: true, closeModal: () => setShowAllOpen(false) })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default LimitedCardGrid;
