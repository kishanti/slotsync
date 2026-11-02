import React from 'react';

export default function Alert({ message, type = 'danger', onClose }) {
  if (!message) return null;

  return (
    <div className={`alert alert-${type} alert-dismissible`} role="alert">
      {message}
      {onClose && (
        <button type="button" className="btn-close" onClick={onClose} />
      )}
    </div>
  );
}
