import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateMemory } from "../hooks/use-memories";
import { useUserRelationship } from "../hooks/use-relationship";
import { useCreateRelationship } from "../hooks/use-relationship";
import { Memory } from "@/lib/firebase-service";
import { hasUploadedToday } from "../lib/utils";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import AudioRecorder from "./audio-recorder";

// Form schema with conditional validation
const memorySchema = z.object({
  content: z.string()
    .refine(val => val.trim().length > 0, {
      message: "Please enter some text for your memory",
      // Content is required only when file is not selected
      path: ["content"]
    }),
  caption: z.string().optional(),
});

type MemoryFormValues = z.infer<typeof memorySchema>;

interface DailyUploadProps {
  userId: string;
  relationshipId?: number;
  memories: Memory[];
}

export default function DailyUpload({ userId, relationshipId, memories }: DailyUploadProps) {
  const [memoryType, setMemoryType] = useState<"text" | "image" | "audio">("text");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const { mutate: createMemory, isPending } = useCreateMemory();
  const { mutate: createRelationship, isPending: isCreatingRelationship } = useCreateRelationship();
  
  const alreadyUploadedToday = hasUploadedToday(memories, userId);
  
  const form = useForm<MemoryFormValues>({
    resolver: zodResolver(memorySchema),
    defaultValues: {
      content: "",
    },
    // Skip content validation when a file is selected
    mode: "onSubmit",
  });
  
  // Custom validation handler
  const handleFormSubmit = form.handleSubmit((data: MemoryFormValues) => {
    // Override validation: if a file is selected, content field is not required
    if (file && (memoryType === "image" || memoryType === "audio")) {
      // Set a default content value if empty
      if (!data.content.trim()) {
        if (memoryType === "image") {
          form.setValue("content", "Image memory");
        } else {
          form.setValue("content", "Voice memory");
        }
      }
      // Proceed with submission
      onSubmit({...data, content: data.content || (memoryType === "image" ? "Image memory" : "Voice memory")});
    } else {
      // Normal submission (text only memories require content)
      onSubmit(data);
    }
  });

  const handleAddPhoto = () => {
    setMemoryType("image");
    fileInputRef.current?.click();
  };

  const [showRecorder, setShowRecorder] = useState(false);
  
  const handleAddVoice = () => {
    if (file && memoryType === "audio") {
      // If we already have an audio file, clear it
      setFile(null);
      setPreviewUrl(null);
      setMemoryType("text");
      return;
    }
    
    const supportsRecording = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    
    if (supportsRecording) {
      // Show the audio recorder
      setShowRecorder(true);
    } else {
      // Fallback to file upload for browsers that don't support recording
      setMemoryType("audio");
      fileInputRef.current?.click();
      toast({
        title: "Audio Upload",
        description: "Select an audio file to upload.",
      });
    }
  };
  
  const handleAudioCaptured = (audioFile: File) => {
    setFile(audioFile);
    setPreviewUrl(URL.createObjectURL(audioFile));
    setMemoryType("audio");
    setShowRecorder(false);
    
    // Set a default value for the content field if empty
    if (!form.getValues('content')) {
      form.setValue('content', 'Voice memory');
    }
    
    toast({
      title: "Voice Recorded",
      description: `Captured ${Math.round(audioFile.size / 1024)}KB audio file`,
    });
  };
  


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      console.log("FILE DEBUG: File selected:", {
        name: selectedFile.name,
        type: selectedFile.type,
        size: `${Math.round(selectedFile.size / 1024)} KB`
      });
      
      // Import the file processing utilities
      const { compressImage, getMemoryTypeFromFile } = await import('@/lib/file-processing');
      
      // Determine the memory type from the file
      const memoryType = getMemoryTypeFromFile(selectedFile);
      
      if (!memoryType) {
        console.error("FILE DEBUG: Unsupported file type:", selectedFile.type);
        toast({
          title: "Unsupported file type",
          description: "Please select an image or audio file.",
          variant: "destructive"
        });
        return;
      }
      
      try {
        console.log(`FILE DEBUG: Processing ${memoryType} file`);
        
        if (memoryType === 'image') {
          // Compress the image before uploading
          const compressedFile = await compressImage(selectedFile);
          
          // Create a preview URL for the compressed image
          const objectUrl = URL.createObjectURL(compressedFile);
          
          // Set the state with file information
          setFile(compressedFile);
          setPreviewUrl(objectUrl);
          setMemoryType("image");
          console.log("FILE DEBUG: Image compressed and preview created successfully");
          
          // Show compression result in the UI
          toast({
            title: "Image Optimized",
            description: `Reduced from ${Math.round(selectedFile.size / 1024)}KB to ${Math.round(compressedFile.size / 1024)}KB`,
          });
          
          // Set a default value for the content field if empty
          if (!form.getValues('content')) {
            form.setValue('content', 'Image memory');
          }
        } else if (memoryType === 'audio') {
          console.log("FILE DEBUG: Processing audio file");
          
          try {
            // Import and use the audio processing function
            const { processAudio } = await import('@/lib/file-processing');
            const processedAudioFile = await processAudio(selectedFile);
            
            // Create a preview URL for the processed audio
            const objectUrl = URL.createObjectURL(processedAudioFile);
            
            // Set the state with file information
            setFile(processedAudioFile);
            setPreviewUrl(objectUrl);
            setMemoryType("audio");
            
            console.log("FILE DEBUG: Audio file processed and preview created successfully");
            console.log("FILE DEBUG: Original size:", Math.round(selectedFile.size / 1024), "KB");
            console.log("FILE DEBUG: Processed size:", Math.round(processedAudioFile.size / 1024), "KB");
            
            // Show processing result in the UI
            toast({
              title: "Audio Processed",
              description: `Audio file prepared for upload (${Math.round(processedAudioFile.size / 1024)}KB)`,
            });
            
            // Set a default value for the content field if empty
            if (!form.getValues('content')) {
              form.setValue('content', 'Voice memory');
            }
          } catch (error) {
            console.error("FILE DEBUG: Error processing audio:", error);
            
            // Fallback to using the original file if processing fails
            const objectUrl = URL.createObjectURL(selectedFile);
            setFile(selectedFile);
            setPreviewUrl(objectUrl);
            setMemoryType("audio");
            
            // Set a default value for the content field if empty
            if (!form.getValues('content')) {
              form.setValue('content', 'Voice memory');
            }
          }
        }
      } catch (error) {
        console.error("FILE DEBUG: Error processing file:", error);
        toast({
          title: "Error processing file",
          description: "There was a problem with this file. Please try another one.",
          variant: "destructive"
        });
      }
    } else {
      console.log("FILE DEBUG: No file selected or file selection cancelled");
    }
  };

  const onSubmit = (data: MemoryFormValues) => {
    console.log("SUBMIT DEBUG: Starting memory submission process");
    
    if (!relationshipId) {
      console.log("SUBMIT DEBUG: No relationship ID found");
      toast({
        title: "No Relationship Found",
        description: "You need to create or join a relationship before sharing memories.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("SUBMIT DEBUG: Using relationship ID:", relationshipId);
    
    // Debug mode: remove daily upload limit for testing
    // if (alreadyUploadedToday) {
    //   toast({
    //     title: "Already uploaded today",
    //     description: "You've already shared a memory today. Come back tomorrow!",
    //     variant: "destructive",
    //   });
    //   return;
    // }
    
    // Get user ID from Firebase
    const firebaseUid = auth.currentUser?.uid;
    
    if (!firebaseUid) {
      console.log("SUBMIT DEBUG: User not logged in");
      toast({
        title: "Authentication Error",
        description: "You need to be logged in to create memories.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("SUBMIT DEBUG: User authenticated with ID:", firebaseUid);
    
    // Determine the correct memory type based on the current memory type and whether a file is selected
    const actualMemoryType = file ? memoryType : "text";
    console.log(`SUBMIT DEBUG: Memory type set to ${actualMemoryType} (selected type was ${memoryType}, file present: ${!!file})`);
    
    // For image or audio, if content is empty, set a default value
    let contentValue = data.content;
    if (actualMemoryType === "image" && !contentValue.trim()) {
      contentValue = "Image memory";
    } else if (actualMemoryType === "audio" && !contentValue.trim()) {
      contentValue = "Voice memory";
    }
    
    // Prepare memory data with correct file handling
    const memoryData = {
      userId: firebaseUid,
      relationshipId,
      type: actualMemoryType,
      content: contentValue,
      caption: (actualMemoryType === "image" || actualMemoryType === "audio") ? data.caption : undefined,
      file: file ? file : undefined
    };
    
    console.log("SUBMIT DEBUG: Prepared memory data:", {
      userId: firebaseUid,
      relationshipId,
      type: actualMemoryType,
      contentLength: data.content?.length || 0,
      hasCaption: !!memoryData.caption,
      hasFile: !!memoryData.file,
      fileType: memoryData.file ? memoryData.file.type : 'none',
      fileSize: memoryData.file ? `${Math.round(memoryData.file.size / 1024)} KB` : '0'
    });
    
    createMemory(memoryData);
    console.log("SUBMIT DEBUG: Memory creation mutation triggered");
    
    // Reset form
    form.reset();
    setFile(null);
    setPreviewUrl(null);
    setMemoryType("text");
    console.log("SUBMIT DEBUG: Form and state reset");
  };

  return (
    <section className="mb-8">
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 relative overflow-hidden">
        <div className="paper-clip"></div>
        <div className="tape w-32 -left-6 top-10 rotate-12"></div>
        
        {showRecorder ? (
          <div className="mb-6">
            <AudioRecorder 
              onAudioCaptured={handleAudioCaptured}
              onCancel={() => setShowRecorder(false)}
            />
          </div>
        ) : (
          <>
            <h2 className="font-serif text-2xl mb-4 text-center">Today's Memory</h2>
            <p className="font-script text-xl text-center mb-6 text-[var(--charcoal)]/80">
              {/* Debug mode: always show "What's your special moment today?" */}
              What's your special moment today?
            </p>
          </>
        )}
        
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="flex flex-col space-y-3">
            {/* Only show text area when no file is selected or when memory type is text */}
            {(!file || memoryType === "text") && (
              <>
                <textarea 
                  {...form.register("content")}
                  placeholder="Write your memory here..." 
                  className="w-full p-4 rounded-xl border border-gray-200 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)] focus:outline-none min-h-[100px] bg-white/90"
                  disabled={isPending}
                />
                
                {form.formState.errors.content && (
                  <p className="text-red-500 text-sm">{form.formState.errors.content.message}</p>
                )}
              </>
            )}
            
            {file && memoryType === "image" && (
              <div className="mt-3 space-y-3">
                {previewUrl && (
                  <div className="relative w-full aspect-video max-h-64 overflow-hidden rounded-lg border-2 border-[var(--primary)]/20 bg-white/90">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="object-contain w-full h-full" 
                    />
                  </div>
                )}
                <input
                  {...form.register("caption")}
                  placeholder="Add a caption to your photo..."
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)] focus:outline-none bg-white/90"
                  disabled={isPending}
                />
                <p className="text-sm text-gray-500 mt-1">Add a handwritten-style note to your photo</p>
              </div>
            )}
            
            {file && memoryType === "audio" && (
              <div className="mt-3 space-y-3">
                {previewUrl && (
                  <div className="bg-white/80 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="bg-[var(--accent)]/30 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--charcoal)]/70">Audio Preview</p>
                        <p className="font-medium">{file.name}</p>
                      </div>
                    </div>
                    <audio controls className="w-full mt-2" src={previewUrl}></audio>
                  </div>
                )}
                <input
                  {...form.register("caption")}
                  placeholder="Add a description for your voice memo..."
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)] focus:outline-none bg-white/90"
                  disabled={isPending}
                />
                <p className="text-sm text-gray-500 mt-1">Add context to your audio recording</p>
              </div>
            )}
            
            <input
              type="file"
              accept="image/*,audio/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="flex flex-wrap gap-3">
              <button 
                type="button" 
                onClick={handleAddPhoto}
                disabled={isPending}
                className="flex items-center space-x-2 px-4 py-2 bg-[var(--secondary)]/60 rounded-xl hover:bg-[var(--secondary)]/80 transition disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <span>{file ? file.name : "Add Photo"}</span>
              </button>
              
              <button 
                type="button" 
                onClick={handleAddVoice}
                disabled={isPending}
                className="flex items-center space-x-2 px-4 py-2 bg-[var(--accent)]/60 rounded-xl hover:bg-[var(--accent)]/80 transition disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
                <span>Add Voice</span>
              </button>
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={isPending || isCreatingRelationship}
            className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] transition rounded-xl shadow-md font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Memory"}
          </button>
        </form>
      </div>
    </section>
  );
}
