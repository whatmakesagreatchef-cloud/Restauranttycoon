/**
 * UI COMPONENTS MODULE
 * Reusable UI components and utilities
 */

/**
 * Toast notification system
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Animate in
  setTimeout(() => toast.classList.add('toast--show'), 10);
  
  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('toast--show');
    setTimeout(() => container.removeChild(toast), 300);
  }, duration);
}

/**
 * Format currency
 */
export function formatCurrency(amount) {
  return '$' + Math.round(amount).toLocaleString();
}

/**
 * Format number with suffix (K, M, B)
 */
export function formatNumber(num) {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Format percentage
 */
export function formatPercent(value) {
  return (value * 100).toFixed(1) + '%';
}

/**
 * Create button component
 */
export function createButton(text, onClick, style = 'primary', icon = null) {
  const iconHtml = icon ? `<span class="btn__icon">${icon}</span>` : '';
  return `
    <button class="btn btn--${style}" onclick="${onClick}">
      ${iconHtml}
      <span class="btn__text">${text}</span>
    </button>
  `;
}

/**
 * Create card component
 */
export function createCard(title, content, actions = null) {
  const actionsHtml = actions ? `<div class="card__actions">${actions}</div>` : '';
  return `
    <div class="card">
      <div class="card__header">
        <h3 class="card__title">${title}</h3>
      </div>
      <div class="card__body">
        ${content}
      </div>
      ${actionsHtml}
    </div>
  `;
}

/**
 * Create stat display
 */
export function createStat(label, value, trend = null) {
  const trendHtml = trend ? `
    <span class="stat__trend stat__trend--${trend > 0 ? 'up' : 'down'}">
      ${trend > 0 ? '↑' : '↓'} ${Math.abs(trend)}%
    </span>
  ` : '';
  
  return `
    <div class="stat">
      <div class="stat__label">${label}</div>
      <div class="stat__value">${value}</div>
      ${trendHtml}
    </div>
  `;
}

/**
 * Create progress bar
 */
export function createProgressBar(value, max, label = null) {
  const percent = (value / max) * 100;
  const labelHtml = label ? `<div class="progress__label">${label}</div>` : '';
  
  return `
    <div class="progress">
      ${labelHtml}
      <div class="progress__bar">
        <div class="progress__fill" style="width: ${percent}%"></div>
      </div>
      <div class="progress__text">${value} / ${max}</div>
    </div>
  `;
}

/**
 * Create modal dialog
 */
export function showModal(title, content, actions) {
  const existingModal = document.querySelector('.modal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal__overlay" onclick="this.parentElement.remove()"></div>
    <div class="modal__content">
      <div class="modal__header">
        <h2 class="modal__title">${title}</h2>
        <button class="modal__close" onclick="this.closest('.modal').remove()">✕</button>
      </div>
      <div class="modal__body">
        ${content}
      </div>
      <div class="modal__footer">
        ${actions}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('modal--show'), 10);
}

/**
 * Create confirmation dialog
 */
export function showConfirm(title, message, onConfirm, onCancel = null) {
  showModal(
    title,
    `<p>${message}</p>`,
    `
      <button class="btn btn--secondary" onclick="this.closest('.modal').remove(); ${onCancel ? onCancel : ''}()">
        Cancel
      </button>
      <button class="btn btn--primary" onclick="this.closest('.modal').remove(); (${onConfirm})()">
        Confirm
      </button>
    `
  );
}

/**
 * Create loading spinner
 */
export function showLoading(message = 'Loading...') {
  return `
    <div class="loading">
      <div class="loading__spinner"></div>
      <div class="loading__text">${message}</div>
    </div>
  `;
}

/**
 * Create empty state
 */
export function showEmptyState(icon, title, message, action = null) {
  const actionHtml = action ? `<div class="empty__action">${action}</div>` : '';
  return `
    <div class="empty">
      <div class="empty__icon">${icon}</div>
      <h3 class="empty__title">${title}</h3>
      <p class="empty__message">${message}</p>
      ${actionHtml}
    </div>
  `;
}

/**
 * Create badge
 */
export function createBadge(text, type = 'default') {
  return `<span class="badge badge--${type}">${text}</span>`;
}

/**
 * Create icon button
 */
export function createIconButton(icon, onClick, tooltip = null) {
  const tooltipAttr = tooltip ? `title="${tooltip}"` : '';
  return `
    <button class="btn-icon" onclick="${onClick}" ${tooltipAttr}>
      ${icon}
    </button>
  `;
}

/**
 * Create tabs component
 */
export function createTabs(tabs, activeTab, onTabChange) {
  const tabButtons = tabs.map(tab => `
    <button class="tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}"
            onclick="${onTabChange}('${tab.id}')">
      ${tab.label}
    </button>
  `).join('');
  
  return `
    <div class="tabs">
      <div class="tabs__nav">${tabButtons}</div>
    </div>
  `;
}

/**
 * Create star rating display
 */
export function createStarRating(rating, maxRating = 5) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);
  
  let html = '<div class="star-rating">';
  
  for (let i = 0; i < fullStars; i++) {
    html += '<span class="star star--full">★</span>';
  }
  
  if (hasHalfStar) {
    html += '<span class="star star--half">★</span>';
  }
  
  for (let i = 0; i < emptyStars; i++) {
    html += '<span class="star star--empty">☆</span>';
  }
  
  html += `<span class="star-rating__text">${rating.toFixed(1)}</span>`;
  html += '</div>';
  
  return html;
}

/**
 * Create list item
 */
export function createListItem(title, subtitle, action = null, icon = null) {
  const iconHtml = icon ? `<div class="list-item__icon">${icon}</div>` : '';
  const actionHtml = action ? `<div class="list-item__action">${action}</div>` : '';
  
  return `
    <div class="list-item">
      ${iconHtml}
      <div class="list-item__content">
        <div class="list-item__title">${title}</div>
        ${subtitle ? `<div class="list-item__subtitle">${subtitle}</div>` : ''}
      </div>
      ${actionHtml}
    </div>
  `;
}

/**
 * Format time duration
 */
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format date
 */
export function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(timestamp);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Sanitize HTML
 */
export function sanitizeHTML(html) {
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}
