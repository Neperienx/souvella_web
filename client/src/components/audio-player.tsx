import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
  audioUrl: string;
  caption?: string;
  showFileInfo?: boolean; // Option to display technical file information
}

export default function AudioPlayer({ audioUrl, caption, showFileInfo = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<{
    format: string;
    fileSize: string;
    bitrate?: string;
  } | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    // Extract metadata from the URL and filename
    const extractAudioMetadata = () => {
      if (!showFileInfo) return;
      
      try {
        // Get file information from the URL
        const urlParts = audioUrl.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0];
        const decodedFilename = decodeURIComponent(filename);
        
        // Extract format
        let format = 'webm'; // Default format
        const extensionMatch = decodedFilename.match(/\.([^.]+)$/);
        if (extensionMatch) {
          format = extensionMatch[1].toLowerCase();
        }
        
        // Extract file size if available in filename (e.g. "32kb")
        let fileSize = 'Unknown';
        const sizeMatch = decodedFilename.match(/(\d+)kb/i);
        if (sizeMatch) {
          fileSize = `${sizeMatch[1]} KB`;
        }
        
        // Look for codec info
        let codecInfo = null;
        const codecMatch = decodedFilename.match(/-opus-|codecs=([^&-]+)/);
        if (codecMatch) {
          codecInfo = codecMatch[1] || 'opus';
        }
        
        // Determine bitrate based on format
        let bitrate = '128 kbps'; // Default
        if (format === 'mp3') {
          bitrate = '192 kbps';
        } else if (format === 'webm' || codecInfo === 'opus') {
          bitrate = '128 kbps';
        } else if (format === 'wav') {
          bitrate = '1411 kbps';
        }
        
        // Calculate actual bitrate if we have size and duration
        if (duration && sizeMatch) {
          const estimatedSize = parseInt(sizeMatch[1], 10) * 1024; // Size in bytes
          if (estimatedSize && duration > 0) {
            const calculatedBitrate = Math.round((estimatedSize * 8) / duration / 1000);
            bitrate = `${calculatedBitrate} kbps`;
          }
        }
        
        setAudioMetadata({
          format: codecInfo ? `${format} (${codecInfo})` : format,
          fileSize: fileSize,
          bitrate: bitrate
        });
        
        console.log("AUDIO PLAYER: Extracted metadata:", {
          format,
          fileSize,
          bitrate
        });
      } catch (error) {
        console.error("AUDIO PLAYER: Error extracting metadata:", error);
        setAudioMetadata({
          format: 'webm',
          fileSize: 'Unknown',
          bitrate: '128 kbps'
        });
      }
    };
    
    const handleCanPlay = () => {
      setIsLoading(false);
      setDuration(audio.duration);
      extractAudioMetadata(); // Extract metadata when audio is loaded
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };
    
    const handleError = (e: any) => {
      console.error("AUDIO PLAYER: Error loading audio", e);
      setError("Could not load audio file");
      setIsLoading(false);
    };
    
    // Add event listeners
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    // Set initial volume
    audio.volume = volume;
    
    // Clean up
    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, showFileInfo, duration]);
  
  // Play/pause toggle
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Seek to position
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  // Adjust volume
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };
  
  // Format time as MM:SS
  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-500 rounded-md p-3 text-center">
        Error loading audio: {error}
      </div>
    );
  }
  
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 shadow-sm border border-gray-200 space-y-3">
      {caption && (
        <p className="font-script text-lg text-center text-gray-800">{caption}</p>
      )}
      
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          disabled={isLoading}
          onClick={togglePlayPause}
          className="h-10 w-10 rounded-full bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)]"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>
        
        <div className="flex flex-col flex-1 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono">{formatTime(currentTime)}</span>
            <Slider
              disabled={isLoading}
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs font-mono">{formatTime(duration)}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={isLoading}
            onClick={toggleMute}
            className="h-8 w-8 rounded-full"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            disabled={isLoading}
            value={[isMuted ? 0 : volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-20"
          />
        </div>
      </div>
      
      {/* Audio File Information */}
      {showFileInfo && audioMetadata && (
        <div className="mt-2 text-xs text-gray-500 border-t border-gray-200 pt-2">
          <div className="grid grid-cols-3 gap-2">
            {audioMetadata.format && (
              <div>
                <span className="font-medium">Format:</span> {audioMetadata.format}
              </div>
            )}
            {audioMetadata.fileSize && (
              <div>
                <span className="font-medium">Size:</span> {audioMetadata.fileSize}
              </div>
            )}
            {audioMetadata.bitrate && (
              <div>
                <span className="font-medium">Bitrate:</span> {audioMetadata.bitrate}
              </div>
            )}
            <div>
              <span className="font-medium">Duration:</span> {formatTime(duration)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}