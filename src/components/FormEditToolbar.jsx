import React from 'react';
import './FormEditToolbar.css';

const FormEditToolbar = ({
  visible,
  onCancelEdit,
  onDelete,
  showDelete,
  deleting,
  deleteLabel,
  t,
}) => {
  if (!visible) return null;

  return (
    <div className="form-edit-toolbar">
      <button
        type="button"
        className="btn-cancel-edit"
        onClick={onCancelEdit}
        disabled={deleting}
      >
        {t('cancelEdit', 'ביטול עריכה')}
      </button>
      {showDelete && (
        <button
          type="button"
          className="btn-delete"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? t('deleting', 'מוחק...') : deleteLabel}
        </button>
      )}
    </div>
  );
};

export default FormEditToolbar;
