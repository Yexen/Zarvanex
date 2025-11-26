'use client';

import { useState } from 'react';
import type { Message } from '@/types';
import PerformanceChart from './PerformanceChart';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  onBranch?: () => void;
  onSaveMoment?: () => void;
  onResend?: () => void;
  allMessages?: Message[]; // For performance comparison and trends
}

interface FilePreview {
  data: string;
  type: 'image' | 'document';
  mimeType: string;
  name: string;
}

export default function MessageBubble({ message, onRegenerate, onBranch, onSaveMoment, onResend, allMessages = [] }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [analysisContent, setAnalysisContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate) onRegenerate();
  };

  const handleBranch = () => {
    if (onBranch) onBranch();
  };

  const handleSaveMoment = () => {
    if (onSaveMoment) onSaveMoment();
  };

  const handleResend = () => {
    if (onResend) onResend();
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisContent('');

    try {
      const response = await fetch('/api/chat/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Analyze the following message from different perspectives (technical accuracy, clarity, completeness, potential improvements, and alternative approaches):\n\n"${message.content}"`,
            },
          ],
          modelId: 'llama-3.3-70b-versatile', // Best Groq model
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  setAnalysisContent((prev) => prev + parsed.content);
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisContent('Failed to analyze message. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Parse attached files from base64 data URLs or HTTP URLs
  const files: FilePreview[] = message.images
    ? message.images.map((data, idx) => {
        let mimeType = '';
        let isImage = false;
        let extension = 'file';

        // Check if it's a data URL
        if (data.startsWith('data:')) {
          mimeType = data.split(';')[0].split(':')[1] || '';
          isImage = mimeType.startsWith('image/');
          extension = mimeType.split('/')[1] || 'file';
        }
        // Check if it's an HTTP URL (likely an image from generation)
        else if (data.startsWith('http://') || data.startsWith('https://')) {
          // Assume HTTP URLs are images (from image generation)
          isImage = true;
          // Try to get extension from URL
          const urlMatch = data.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
          extension = urlMatch ? urlMatch[1] : 'png';
          mimeType = `image/${extension}`;
        }
        // Check for common image extensions in the data
        else if (data.includes('image/') || /\.(png|jpg|jpeg|gif|webp|svg)/i.test(data)) {
          isImage = true;
          extension = 'png';
          mimeType = 'image/png';
        }

        const name = isImage ? `Image ${idx + 1}.${extension}` : `File ${idx + 1}.${extension}`;

        return {
          data,
          type: isImage ? 'image' : 'document',
          mimeType,
          name,
        };
      })
    : [];

  return (
    <div className={`message ${isUser ? 'user-message' : 'ai-message'}`}>
      {/* Avatar */}
      <div className={`message-avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`}>
        {isUser ? 'Y' : 'Z'}
      </div>

      {/* Message Content */}
      <div className="message-content">
        <div className="message-text">
          {/* File attachments preview */}
          {files.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-2" style={{ maxWidth: '100%' }}>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 relative group"
                  style={{ minWidth: '120px', maxWidth: '120px' }}
                >
                  {file.type === 'image' ? (
                    <>
                      <img
                        src={file.data}
                        alt={file.name}
                        className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          height: '120px',
                          width: '120px',
                          objectFit: 'cover',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                        onClick={() => setSelectedImageIndex(idx)}
                      />
                      <div
                        className="absolute bottom-1 left-1 right-1 text-xs px-2 py-1 rounded"
                        style={{
                          background: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          fontSize: '10px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.name}
                      </div>
                    </>
                  ) : (
                    <div
                      className="rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-opacity-80 transition-all"
                      style={{
                        height: '120px',
                        width: '120px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'var(--darker-bg)',
                      }}
                    >
                      <svg width="32" height="32" fill="none" stroke="var(--gray-med)" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div
                        className="mt-2 px-2 text-center"
                        style={{
                          color: 'var(--gray-light)',
                          fontSize: '10px',
                          wordBreak: 'break-all',
                          lineHeight: '1.2',
                        }}
                      >
                        {file.name}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Message text */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>

        {/* Message Actions Bar */}
        <div className="message-actions">
          {/* Timestamp */}
          <div className="message-time">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>

          {/* Action Buttons */}
          <div className="message-action-buttons">
            {/* Regenerate Button (only for AI messages) */}
            {!isUser && (
              <button
                onClick={handleRegenerate}
                className="message-action-btn"
                title="Regenerate"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="action-label">Regenerate</span>
              </button>
            )}

            {/* Resend Button (only for user messages) */}
            {isUser && (
              <button
                onClick={handleResend}
                className="message-action-btn"
                title="Resend"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <span className="action-label">Resend</span>
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="message-action-btn"
              title="Copy"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="action-label">Copied!</span>
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="action-label">Copy</span>
                </>
              )}
            </button>

            {/* Branch Button */}
            <button
              onClick={handleBranch}
              className="message-action-btn"
              title="Branch"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              <span className="action-label">Branch</span>
            </button>

            {/* Save Moment Button (only for AI messages) */}
            {!isUser && (
              <button
                onClick={handleSaveMoment}
                className="message-action-btn"
                title="Save This Moment"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span className="action-label">Save Moment</span>
              </button>
            )}

            {/* Info Button (only for AI messages) */}
            {!isUser && (
              <button
                onClick={() => setShowInfoPopup(true)}
                className="message-action-btn"
                title="Message Info"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0-4h.01" />
                </svg>
                <span className="action-label">Info</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {selectedImageIndex !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedImageIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedImageIndex(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
          >
            ×
          </button>

          {/* Navigation arrows */}
          {files.filter(f => f.type === 'image').length > 1 && (
            <>
              {/* Previous button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const imageFiles = files.filter(f => f.type === 'image');
                  const currentImageIndex = imageFiles.findIndex((_, idx) => files.findIndex(f => f === imageFiles[idx]) === selectedImageIndex);
                  const prevIndex = currentImageIndex > 0 ? currentImageIndex - 1 : imageFiles.length - 1;
                  setSelectedImageIndex(files.findIndex(f => f === imageFiles[prevIndex]));
                }}
                style={{
                  position: 'absolute',
                  left: '20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
              >
                ‹
              </button>

              {/* Next button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const imageFiles = files.filter(f => f.type === 'image');
                  const currentImageIndex = imageFiles.findIndex((_, idx) => files.findIndex(f => f === imageFiles[idx]) === selectedImageIndex);
                  const nextIndex = currentImageIndex < imageFiles.length - 1 ? currentImageIndex + 1 : 0;
                  setSelectedImageIndex(files.findIndex(f => f === imageFiles[nextIndex]));
                }}
                style={{
                  position: 'absolute',
                  right: '20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
              >
                ›
              </button>
            </>
          )}

          {/* Full-size image */}
          <img
            src={files[selectedImageIndex]?.data}
            alt={files[selectedImageIndex]?.name}
            style={{
              maxWidth: '90%',
              maxHeight: '80%',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {/* Action buttons (Download) */}
          <div
            style={{
              position: 'absolute',
              bottom: files.filter(f => f.type === 'image').length > 1 ? '70px' : '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Download button */}
            <button
              onClick={() => {
                const file = files[selectedImageIndex];
                if (file?.data) {
                  const link = document.createElement('a');
                  link.href = file.data;
                  // Generate filename with timestamp
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                  const ext = file.mimeType?.split('/')[1] || 'png';
                  link.download = `zurvanex-image-${timestamp}.${ext}`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(114, 212, 204, 0.9)',
                color: '#000',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(114, 212, 204, 1)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(114, 212, 204, 0.9)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>

            {/* Open in new tab button */}
            <button
              onClick={() => {
                const file = files[selectedImageIndex];
                if (file?.data) {
                  window.open(file.data, '_blank');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '10px 20px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open
            </button>
          </div>

          {/* Image counter */}
          {files.filter(f => f.type === 'image').length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
              }}
            >
              {files.filter(f => f.type === 'image').findIndex((_, idx) => files.findIndex(f => f === files.filter(f => f.type === 'image')[idx]) === selectedImageIndex) + 1} / {files.filter(f => f.type === 'image').length}
            </div>
          )}
        </div>
      )}

      {/* Info Popup Modal */}
      {showInfoPopup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => {
            setShowInfoPopup(false);
            setAnalysisContent('');
          }}
        >
          <div
            style={{
              background: 'var(--darker-bg)',
              border: '2px solid #40E0D0',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(64, 224, 208, 0.3)',
            }}
            className="custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#40E0D0', fontSize: '18px', fontWeight: '600' }}>
                Message Information
              </h3>
              <button
                onClick={() => {
                  setShowInfoPopup(false);
                  setAnalysisContent('');
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
              >
                ×
              </button>
            </div>

            {/* Info Details */}
            <div style={{ marginBottom: '20px', fontSize: '14px', lineHeight: '1.8' }}>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: 'var(--gray-light)', marginRight: '8px' }}>Date:</span>
                <span style={{ color: 'white' }}>
                  {new Date(message.timestamp).toLocaleDateString([], {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: 'var(--gray-light)', marginRight: '8px' }}>Time:</span>
                <span style={{ color: 'white' }}>
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <span style={{ color: 'var(--gray-light)', marginRight: '8px' }}>Model:</span>
                <span style={{ color: 'white' }}>
                  {message.modelName || message.modelId || 'Unknown'}
                </span>
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              style={{
                width: '100%',
                padding: '12px',
                background: isAnalyzing ? 'var(--gray-dark)' : '#40E0D0',
                color: isAnalyzing ? 'var(--gray-light)' : '#000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                marginBottom: analysisContent ? '20px' : '0',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isAnalyzing) e.currentTarget.style.background = '#36c9ba';
              }}
              onMouseLeave={(e) => {
                if (!isAnalyzing) e.currentTarget.style.background = '#40E0D0';
              }}
            >
              {isAnalyzing ? 'Analyzing with Groq...' : 'Analyze with Groq'}
            </button>

            {/* Analysis Content */}
            {analysisContent && (
              <div
                style={{
                  background: 'rgba(64, 224, 208, 0.05)',
                  border: '1px solid rgba(64, 224, 208, 0.2)',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--gray-light)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  marginBottom: '20px',
                }}
              >
                {analysisContent}
              </div>
            )}

            {/* Performance Charts */}
            {message.performance && (
              <div>
                <h4 style={{ color: '#40E0D0', fontSize: '16px', marginBottom: '16px', fontWeight: '600' }}>
                  Performance Metrics
                </h4>
                <PerformanceChart message={message} allMessages={allMessages} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
