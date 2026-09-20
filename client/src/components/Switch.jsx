import React from 'react';
import { Check, X } from 'lucide-react';

/**
 * Modern Accessible Toggle Switch Component
 * Replaces static toggle badges with a fluid interactive switch.
 *
 * @param {boolean} checked - Switch ON/OFF state
 * @param {function} onChange - Triggered on click/change
 * @param {boolean} disabled - Whether the switch is interactive
 * @param {string} activeText - Label text when active (default: 'Active')
 * @param {string} inactiveText - Label text when inactive (default: 'Deactivated')
 * @param {string} title - Hover tooltip
 */
const Switch = ({
  checked = false,
  onChange,
  disabled = false,
  activeText = 'Active',
  inactiveText = 'Deactivated',
  title,
  id,
  className = '',
}) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (onChange) onChange(!checked);
    }
  };

  return (
    <div
      className={`toggle-switch-wrapper ${className}`}
      title={title || (disabled ? 'Action disabled' : `Click to toggle to ${checked ? inactiveText : activeText}`)}
    >
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`toggle-switch ${checked ? 'active' : 'deactivated'}`}
      >
        <span className="toggle-switch-thumb">
          {checked ? (
            <Check size={10} style={{ color: 'var(--success)', strokeWidth: 3 }} />
          ) : (
            <X size={10} style={{ color: 'var(--danger)', strokeWidth: 3 }} />
          )}
        </span>
      </button>

      <span className={`toggle-switch-label ${checked ? 'active' : 'deactivated'}`}>
        <span
          className={`badge ${checked ? 'badge-success' : 'badge-danger'}`}
          style={{
            fontSize: '0.72rem',
            padding: '0.15rem 0.45rem',
            letterSpacing: '0.04em',
            pointerEvents: 'none',
          }}
        >
          {checked ? activeText : inactiveText}
        </span>
      </span>
    </div>
  );
};

export default Switch;
