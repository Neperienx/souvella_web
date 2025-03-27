import { useState, useEffect, useRef } from 'react';
import AudioRecorderPolyfill from 'audio-recorder-polyfill';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Square, Play, Pause } from 'lucide-react';

// Type definition for BlobEvent if not available in TypeScript
interface BlobEvent extends Event {
  data: Blob;
  timecode?: number;
}

type AudioRecorderProps = {
  onAudioCaptured: (audioBlob: File) => void;
  onCancel: () => void;
};

export default function AudioRecorder({ onAudioCaptured, onCancel }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize recorder
  useEffect(() => {
    // Use polyfill for browsers that don't support MediaRecorder
    if (!window.MediaRecorder) {
      console.log("AUDIO: Using MediaRecorder polyfill");
      window.MediaRecorder = AudioRecorderPolyfill;
    }
    
    // Set initialized state
    setInitialized(true);
    
    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);
  
  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      
      // Get user microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create media recorder instance with optimized settings
      // Try to use the most efficient codecs first
      let mimeType = 'audio/webm;codecs=opus'; // Best compression, good quality
      let options = {
        mimeType,
        audioBitsPerSecond: 128000 // 128kbps - good balance between quality and file size
      };
      
      // Check if the browser supports our preferred format
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fall back to standard WebM without specifying codec
        mimeType = 'audio/webm';
        options = {
          mimeType,
          audioBitsPerSecond: 128000
        };
        
        console.log("AUDIO: Primary codec not supported, falling back to:", mimeType);
      }
      
      try {
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        console.log("AUDIO: Recording with format:", mimeType, "at 128kbps");
      } catch (err) {
        console.error("AUDIO: Error creating MediaRecorder with specified options:", err);
        // Last resort - use default options
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        console.log("AUDIO: Fallback to default MediaRecorder settings");
      }
      
      // Clear previous recording data
      audioChunksRef.current = [];
      setRecordingDuration(0);
      
      // Get the MediaRecorder instance from the ref
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        throw new Error("MediaRecorder not initialized properly");
      }
      
      // Setup recording handlers
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        // Create blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Generate playback URL
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
        
        // Stop all media tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Clear recording timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        console.log("AUDIO: Recording completed.", 
          `Size: ${Math.round(audioBlob.size / 1024)} KB, Duration: ${recordingDuration}s`);
      };
      
      // Start the recording
      recorder.start();
      setRecording(true);
      
      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      console.log("AUDIO: Recording started");
      
    } catch (err: any) {
      console.error("AUDIO: Error starting recording:", err);
      setError(`Could not access microphone: ${err.message}`);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };
  
  // Toggle audio playback
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setPlaying(!playing);
  };
  
  // Handle audio playback ended
  const handleAudioEnded = () => {
    setPlaying(false);
  };
  
  // Save the recording
  const saveRecording = () => {
    if (audioBlob) {
      // Get current date for filename
      const now = new Date();
      const dateStr = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
      
      // Get the size in KB for the filename
      const sizeKB = Math.round(audioBlob.size / 1024);
      
      // Get the mime type from the blob
      const mimeType = audioBlob.type || 'audio/webm';
      
      // Extract codec info if present
      const codecMatch = mimeType.match(/;codecs=([^;]+)/);
      const codecInfo = codecMatch ? `-${codecMatch[1]}` : '';
      
      // Create a File from the Blob with proper metadata including size and format info
      const audioFile = new File(
        [audioBlob], 
        `voice-memo-${dateStr}${codecInfo}-${sizeKB}kb.webm`, 
        { type: mimeType }
      );
      
      console.log("AUDIO: Saving recording:", audioFile.name, `(${sizeKB}KB)`);
      onAudioCaptured(audioFile);
    }
  };
  
  // Format seconds as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p>Initializing audio recorder...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-2">
        <p className="text-red-500">{error}</p>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4 bg-white/90 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium">Voice Memo</h3>
      
      {audioUrl ? (
        <>
          <div className="flex items-center space-x-2 w-full">
            <Button 
              variant="outline" 
              size="icon"
              onClick={togglePlayback}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <audio 
                ref={audioRef} 
                src={audioUrl} 
                onEnded={handleAudioEnded}
                onTimeUpdate={() => {
                  // Update progress visually if needed
                }}
              />
            </div>
            <span className="text-sm font-mono">{formatDuration(recordingDuration)}</span>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={saveRecording}>Save Voice Memo</Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center p-4 rounded-full bg-red-500/10">
            <Mic className={`h-12 w-12 ${recording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
          </div>
          
          <div className="text-center">
            <div className="text-xl font-mono">
              {recording ? formatDuration(recordingDuration) : '00:00'}
            </div>
            <div className="text-sm text-gray-500">
              {recording ? 'Recording...' : 'Ready to record'}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            {recording ? (
              <Button variant="destructive" onClick={stopRecording}>
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            ) : (
              <Button onClick={startRecording}>
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}