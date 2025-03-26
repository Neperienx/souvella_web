import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateMemory } from "../hooks/use-memories";
import { useUserRelationship } from "../hooks/use-relationship";
import { useCreateRelationship } from "../hooks/use-relationship";
import { Memory } from "@shared/schema";
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const onSubmit = (data: MemoryFormValues) => {
    if (!relationshipId) {
      toast({
        title: "No Relationship Found",
        description: "You need to create or join a relationship before sharing memories.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if user has already uploaded today
    if (alreadyUploadedToday) {
      toast({
        title: "Already uploaded today",
        description: "You've already shared a memory today. Come back tomorrow!",
        variant: "destructive",
      });
      return;
    }
    
    // Get user ID from Firebase
    const firebaseUid = auth.currentUser?.uid;
    
    if (!firebaseUid) {
      toast({
        title: "Authentication Error",
        description: "You need to be logged in to create memories.",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare memory data
    const memoryData = {
      userId: firebaseUid,
      relationshipId,
      type: memoryType,
      content: data.content,
      caption: memoryType === "image" ? data.caption : undefined,
      file: memoryType === "image" ? file || undefined : undefined
    };
    
    createMemory(memoryData);
    
    // Reset form
    form.reset();
    setFile(null);
    setMemoryType("text");
  };

  return (
    <section className="mb-8">
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 relative overflow-hidden">
        <div className="paper-clip"></div>
        <div className="tape w-32 -left-6 top-10 rotate-12"></div>
        
        <h2 className="font-serif text-2xl mb-4 text-center">Today's Memory</h2>
        <p className="font-script text-xl text-center mb-6 text-[var(--charcoal)]/80">
          {alreadyUploadedToday 
            ? "You've already shared a memory today. Come back tomorrow!" 
            : "What's your special moment today?"}
        </p>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col space-y-3">
            <textarea 
              {...form.register("content")}
              placeholder="Write your memory here..." 
              className="w-full p-4 rounded-xl border border-gray-200 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)] focus:outline-none min-h-[100px] bg-white/90"
              disabled={alreadyUploadedToday || isPending}
            />
            
            {form.formState.errors.content && (
              <p className="text-red-500 text-sm">{form.formState.errors.content.message}</p>
            )}
            
            {file && memoryType === "image" && (
              <div className="mt-3">
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
                disabled={alreadyUploadedToday || isPending}
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
                disabled={alreadyUploadedToday || isPending}
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
            disabled={alreadyUploadedToday || isPending || isCreatingRelationship}
            className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] transition rounded-xl shadow-md font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Memory"}
          </button>
        </form>
      </div>
    </section>
  );
}
