import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateMemory } from "../hooks/use-memories";
import { useUserRelationship } from "../hooks/use-relationship";
import { useCreateRelationship } from "../hooks/use-relationship";
import { Memory, checkFirebaseStorage } from "@/lib/firebase-service";
import { hasUploadedToday } from "../lib/utils";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";

// Form schema with optional caption field
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
  });

  const handleAddPhoto = () => {
    setMemoryType("image");
    fileInputRef.current?.click();
  };

  const handleAddVoice = () => {
    setMemoryType("audio");
    // Logic for voice recording would go here
    toast({
      title: "Coming Soon",
      description: "Voice recording will be available in a future update!",
    });
  };
  
  // Function to test Firebase Storage
  const handleTestStorage = async () => {
    console.log("STORAGE TEST: Starting Firebase Storage test");
    
    toast({
      title: "Testing Storage",
      description: "Testing Firebase Storage connection...",
    });
    
    try {
      const result = await checkFirebaseStorage();
      console.log("STORAGE TEST: Firebase Storage check result:", result);
      
      if (result) {
        toast({
          title: "Storage Test Passed",
          description: "Firebase Storage is working properly. You can upload images!",
        });
      } else {
        toast({
          title: "Storage Test Failed",
          description: "There was a problem connecting to Firebase Storage. Check console for details.",
          variant: "destructive"
        });
        
        toast({
          title: "Storage Setup Reminder",
          description: "Make sure Firebase Storage Rules in your Firebase console allow read/write access. Default rules may be too restrictive.",
        });
      }
    } catch (error) {
      console.error("STORAGE TEST: Error testing Firebase Storage:", error);
      toast({
        title: "Storage Test Error",
        description: "An error occurred while testing Firebase Storage. Check console for details.",
        variant: "destructive"
      });
      
      // Suggest checking Firebase Storage rules
      toast({
        title: "Firebase Storage Rules",
        description: "Check your Firebase Storage rules in the Firebase console. You may need to update them to: rules_version = '2'; service firebase.storage { match /b/{bucket}/o { match /{allPaths=**} { allow read, write: if request.auth != null; } } }",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      console.log("FILE DEBUG: File selected:", {
        name: selectedFile.name,
        type: selectedFile.type,
        size: `${Math.round(selectedFile.size / 1024)} KB`
      });
      
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        console.error("FILE DEBUG: Invalid file type:", selectedFile.type);
        toast({
          title: "Invalid file",
          description: "Please select an image file (JPEG, PNG, etc.)",
          variant: "destructive"
        });
        return;
      }
      
      try {
        console.log("FILE DEBUG: Creating preview URL");
        // Create a preview URL for the image
        const objectUrl = URL.createObjectURL(selectedFile);
        
        // Set the state with file information
        setFile(selectedFile);
        setPreviewUrl(objectUrl);
        setMemoryType("image");
        console.log("FILE DEBUG: Preview URL created successfully");
        
        // Set a default value for the content field if empty
        if (!form.getValues('content')) {
          form.setValue('content', 'Image memory');
        }
      } catch (error) {
        console.error("FILE DEBUG: Error creating preview:", error);
        toast({
          title: "Error processing image",
          description: "There was a problem with this image. Please try another one.",
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
    
    // Determine the correct memory type based on whether a file is selected
    const actualMemoryType = (memoryType === "image" && file) ? "image" : "text";
    console.log(`SUBMIT DEBUG: Memory type set to ${actualMemoryType} (selected type was ${memoryType}, file present: ${!!file})`);
    
    // Prepare memory data with correct file handling
    const memoryData = {
      userId: firebaseUid,
      relationshipId,
      type: actualMemoryType,
      content: data.content,
      caption: actualMemoryType === "image" ? data.caption : undefined,
      file: actualMemoryType === "image" && file ? file : undefined
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
        
        <h2 className="font-serif text-2xl mb-4 text-center">Today's Memory</h2>
        <p className="font-script text-xl text-center mb-6 text-[var(--charcoal)]/80">
          {/* Debug mode: always show "What's your special moment today?" */}
          What's your special moment today?
        </p>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col space-y-3">
            <textarea 
              {...form.register("content")}
              placeholder="Write your memory here..." 
              className="w-full p-4 rounded-xl border border-gray-200 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)] focus:outline-none min-h-[100px] bg-white/90"
              disabled={isPending}
            />
            
            {form.formState.errors.content && (
              <p className="text-red-500 text-sm">{form.formState.errors.content.message}</p>
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
            
            <input
              type="file"
              accept="image/*"
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
              
              <button 
                type="button" 
                onClick={handleTestStorage}
                disabled={isPending}
                className="flex items-center space-x-2 px-4 py-2 bg-green-200 text-green-800 rounded-xl hover:bg-green-300 transition disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>Test Storage</span>
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
