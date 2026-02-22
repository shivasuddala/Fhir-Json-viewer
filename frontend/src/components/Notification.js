import React from 'react';
import '../styles/components/Notification.css';

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function Notification({ message, type = 'success', onDismiss }) {
  return (
    <div className={`notification notification-${type}`}>
      <span className="notif-icon">{icons[type] || icons.info}</span>
      <span className="notif-message">{message}</span>
      {onDismiss && (
        <button className="notif-close" onClick={onDismiss}>×</button>
      )}
    </div>
  );
}

export default Notification;

