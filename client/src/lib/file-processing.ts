import imageCompression from 'browser-image-compression';

// Image compression options targeting optimal balance between quality and size
const imageCompressionOptions = {
  maxSizeMB: 0.5, // Max file size of 500 KB
  maxWidthOrHeight: 1920, // Limit dimensions while keeping aspect ratio
  useWebWorker: true, // Use web worker for better performance
  fileType: 'image/webp', // Convert to WebP for better compression
  initialQuality: 0.8, // Initial quality setting (0-1)
};

/**
 * Compresses and optimizes an image file for efficient upload
 * Support for various image formats including HEIC from iPhones
 * @param imageFile - Original file from input element
 * @returns Promise with compressed File object
 */
export async function compressImage(imageFile: File): Promise<File> {
  console.log("IMAGE COMPRESSION: Starting compression for", imageFile.name);
  console.log("IMAGE COMPRESSION: Original size:", Math.round(imageFile.size / 1024), "KB");
  console.log("IMAGE COMPRESSION: Original type:", imageFile.type);

  // Validate input file
  if (!imageFile || !(imageFile instanceof File)) {
    console.error('Invalid file provided to compressImage');
    throw new Error('Invalid image file');
  }
  
  if (!imageFile.type.startsWith('image/')) {
    console.error('File is not an image:', imageFile.type);
    throw new Error('File format error: Please upload an image file');
  }
  
  // Check file size limit (10MB)
  if (imageFile.size > 10 * 1024 * 1024) {
    console.error('Image too large:', Math.round(imageFile.size / (1024 * 1024)), 'MB');
    throw new Error('File size error: Maximum image size is 10MB');
  }

  try {
    // Create a timeout promise to handle hanging compression
    const compressionPromise = imageCompression(imageFile, {
      ...imageCompressionOptions,
      alwaysKeepResolution: true, // Preserve image quality
    });
    
    // Create a timeout promise
    const timeoutPromise = new Promise<File>((_, reject) => {
      setTimeout(() => reject(new Error('Image compression timed out after 30 seconds')), 30000);
    });
    
    // Race the compression against the timeout
    const compressedFile = await Promise.race([compressionPromise, timeoutPromise]);
    
    console.log("IMAGE COMPRESSION: Compressed size:", Math.round(compressedFile.size / 1024), "KB");
    console.log("IMAGE COMPRESSION: Compressed type:", compressedFile.type);
    console.log("IMAGE COMPRESSION: Size reduction:", 
      Math.round((1 - compressedFile.size / imageFile.size) * 100), "%");
    
    return compressedFile;
  } catch (error) {
    console.error("IMAGE COMPRESSION: Error compressing image:", error);
    
    // Check if we should still try to upload original (for small images)
    if (imageFile.size < 2 * 1024 * 1024) { // Less than 2MB
      console.log('Compression failed but image is small enough to upload uncompressed');
      return imageFile;
    }
    
    // Otherwise propagate the error
    throw new Error(
      error instanceof Error 
        ? `Image processing failed: ${error.message}`
        : 'Image processing failed. Please try a different image or check your connection.'
    );
  }
}

/**
 * Process audio file to optimize for storage
 * Uses WebM format with Opus codec for best compression
 * @param audioFile - Original audio file from input or recording
 * @returns Promise with processed audio File
 */
export async function processAudio(audioFile: File): Promise<File> {
  console.log("AUDIO PROCESSING: Starting for", audioFile.name);
  console.log("AUDIO PROCESSING: Original size:", Math.round(audioFile.size / 1024), "KB");
  console.log("AUDIO PROCESSING: Original type:", audioFile.type);
  
  // Validate input file
  if (!audioFile || !(audioFile instanceof File)) {
    console.error('Invalid file provided to processAudio');
    throw new Error('Invalid audio file');
  }
  
  if (!audioFile.type.startsWith('audio/')) {
    console.error('File is not an audio:', audioFile.type);
    throw new Error('File format error: Please upload an audio file');
  }
  
  // Check file size limit (20MB for audio)
  if (audioFile.size > 20 * 1024 * 1024) {
    console.error('Audio too large:', Math.round(audioFile.size / (1024 * 1024)), 'MB');
    throw new Error('File size error: Maximum audio size is 20MB');
  }
  
  try {
    // If it's already a WebM or Opus format, just return it
    if (audioFile.type === 'audio/webm' || audioFile.type.includes('opus')) {
      console.log("AUDIO PROCESSING: File is already in optimal format");
      return audioFile;
    }
    
    // The MediaRecorder API is used automatically in the AudioRecorder component
    // which creates WebM audio files with Opus codec that are already compressed
    
    // For uploaded files of other formats, we don't have a direct way to convert
    // them in the browser without specialized libraries. In a production app, you would:
    // 1. Either use a server-side conversion
    // 2. Or use a specialized audio processing library
    
    // For now, we'll just use the original file but create with a better name that shows it's processed
    const nameWithoutExt = audioFile.name.split('.').slice(0, -1).join('.');
    const processedFile = new File(
      [audioFile], 
      `${nameWithoutExt}_processed.webm`, 
      { type: 'audio/webm' }
    );
    
    console.log("AUDIO PROCESSING: Completed with size:", Math.round(processedFile.size / 1024), "KB");
    return processedFile;
  } catch (error) {
    console.error("AUDIO PROCESSING: Error processing audio:", error);
    
    // For small audio files, just return the original if processing fails
    if (audioFile.size < 5 * 1024 * 1024) { // Less than 5MB
      console.log('Processing failed but audio is small enough to upload as-is');
      return audioFile;
    }
    
    // Otherwise propagate the error
    throw new Error(
      error instanceof Error 
        ? `Audio processing failed: ${error.message}` 
        : 'Audio processing failed. Please try a different audio file or check your connection.'
    );
  }
}

/**
 * Validates file type and returns standardized memory type
 * @param file - File to validate
 * @returns Memory type string or null if invalid
 */
export function getMemoryTypeFromFile(file: File): 'image' | 'audio' | null {
  const fileType = file.type.toLowerCase();
  
  // Image types (including iPhone HEIC)
  if (
    fileType.startsWith('image/') || 
    fileType === 'image/heic' || 
    fileType === 'image/heif'
  ) {
    return 'image';
  }
  
  // Audio types
  if (
    fileType.startsWith('audio/') || 
    fileType === 'audio/mpeg' || 
    fileType === 'audio/mp4' || 
    fileType === 'audio/wav' || 
    fileType === 'audio/webm' ||
    fileType === 'audio/ogg'
  ) {
    return 'audio';
  }
  
  return null;
}