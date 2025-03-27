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

  try {
    // Handle iPhone HEIC/HEIF format if needed (requires conversion)
    // Note: browser-image-compression should handle this internally
    
    // Compress the image
    const compressedFile = await imageCompression(imageFile, imageCompressionOptions);
    
    console.log("IMAGE COMPRESSION: Compressed size:", Math.round(compressedFile.size / 1024), "KB");
    console.log("IMAGE COMPRESSION: Compressed type:", compressedFile.type);
    console.log("IMAGE COMPRESSION: Size reduction:", 
      Math.round((1 - compressedFile.size / imageFile.size) * 100), "%");
    
    return compressedFile;
  } catch (error) {
    console.error("IMAGE COMPRESSION: Error compressing image:", error);
    // Return original file if compression fails
    return imageFile;
  }
}

/**
 * Process audio file to optimize for storage
 * @param audioFile - Original audio file from input or recording
 * @returns Promise with processed audio File
 */
export async function processAudio(audioFile: File): Promise<File> {
  console.log("AUDIO PROCESSING: Starting for", audioFile.name);
  console.log("AUDIO PROCESSING: Original size:", Math.round(audioFile.size / 1024), "KB");
  console.log("AUDIO PROCESSING: Original type:", audioFile.type);
  
  // For now, we'll just return the original file
  // In a future enhancement, we could add audio compression/conversion here
  return audioFile;
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