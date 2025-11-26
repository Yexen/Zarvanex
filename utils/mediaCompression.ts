/**
 * Comprehensive media compression utilities for documents, videos, and other files
 * Handles large media files for Supabase storage while preserving quality for AI processing
 */

import { compressImages, getImageSize, formatSize } from './imageCompression';

export interface MediaCompressionResult {
  compressed?: string;
  thumbnail?: string;
  metadata: {
    type: 'document' | 'video' | 'image';
    originalSize: number;
    compressedSize?: number;
    thumbnailSize?: number;
    filename: string;
    mimeType: string;
    extractedText?: string;
    summary?: string;
  };
  error?: string;
}

export interface ProcessedMedia {
  forDatabase: string | undefined; // Compressed/thumbnail for storage
  forAI: string; // Original or processed for AI
  metadata: MediaCompressionResult['metadata'];
}

/**
 * Extract thumbnail from video file
 */
async function extractVideoThumbnail(
  videoFile: File | string,
  quality: number = 0.8
): Promise<{ thumbnail: string; size: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    video.addEventListener('loadedmetadata', () => {
      // Set canvas dimensions (max 512x512 for thumbnail)
      const maxDimension = 512;
      let { videoWidth: width, videoHeight: height } = video;
      
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;
      
      // Seek to 10% of video for a good thumbnail
      video.currentTime = Math.min(video.duration * 0.1, 5); // Max 5 seconds
    });

    video.addEventListener('seeked', () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg', quality);
      const size = Math.round((thumbnail.length - 22) * 3 / 4);
      
      resolve({ thumbnail, size });
      
      // Cleanup
      video.remove();
    });

    video.addEventListener('error', () => {
      reject(new Error('Failed to load video'));
    });

    if (typeof videoFile === 'string') {
      video.src = videoFile;
    } else {
      video.src = URL.createObjectURL(videoFile);
    }
  });
}

/**
 * Compress document by truncating text content while preserving important parts
 */
function compressDocumentText(
  text: string,
  maxLength: number = 50000 // 50KB of text
): { compressed: string; summary: string } {
  if (text.length <= maxLength) {
    return {
      compressed: text,
      summary: `Full document content (${text.length} chars)`
    };
  }

  // Take beginning and end, with a note about truncation
  const beginLength = Math.floor(maxLength * 0.7);
  const endLength = Math.floor(maxLength * 0.2);
  const remainingLength = maxLength - beginLength - endLength - 100; // Buffer for truncation message

  const beginning = text.substring(0, beginLength);
  const ending = text.substring(text.length - endLength);
  
  const truncationNote = `\n\n[... CONTENT TRUNCATED - Original document was ${text.length} characters, showing first ${beginLength} and last ${endLength} characters for storage optimization. Full content available for AI processing ...]\n\n`;
  
  const compressed = beginning + truncationNote + ending;
  
  return {
    compressed: compressed.substring(0, maxLength), // Ensure we don't exceed limit
    summary: `Compressed from ${formatSize(text.length)} to ${formatSize(compressed.length)}`
  };
}

/**
 * Compress video by extracting thumbnail and metadata
 */
async function compressVideo(
  videoDataUrl: string,
  filename: string,
  mimeType: string
): Promise<MediaCompressionResult> {
  try {
    const originalSize = getImageSize(videoDataUrl);
    
    // Extract thumbnail from video
    const { thumbnail, size: thumbnailSize } = await extractVideoThumbnail(videoDataUrl, 0.7);
    
    return {
      thumbnail,
      metadata: {
        type: 'video',
        originalSize,
        thumbnailSize,
        filename,
        mimeType,
        summary: `Video thumbnail extracted (${formatSize(thumbnailSize)} vs ${formatSize(originalSize)} original)`
      }
    };
  } catch (error) {
    return {
      metadata: {
        type: 'video',
        originalSize: getImageSize(videoDataUrl),
        filename,
        mimeType,
        summary: 'Failed to extract thumbnail'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Compress document by truncating text content
 */
function compressDocument(
  text: string,
  filename: string,
  mimeType: string
): MediaCompressionResult {
  const originalSize = new Blob([text]).size;
  const { compressed, summary } = compressDocumentText(text);
  const compressedSize = new Blob([compressed]).size;
  
  return {
    compressed,
    metadata: {
      type: 'document',
      originalSize,
      compressedSize,
      filename,
      mimeType,
      extractedText: compressed,
      summary
    }
  };
}

/**
 * Process all types of media files for dual storage
 */
export async function processMediaFiles(
  mediaData: string[],
  filenames: string[],
  mimeTypes: string[]
): Promise<{
  forDatabase: (string | undefined)[];
  forAI: string[];
  compressionResults: MediaCompressionResult[];
}> {
  const compressionPromises = mediaData.map(async (data, index) => {
    const filename = filenames[index] || `file_${index}`;
    const mimeType = mimeTypes[index] || 'application/octet-stream';
    
    // Determine file type
    if (mimeType.startsWith('image/')) {
      // Handle images (already have compression utility)
      try {
        const imageResult = await compressImages([data], 700 * 1024);
        const result = imageResult[0];
        return {
          processed: {
            forDatabase: result.compressed,
            forAI: data, // Original for AI
            metadata: {
              type: 'image' as const,
              originalSize: result.originalSize,
              compressedSize: result.compressedSize,
              filename,
              mimeType,
              summary: `Image compressed from ${formatSize(result.originalSize)} to ${formatSize(result.compressedSize)}`
            }
          }
        };
      } catch (error) {
        return {
          processed: {
            forDatabase: undefined,
            forAI: data,
            metadata: {
              type: 'image' as const,
              originalSize: getImageSize(data),
              filename,
              mimeType,
              summary: 'Image compression failed'
            }
          },
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else if (mimeType.startsWith('video/')) {
      // Handle videos
      const result = await compressVideo(data, filename, mimeType);
      return {
        processed: {
          forDatabase: result.thumbnail,
          forAI: data, // Original for AI
          metadata: result.metadata
        },
        error: result.error
      };
    } else {
      // Handle documents (assume data is extracted text)
      const result = compressDocument(data, filename, mimeType);
      return {
        processed: {
          forDatabase: result.compressed,
          forAI: data, // Original for AI
          metadata: result.metadata
        }
      };
    }
  });

  const results = await Promise.all(compressionPromises);
  
  return {
    forDatabase: results.map(r => r.processed.forDatabase),
    forAI: results.map(r => r.processed.forAI),
    compressionResults: results.map((r, index) => ({
      compressed: r.processed.forDatabase,
      thumbnail: r.processed.metadata.type === 'video' ? r.processed.forDatabase : undefined,
      metadata: r.processed.metadata,
      error: r.error
    }))
  };
}

/**
 * Check if media collection needs compression
 */
export function needsMediaCompression(
  mediaData: string[],
  textContent: string,
  maxMessageSize: number = 900 * 1024 // 900KB
): boolean {
  const testMessage = {
    content: textContent,
    media: mediaData,
    timestamp: new Date().toISOString()
  };
  
  const messageSize = new Blob([JSON.stringify(testMessage)]).size;
  return messageSize > maxMessageSize;
}

/**
 * Get total size of media collection
 */
export function getMediaCollectionSize(mediaData: string[]): {
  totalSize: number;
  formattedSize: string;
  breakdown: { index: number; size: number; formattedSize: string }[];
} {
  const breakdown = mediaData.map((data, index) => {
    const size = getImageSize(data); // Works for all base64 data
    return {
      index,
      size,
      formattedSize: formatSize(size)
    };
  });
  
  const totalSize = breakdown.reduce((sum, item) => sum + item.size, 0);
  
  return {
    totalSize,
    formattedSize: formatSize(totalSize),
    breakdown
  };
}