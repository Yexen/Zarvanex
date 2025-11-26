'use client';

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferencesContext } from '@/contexts/UserPreferencesContext';

interface AttachedFile {
  type: 'image' | 'document' | 'video';
  data: string; // base64 for images/videos, extracted text for text documents
  name: string;
  mimeType: string;
  isConverted?: boolean; // true if PDF was converted to image
  extractedText?: string; // extracted text from PDF
  fileSize?: number; // file size in bytes
}

interface ChatInputProps {
  onSend: (message: string, images?: string[]) => void;
  disabled?: boolean;
  supportsVision?: boolean;
  conversationId?: string | null;
  persistedMessage?: string;
  onMessageChange?: (message: string) => void;
}

export default function ChatInput({ onSend, disabled, supportsVision, conversationId, persistedMessage, onMessageChange }: ChatInputProps) {
  const [message, setMessage] = useState(persistedMessage || '');
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const { preferences, updatePreferences } = useUserPreferencesContext();

  // Sync with persisted message when conversation changes
  useEffect(() => {
    if (persistedMessage !== undefined) {
      setMessage(persistedMessage);
    }
  }, [conversationId, persistedMessage]);

  // Notify parent of message changes for persistence
  const handleMessageChange = (newMessage: string) => {
    setMessage(newMessage);
    onMessageChange?.(newMessage);
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const MAX_FILES = 10;

  // Parse personalization command
  const parsePersonalizationCommand = async (message: string): Promise<boolean> => {
    const personalizationMatch = message.match(/^\.\/personalization\s+(.+)$/i);
    if (!personalizationMatch) return false;

    const input = personalizationMatch[1].trim();
    console.log('[DEBUG] Personalization command detected:', input);

    try {
      // Simple parsing: split by commas and try to categorize
      const parts = input.split(',').map(p => p.trim()).filter(Boolean);
      
      let conversationStyle = preferences?.conversation_style?.tone || 'friendly';
      let interests: string[] = preferences?.interests || [];
      let background = preferences?.background || '';

      // Parse each part and categorize
      for (const part of parts) {
        const lower = part.toLowerCase();
        
        // Check for conversation styles
        if (lower.includes('professional') || lower.includes('formal')) {
          conversationStyle = 'professional';
        } else if (lower.includes('casual') || lower.includes('relaxed')) {
          conversationStyle = 'casual';
        } else if (lower.includes('friendly') || lower.includes('warm')) {
          conversationStyle = 'friendly';
        } else if (lower.includes('balanced') || lower.includes('neutral')) {
          conversationStyle = 'balanced';
        }
        // Check for common interests/skills
        else if (lower.includes('cod') || lower.includes('program') || lower.includes('software')) {
          if (!interests.some(i => i.toLowerCase().includes('coding'))) {
            interests.push('coding');
          }
        } else if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('ml')) {
          if (!interests.some(i => i.toLowerCase().includes('ai'))) {
            interests.push('AI');
          }
        } else if (lower.includes('design') || lower.includes('ui') || lower.includes('ux')) {
          if (!interests.some(i => i.toLowerCase().includes('design'))) {
            interests.push('design');
          }
        }
        // Otherwise, treat as background/bio info
        else if (part.length > 3) {
          background += (background ? '. ' : '') + part;
        }
      }

      // Update preferences
      await updatePreferences({
        conversation_style: {
          tone: conversationStyle as 'professional' | 'casual' | 'friendly' | 'balanced',
          formality: preferences?.conversation_style?.formality || 'casual',
          verbosity: preferences?.conversation_style?.verbosity || 'detailed',
          humor: preferences?.conversation_style?.humor ?? true,
          empathy_level: preferences?.conversation_style?.empathy_level || 'high',
          technical_depth: preferences?.conversation_style?.technical_depth || 'medium'
        },
        interests,
        background: background || undefined,
      });

      console.log('[DEBUG] Personalization updated:', { conversationStyle, interests, background });

      // Clear the command from input
      handleMessageChange('');

      // Show confirmation message
      setTimeout(() => {
        handleMessageChange(`Personalization updated! Style: ${conversationStyle}, Interests: ${interests.join(', ')}, Background: ${background ? 'Updated' : 'Not set'}`);
        setTimeout(() => handleMessageChange(''), 3000);
      }, 100);

      return true;
    } catch (error) {
      console.error('[ERROR] Error parsing personalization command:', error);
      handleMessageChange('[ERROR] Error updating personalization. Please try again.');
      setTimeout(() => handleMessageChange(''), 3000);
      return true; // Still consumed the command
    }
  };

  // Load PDF.js from CDN
  useEffect(() => {
    let mounted = true;

    console.log('[PDF.js] Starting to load PDF.js from CDN...');

    const loadPdfJsFromCDN = () => {
      // Check if already loaded
      if ((window as any).pdfjsLib) {
        console.log('[PDF.js] Already loaded from previous session');
        setPdfjsLib((window as any).pdfjsLib);
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      script.async = true;

      script.onload = () => {
        console.log('[PDF.js] Script loaded successfully');

        const pdfjsLib = (window as any).pdfjsLib;
        if (pdfjsLib) {
          // Set worker
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

          if (mounted) {
            setPdfjsLib(pdfjsLib);
            console.log('[PDF.js] ✓ PDF.js loaded and ready!');
          }
        } else {
          console.error('[PDF.js] Script loaded but pdfjsLib not found on window');
        }
      };

      script.onerror = (error) => {
        console.error('[PDF.js] [ERROR] Failed to load PDF.js script:', error);
        setFileError('PDF processing library failed to load. Please check your internet connection.');
      };

      document.head.appendChild(script);
    };

    loadPdfJsFromCDN();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSend = async () => {
    if (message.trim() || files.length > 0) {
      // Check for commands before sending
      if (message.trim()) {
        const commandHandled = await parsePersonalizationCommand(message.trim());
        if (commandHandled) return; // Don't send the command as a regular message
      }

      // Separate file types
      const imageFiles = files.filter(f => f.type === 'image' && f.data);
      const videoFiles = files.filter(f => f.type === 'video' && f.data);
      const documentFiles = files.filter(f => f.type === 'document' && f.data);

      // Build message with file attachments info
      let fullMessage = message;

      // Add document info to the message (files are sent as base64)
      if (documentFiles.length > 0) {
        const docInfo = documentFiles.map(doc =>
          `[Attached Document: ${doc.name} (${doc.mimeType})]`
        ).join('\n');
        fullMessage = fullMessage ? `${fullMessage}\n\n${docInfo}` : docInfo;
      }

      // Add video info to the message
      if (videoFiles.length > 0) {
        const videoInfo = videoFiles.map(vid =>
          `[Attached Video: ${vid.name} (${vid.mimeType})]`
        ).join('\n');
        fullMessage = fullMessage ? `${fullMessage}\n\n${videoInfo}` : videoInfo;
      }

      // Collect all media data (images, videos, documents as base64)
      const allMediaData = [
        ...imageFiles.map(f => f.data),
        ...videoFiles.map(f => f.data),
        ...documentFiles.map(f => f.data),
      ].filter(Boolean);

      onSend(fullMessage, allMediaData.length > 0 ? allMediaData : undefined);
      handleMessageChange('');
      setFiles([]);
      setFileError(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document' | 'video') => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    setFileError(null);
    const filesToProcess = Array.from(uploadedFiles).slice(0, MAX_FILES - files.length);

    // Validate file sizes
    const oversizedFiles = filesToProcess.filter(f => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setFileError(`Some files exceed 10MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      e.target.value = '';
      return;
    }

    try {
      const newFiles: AttachedFile[] = [];

      for (const file of filesToProcess) {
        if (files.length + newFiles.length >= MAX_FILES) break;

        if (type === 'video') {
          // Video processing - read as base64
          const result = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
          });

          newFiles.push({
            type: 'video',
            data: result,
            name: file.name,
            mimeType: file.type,
            fileSize: file.size,
          });
        } else if (type === 'image') {
          // Regular image processing with FileReader
          const result = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
          });

          newFiles.push({
            type: 'image',
            data: result,
            name: file.name,
            mimeType: file.type,
            fileSize: file.size,
          });
        } else if (type === 'document') {
          // Documents - keep as files (base64), don't extract text
          const result = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
            reader.readAsDataURL(file);
          });

          newFiles.push({
            type: 'document',
            data: result,
            name: file.name,
            mimeType: file.type,
            fileSize: file.size,
          });
          console.log(`Document attached as file: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
        }
      }

      // Add all processed files at once
      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (error) {
      console.error('File upload error:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to process files');
    }

    // Reset input
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  // Convert PDF to images (for vision analysis)
  const convertPdfToImages = async (file: File): Promise<AttachedFile[]> => {
    if (!pdfjsLib) {
      throw new Error('PDF.js library not loaded yet. Please try again in a moment.');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images: AttachedFile[] = [];

      console.log(`Converting PDF to images: ${file.name} (${pdf.numPages} pages)`);

      // Convert all pages (limit to 30 for vision processing)
      const numPages = Math.min(pdf.numPages, 30);

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        const imageData = canvas.toDataURL('image/jpeg', 0.85);

        images.push({
          type: 'image',
          data: imageData,
          name: `${file.name} (Page ${pageNum})`,
          mimeType: 'image/jpeg',
          isConverted: true,
        });

        if (pageNum % 5 === 0) {
          console.log(`Converted ${pageNum}/${numPages} pages...`);
        }
      }

      console.log(`PDF → Images complete: ${images.length} pages`);
      return images;
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      throw new Error('Failed to convert PDF to images');
    }
  };

  // Extract text from PDF (for long documents)
  const extractPdfText = async (file: File): Promise<string> => {
    if (!pdfjsLib) {
      throw new Error('PDF.js library not loaded yet. Please try again in a moment.');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      console.log(`Extracting text from PDF: ${file.name} (${pdf.numPages} pages)`);

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        fullText += `\n\n--- Page ${pageNum} ---\n${pageText}`;

        if (pageNum % 10 === 0) {
          console.log(`Extracted ${pageNum}/${pdf.numPages} pages...`);
        }
      }

      console.log(`PDF text extraction complete: ${fullText.length} characters`);
      return fullText.trim();
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error('Failed to extract text from PDF');
    }
  };

  return (
    <div className="input-area">
      {/* File previews - shown above input */}
      {files.length > 0 && (
        <div style={{ marginBottom: '12px', maxWidth: '900px', width: '100%' }}>
          {/* Info for converted PDFs (images) */}
          {files.some(f => f.isConverted) && (
            <div style={{
              padding: '8px 12px',
              marginBottom: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '6px',
              color: '#3b82f6',
              fontSize: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF converted to images for vision analysis (≤30 pages)
              </div>
            </div>
          )}

          {/* Info for PDFs with extracted text */}
          {files.some(f => f.extractedText && !f.isConverted) && (
            <div style={{
              padding: '8px 12px',
              marginBottom: '8px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '6px',
              color: '#22c55e',
              fontSize: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Text extracted from large PDF ({'>'}30 pages) - will be included with your message
              </div>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            {files.map((file, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                {file.type === 'image' ? (
                  <img
                    src={file.data}
                    alt={file.name}
                    className="h-20 rounded-lg"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  />
                ) : file.type === 'video' ? (
                  <div
                    className="h-20 w-20 rounded-lg flex items-center justify-center"
                    style={{
                      border: '1px solid rgba(114, 212, 204, 0.3)',
                      background: 'rgba(114, 212, 204, 0.1)',
                    }}
                  >
                    <div className="text-center px-2">
                      <svg width="24" height="24" fill="none" stroke="var(--teal-bright)" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <div
                        className="text-xs mt-1"
                        style={{
                          color: 'var(--teal-bright)',
                          fontSize: '9px',
                          wordBreak: 'break-all',
                          lineHeight: '1.2',
                        }}
                      >
                        {file.name.slice(0, 10)}...
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="h-20 w-20 rounded-lg flex items-center justify-center"
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'var(--darker-bg)',
                    }}
                  >
                    <div className="text-center px-2">
                      <svg width="24" height="24" fill="none" stroke="var(--gray-med)" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div
                        className="text-xs mt-1"
                        style={{
                          color: 'var(--gray-light)',
                          fontSize: '9px',
                          wordBreak: 'break-all',
                          lineHeight: '1.2',
                        }}
                      >
                        {file.name.slice(0, 10)}...
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => removeFile(idx)}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    transition: 'transform 0.2s, background 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.background = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = '#ef4444';
                  }}
                  title={`Remove ${file.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={message.startsWith('./') ?
              "Type: ./personalization friendly, coding enthusiast, prefer detailed explanations" :
              "Message Zurvânex... (try: ./personalization)"
            }
            disabled={disabled}
            rows={1}
            className="message-input"
          />

          {/* Action buttons */}
          <div className="input-actions">
            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              multiple
              onChange={(e) => handleFileUpload(e, 'image')}
              className="hidden"
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".txt,.pdf,.md,.csv,.json,.log,.xml,.yaml,.yml,.toml,.ini,.cfg,.conf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.html,.htm"
              multiple
              onChange={(e) => handleFileUpload(e, 'document')}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept=".mp4,.webm,.mov,.avi,.mkv,.m4v"
              multiple
              onChange={(e) => handleFileUpload(e, 'video')}
              className="hidden"
            />

            {/* Attach button with dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                disabled={disabled || files.length >= MAX_FILES}
                className="action-btn"
                title="Attach files (up to 10, max 10MB each)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

                {/* Dropdown menu */}
                {showAttachMenu && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10,
                      }}
                      onClick={() => setShowAttachMenu(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        marginBottom: '8px',
                        background: 'var(--darker-bg)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        minWidth: '160px',
                        zIndex: 20,
                      }}
                    >
                      <button
                        onClick={() => {
                          imageInputRef.current?.click();
                          setShowAttachMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--gray-med)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          borderRadius: '8px 8px 0 0',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Images
                      </button>
                      <button
                        onClick={() => {
                          videoInputRef.current?.click();
                          setShowAttachMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'var(--gray-med)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Videos
                      </button>
                      <button
                        onClick={() => {
                          documentInputRef.current?.click();
                          setShowAttachMenu(false);
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'transparent',
                          border: 'none',
                          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                          color: 'var(--gray-med)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          borderRadius: '0 0 8px 8px',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Documents
                      </button>
                    </div>
                  </>
                )}
              </div>

            {/* Voice input button (placeholder for future feature) */}
            <button
              disabled={disabled}
              className="action-btn"
              title="Voice Input (Coming Soon)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && files.length === 0)}
          className="send-btn"
        >
          Send
        </button>
      </div>

      {/* Error message */}
      {fileError && (
        <div
          style={{
            fontSize: '12px',
            color: '#ff6b6b',
            marginTop: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 107, 107, 0.3)',
          }}
        >
          {fileError}
        </div>
      )}

      {/* File count indicator */}
      {files.length > 0 && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--gray-light)',
            marginTop: '4px',
            textAlign: 'right',
          }}
        >
          {files.length}/{MAX_FILES} files attached (max 10MB each)
        </div>
      )}
    </div>
  );
}
