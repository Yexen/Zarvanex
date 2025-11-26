'use client';

import { useState } from 'react';
import { PUTER_IMAGE_MODELS } from '@/lib/puter';

interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'guidelines' | 'commands';

export default function GuidelinesModal({ isOpen, onClose }: GuidelinesModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('commands');

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--darker-bg)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(114, 212, 204, 0.05)',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--teal-bright)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Help & Guidelines
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gray-light)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--gray-light)';
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <button
            onClick={() => setActiveTab('commands')}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === 'commands' ? 'var(--darker-bg)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'commands' ? '2px solid var(--teal-bright)' : '2px solid transparent',
              color: activeTab === 'commands' ? 'var(--teal-bright)' : 'var(--gray-light)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            How to Use
          </button>
          <button
            onClick={() => setActiveTab('guidelines')}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: activeTab === 'guidelines' ? 'var(--darker-bg)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'guidelines' ? '2px solid var(--teal-bright)' : '2px solid transparent',
              color: activeTab === 'guidelines' ? 'var(--teal-bright)' : 'var(--gray-light)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Guidelines
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
          }}
          className="custom-scrollbar"
        >
          {activeTab === 'commands' ? <CommandsTab /> : <GuidelinesTab />}
        </div>
      </div>
    </div>
  );
}

function CommandsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Image Generation Commands */}
      <CommandSection
        title="Image Generation"
        icon={
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }
        description="Generate images using AI models. Works in any chat!"
      >
        <CommandItem
          command="/image <prompt>"
          description="Generate an image from your description"
          example="/image a sunset over mountains with clouds"
        />
        <CommandItem
          command="/imagine <prompt>"
          description="Alias for /image"
          example="/imagine a cat playing piano"
        />
        <CommandItem
          command="/gen <prompt>"
          description="Alias for /image (short form)"
          example="/gen cyberpunk cityscape at night"
        />
        <CommandItem
          command="/draw <prompt>"
          description="Alias for /image"
          example="/draw portrait of a wizard"
        />
        <CommandItem
          command="/paint <prompt>"
          description="Alias for /image"
          example="/paint abstract watercolor flowers"
        />
        <CommandItem
          command="/create <prompt>"
          description="Alias for /image"
          example="/create logo for a tech startup"
        />

        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(114, 212, 204, 0.1)', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--teal-bright)' }}>Optional Flags</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <code style={{ color: 'var(--gray-light)' }}>--model=&lt;name&gt; or -m &lt;name&gt;</code>
            <span style={{ color: 'var(--gray-med)', marginLeft: '16px' }}>Select a specific model</span>
            <code style={{ color: 'var(--gray-light)' }}>--quality=&lt;level&gt; or -q &lt;level&gt;</code>
            <span style={{ color: 'var(--gray-med)', marginLeft: '16px' }}>Set quality (high/medium/low/hd/standard)</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--gray-light)' }}>
            <strong>Example:</strong> <code>/image --model=dall-e-3 --quality=hd a majestic eagle</code>
          </div>
        </div>

        <div style={{ marginTop: '12px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--teal-bright)' }}>Available Models</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
            {PUTER_IMAGE_MODELS.map((model) => (
              <div
                key={model.id}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--primary)' }}>{model.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--gray-med)', marginTop: '2px' }}>{model.id}</div>
              </div>
            ))}
          </div>
        </div>
      </CommandSection>

      {/* Memory Commands */}
      <CommandSection
        title="Memory & Context"
        icon={
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        }
        description="Zurvânex has a three-branch memory system that remembers your conversations."
      >
        <div style={{ fontSize: '13px', color: 'var(--gray-light)', lineHeight: 1.6 }}>
          <p><strong style={{ color: 'var(--teal-bright)' }}>Personalization:</strong> Your preferences, name, interests, and communication style are automatically remembered.</p>
          <p><strong style={{ color: 'var(--teal-bright)' }}>Soft Memory:</strong> Recent conversations are used to provide context.</p>
          <p><strong style={{ color: 'var(--teal-bright)' }}>Hard Memory:</strong> Important facts you save are retrieved when relevant.</p>
        </div>
      </CommandSection>

      {/* File Attachments */}
      <CommandSection
        title="File Attachments"
        icon={
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        }
        description="Attach files to your messages for analysis."
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
          <FileTypeCard type="Images" formats="PNG, JPG, GIF, WebP" icon="🖼️" />
          <FileTypeCard type="Documents" formats="PDF (text extracted)" icon="📄" />
          <FileTypeCard type="Videos" formats="MP4, WebM, MOV" icon="🎬" />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--gray-med)', marginTop: '12px' }}>
          Tip: Drag and drop files directly into the chat, or click the attach button.
        </p>
      </CommandSection>

      {/* Keyboard Shortcuts */}
      <CommandSection
        title="Keyboard Shortcuts"
        icon={
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
          </svg>
        }
        description="Quick actions with your keyboard."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <ShortcutItem keys={['Enter']} action="Send message" />
          <ShortcutItem keys={['Shift', 'Enter']} action="New line in message" />
          <ShortcutItem keys={['Ctrl/Cmd', 'V']} action="Paste images from clipboard" />
        </div>
      </CommandSection>
    </div>
  );
}

function GuidelinesTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <CommandSection
        title="Getting Started"
        icon={
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
        description="Welcome to Zurvânex - your AI assistant with temporal memory."
      >
        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--gray-light)', lineHeight: 1.8 }}>
          <li>Select a model from the dropdown in the header</li>
          <li>Type your message and press Enter to send</li>
          <li>Attach files by clicking the paperclip icon or drag & drop</li>
          <li>Use <code>/image</code> commands to generate images</li>
          <li>Your conversations are automatically saved and remembered</li>
        </ol>
      </CommandSection>

      <CommandSection
        title="Puter (Free Models)"
        icon={
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        }
        description="Free AI models through Puter - no API keys required!"
      >
        <div style={{ fontSize: '13px', color: 'var(--gray-light)', lineHeight: 1.6 }}>
          <p>Puter provides free access to powerful AI models including GPT-4o, Claude, and Gemini.</p>
          <p><strong style={{ color: 'var(--teal-bright)' }}>To use Puter models:</strong></p>
          <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Click &quot;Connect&quot; in the model selector</li>
            <li>Sign in to your Puter account (free)</li>
            <li>Select any Puter model and start chatting!</li>
          </ol>
        </div>
      </CommandSection>

      <CommandSection
        title="Best Practices"
        icon={
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        description="Tips for getting the best results."
      >
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--gray-light)', lineHeight: 1.8 }}>
          <li>Be specific and detailed in your prompts</li>
          <li>For image generation, describe style, colors, and composition</li>
          <li>Use the Memory Panel to save important information</li>
          <li>Different models excel at different tasks - experiment!</li>
          <li>Vision models (marked with 👁️) can analyze images</li>
        </ul>
      </CommandSection>

      <CommandSection
        title="Privacy & Data"
        icon={
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        }
        description="Your data and privacy."
      >
        <div style={{ fontSize: '13px', color: 'var(--gray-light)', lineHeight: 1.6 }}>
          <p>Your conversations and memories are stored securely in your personal account.</p>
          <p>Different AI providers have different data policies. Puter models are processed through Puter&apos;s infrastructure.</p>
        </div>
      </CommandSection>
    </div>
  );
}

// Helper Components
function CommandSection({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span style={{ color: 'var(--teal-bright)' }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--primary)' }}>{title}</h3>
      </div>
      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--gray-med)' }}>{description}</p>
      {children}
    </div>
  );
}

function CommandItem({
  command,
  description,
  example,
}: {
  command: string;
  description: string;
  example?: string;
}) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <code
          style={{
            background: 'rgba(114, 212, 204, 0.2)',
            color: 'var(--teal-bright)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
        >
          {command}
        </code>
      </div>
      <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-light)' }}>{description}</p>
      {example && (
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--gray-med)' }}>
          Example: <code style={{ color: 'var(--gray-light)' }}>{example}</code>
        </p>
      )}
    </div>
  );
}

function FileTypeCard({ type, formats, icon }: { type: string; formats: string; icon: string }) {
  return (
    <div
      style={{
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--primary)' }}>{type}</div>
      <div style={{ fontSize: '11px', color: 'var(--gray-med)' }}>{formats}</div>
    </div>
  );
}

function ShortcutItem({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        {keys.map((key, index) => (
          <span key={index}>
            <kbd
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '12px',
                color: 'var(--gray-light)',
                fontFamily: 'monospace',
              }}
            >
              {key}
            </kbd>
            {index < keys.length - 1 && <span style={{ margin: '0 4px', color: 'var(--gray-med)' }}>+</span>}
          </span>
        ))}
      </div>
      <span style={{ fontSize: '12px', color: 'var(--gray-med)' }}>{action}</span>
    </div>
  );
}
