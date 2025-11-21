'use client';

import { useProactiveAI } from '@/hooks/useProactiveAI';
import { useReminders } from '@/hooks/useReminders';
import { useNotifications } from '@/hooks/useNotifications';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const { enabled: proactiveEnabled, toggleProactiveAI } = useProactiveAI();
  const { reminders, deleteReminder } = useReminders();
  const { permission } = useNotifications();

  if (!isOpen) return null;

  return (
    <div
      className="search-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1001 }}
    >
      <div
        className="search-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px' }}
      >
        <div className="search-modal-header">
          <h3 className="search-modal-title">Settings</h3>
          <button
            className="search-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Notifications Status */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: 'var(--gray-med)', fontWeight: 600, marginBottom: '12px' }}>
              Notifications
            </h4>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: permission === 'granted' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                border: `1px solid ${permission === 'granted' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: permission === 'granted' ? '#4CAF50' : '#FF9800',
                  }}
                />
                <span style={{ color: 'var(--gray-med)', fontSize: '14px' }}>
                  {permission === 'granted'
                    ? 'Notifications enabled'
                    : permission === 'denied'
                    ? 'Notifications blocked'
                    : 'Notifications not enabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Proactive AI Toggle */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: 'var(--gray-med)', fontWeight: 600, marginBottom: '12px' }}>
              Proactive AI
            </h4>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
              }}
            >
              <div>
                <div style={{ color: 'var(--gray-med)', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                  Enable proactive messages
                </div>
                <div style={{ color: 'var(--gray-light)', fontSize: '12px' }}>
                  AI can start conversations based on time patterns
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                <input
                  type="checkbox"
                  checked={proactiveEnabled}
                  onChange={(e) => toggleProactiveAI(e.target.checked)}
                  disabled={permission !== 'granted'}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: permission === 'granted' ? 'pointer' : 'not-allowed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: proactiveEnabled ? 'var(--purple)' : 'var(--gray-dark)',
                    transition: '0.3s',
                    borderRadius: '24px',
                    opacity: permission === 'granted' ? 1 : 0.5,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '',
                      height: '18px',
                      width: '18px',
                      left: proactiveEnabled ? '27px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '0.3s',
                      borderRadius: '50%',
                    }}
                  />
                </span>
              </label>
            </div>
          </div>

          {/* Active Reminders */}
          <div>
            <h4 style={{ color: 'var(--gray-med)', fontWeight: 600, marginBottom: '12px' }}>
              Active Reminders ({reminders.length})
            </h4>
            {reminders.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--gray-light)',
                  fontSize: '14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                }}
              >
                No active reminders
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--gray-med)', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                          {reminder.title}
                        </div>
                        <div style={{ color: 'var(--gray-light)', fontSize: '12px', marginBottom: '4px' }}>
                          {reminder.message}
                        </div>
                        <div style={{ color: 'var(--gray-light)', fontSize: '11px' }}>
                          {new Date(reminder.scheduledTime).toLocaleString()}
                          {reminder.recurring && ` · Repeats ${reminder.recurring}`}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteReminder(reminder.id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'rgba(255, 107, 107, 0.2)',
                          color: '#ff6b6b',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
