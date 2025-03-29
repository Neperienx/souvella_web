import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateMemory, useUserDailyUploadStatus } from "@/hooks/use-memories";
import { useCreateRelationship } from "@/hooks/use-relationship";
import { useToast } from "@/hooks/use-toast";
import AudioRecorder from "./audio-recorder";
import { getMemoryTypeFromFile, compressImage, processAudio } from "../lib/file-processing";
import { auth } from "../lib/firebase";
import { Memory } from "@shared/schema";

// Schema for memory form validation
const memorySchema = z.object({
  content: z.string().min(1, "Please enter some text for your memory"),
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
  const [showRecorder, setShowRecorder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const { mutate: createMemory, isPending } = useCreateMemory();
  const { mutate: createRelationship, isPending: isCreatingRelationship } = useCreateRelationship();
  
  // Check if user has already uploaded a memory today for this relationship
  const { data: dailyUploadStatus } = useUserDailyUploadStatus(userId, relationshipId || null);
  
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
      onSubmit({
        ...data,
        content: data.content.trim() || (memoryType === "image" ? "Image memory" : "Voice memory")
      });
    } else {
      // For text memories, require content
      if (!data.content.trim()) {
        form.setError("content", {
          type: "manual",
          message: "Please enter some text for your memory",
        });
        return;
      }
      // Standard submission
      onSubmit(data);
    }
  });
  
  // File selection handler
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    
    if (selectedFile) {
      // Determine the memory type from file
      const detectedType = getMemoryTypeFromFile(selectedFile);
      
      if (!detectedType) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image or audio file.",
          variant: "destructive",
        });
        return;
      }
      
      // Set the memory type based on the file
      setMemoryType(detectedType);
      
      // Process file if needed
      let processedFile = selectedFile;
      
      try {
        if (detectedType === "image") {
          processedFile = await compressImage(selectedFile);
        } else if (detectedType === "audio") {
          processedFile = await processAudio(selectedFile);
        }
        
        // Set the file state 
        setFile(processedFile);
        
        // Create object URL for preview
        const url = URL.createObjectURL(processedFile);
        setPreviewUrl(url);
        
        // Add cleanup to release object URL later
        return () => URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error processing file:", error);
        toast({
          title: "File Processing Error",
          description: "There was a problem processing your file. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Trigger file selection via button
  const handleAddPhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.click();
    }
  };
  
  // Trigger audio recording or upload
  const handleAddVoice = () => {
    if (navigator.mediaDevices?.getUserMedia) {
      // Show the audio recorder component
      setShowRecorder(true);
    } else {
      // Fallback to regular file upload for audio
      if (fileInputRef.current) {
        fileInputRef.current.accept = "audio/*";
        fileInputRef.current.click();
      }
    }
  };
  
  // Handle audio capture from recorder
  const handleAudioCaptured = (audioFile: File) => {
    setFile(audioFile);
    setMemoryType("audio");
    setShowRecorder(false);
    
    // Create preview URL
    const url = URL.createObjectURL(audioFile);
    setPreviewUrl(url);
  };
  
  // Form submission handler
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
    
    // Create the memory using the mutation
    createMemory({
      userId: firebaseUid,
      relationshipId,
      type: actualMemoryType,
      content: data.content,
      caption: data.caption,
      file: file || undefined
    }, {
      onSuccess: () => {
        console.log("SUBMIT DEBUG: Memory created successfully");
        
        // Reset form and file states
        form.reset();
        setFile(null);
        setPreviewUrl(null);
        setMemoryType("text");
        
        // Release object URL if one exists
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      }
    });
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
            {/* Daily upload limit disabled for testing */}
            <p className="font-script text-xl text-center mb-6 text-[var(--charcoal)]/80">
              What's your special moment today?
            </p>
            {/* For debugging: show all memories uploaded today */}
            {dailyUploadStatus?.hasUploaded && (
              <div className="text-xs text-gray-500 mb-3 text-center">
                <span>DEBUG MODE: Upload limit disabled</span>
                {dailyUploadStatus.todaysMemory && (
                  <span className="block mt-1">Last uploaded: "{dailyUploadStatus.todaysMemory.content}"</span>
                )}
              </div>
            )}
          </>
        )}
        
        {/* DEBUG MODE: Always show the form - daily limit disabled */}
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
                <span>{file && memoryType === "image" ? "Change Photo" : "Add Photo"}</span>
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
                <span>{file && memoryType === "audio" ? "Change Audio" : "Add Voice"}</span>
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