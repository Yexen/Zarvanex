'use client';

import { useEffect, useRef, useState } from 'react';
import type { Message } from '@/types';

interface SaveMomentModalProps {
  userMessage: Message;
  aiMessage: Message;
  onClose: () => void;
}

export default function SaveMomentModal({ userMessage, aiMessage, onClose }: SaveMomentModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    generateMomentCard();
  }, []);

  const generateMomentCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Square 1:1 dimensions
    canvas.width = 1080;
    canvas.height = 1080;

    // Create rounded rectangle clipping path for the entire canvas
    const borderRadius = 40;
    ctx.beginPath();
    ctx.moveTo(borderRadius, 0);
    ctx.lineTo(canvas.width - borderRadius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, borderRadius);
    ctx.lineTo(canvas.width, canvas.height - borderRadius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - borderRadius, canvas.height);
    ctx.lineTo(borderRadius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - borderRadius);
    ctx.lineTo(0, borderRadius);
    ctx.quadraticCurveTo(0, 0, borderRadius, 0);
    ctx.closePath();
    ctx.clip();

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle teal accent border (inner border)
    ctx.strokeStyle = '#72D4CC';
    ctx.lineWidth = 8;
    const borderInset = 20;
    const innerRadius = borderRadius - borderInset;
    ctx.beginPath();
    ctx.moveTo(borderInset + innerRadius, borderInset);
    ctx.lineTo(canvas.width - borderInset - innerRadius, borderInset);
    ctx.quadraticCurveTo(canvas.width - borderInset, borderInset, canvas.width - borderInset, borderInset + innerRadius);
    ctx.lineTo(canvas.width - borderInset, canvas.height - borderInset - innerRadius);
    ctx.quadraticCurveTo(canvas.width - borderInset, canvas.height - borderInset, canvas.width - borderInset - innerRadius, canvas.height - borderInset);
    ctx.lineTo(borderInset + innerRadius, canvas.height - borderInset);
    ctx.quadraticCurveTo(borderInset, canvas.height - borderInset, borderInset, canvas.height - borderInset - innerRadius);
    ctx.lineTo(borderInset, borderInset + innerRadius);
    ctx.quadraticCurveTo(borderInset, borderInset, borderInset + innerRadius, borderInset);
    ctx.closePath();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#3D9B93';
    ctx.font = 'bold 44px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Zarvânex Moment', canvas.width / 2, 90);

    // Date
    const date = new Date(aiMessage.timestamp);
    ctx.fillStyle = '#666666';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillText(
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      canvas.width / 2,
      130
    );

    // Content area with padding
    const padding = 80;
    const contentWidth = canvas.width - (padding * 2);
    let yPosition = 200;

    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number, fontSize: number, fontWeight: string = 'normal') => {
      ctx.font = `${fontWeight} ${fontSize}px "Courier New", monospace`;
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines;
    };

    // User message section with subtle background
    ctx.fillStyle = 'rgba(61, 155, 147, 0.08)';
    ctx.fillRect(padding - 15, yPosition - 35, contentWidth + 30, 50);

    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('You asked:', padding, yPosition);
    yPosition += 50;

    // User message content
    const userLines = wrapText(userMessage.content, contentWidth, 26, 'bold');
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 26px "Courier New", monospace';
    userLines.forEach(line => {
      ctx.fillText(line, padding, yPosition);
      yPosition += 38;
    });

    yPosition += 40;

    // AI response section
    ctx.fillStyle = 'rgba(72, 212, 204, 0.08)';
    ctx.fillRect(padding - 15, yPosition - 35, contentWidth + 30, 50);

    ctx.fillStyle = '#3D9B93';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.fillText('Zarvânex:', padding, yPosition);
    yPosition += 50;

    // AI message content (truncate if too long)
    const maxLines = Math.floor((canvas.height - yPosition - 150) / 38);
    let aiText = aiMessage.content;
    if (aiText.length > 600) {
      aiText = aiText.slice(0, 600) + '...';
    }

    const aiLines = wrapText(aiText, contentWidth, 26, 'bold');
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 26px "Courier New", monospace';
    aiLines.slice(0, maxLines).forEach(line => {
      ctx.fillText(line, padding, yPosition);
      yPosition += 38;
    });

    // Footer with branding - moved up significantly
    const footerY = canvas.height - 100;
    ctx.fillStyle = 'rgba(61, 155, 147, 0.2)';
    ctx.fillRect(0, footerY - 15, canvas.width, 2);

    ctx.fillStyle = '#3D9B93';
    ctx.font = 'bold 28px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Zarvânex', canvas.width / 2, footerY + 20);

    ctx.fillStyle = '#666666';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('AI Conversations', canvas.width / 2, footerY + 48);

    setIsGenerating(false);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `zarvanex-moment-${timestamp}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      if (navigator.share) {
        try {
          const file = new File([blob], 'zarvanex-moment.png', { type: 'image/png' });
          await navigator.share({
            files: [file],
            title: 'Zarvânex Moment',
            text: 'Check out this conversation moment!',
          });
        } catch (err) {
          console.log('Share failed:', err);
          handleDownload(); // Fallback to download
        }
      } else {
        handleDownload(); // Fallback if share not supported
      }
    });
  };

  return (
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
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--darker-bg)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '600px',
          width: '100%',
          border: '1px solid rgba(114, 212, 204, 0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', color: 'var(--teal-bright)', fontWeight: 600, margin: 0 }}>
            Save This Moment
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gray-light)',
              cursor: 'pointer',
              fontSize: '28px',
              padding: '4px 8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Canvas Preview */}
        <div style={{
          background: 'var(--dark-bg)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'var(--gray-med)',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleShare}
              disabled={isGenerating}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid var(--teal-med)',
                borderRadius: '8px',
                color: 'var(--teal-med)',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'inherit',
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              Share
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              style={{
                padding: '12px 24px',
                background: 'var(--teal-med)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'inherit',
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              {isGenerating ? 'Generating...' : 'Download'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
