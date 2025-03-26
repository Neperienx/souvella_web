import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import { useCreateRelationship, useJoinRelationship, useUserRelationship } from "../hooks/use-relationship";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";

interface InvitePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
}

const inviteSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export default function InvitePartnerModal({ isOpen, onClose, inviteCode: propInviteCode }: InvitePartnerModalProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"share" | "join">(propInviteCode ? "share" : "join");
  const { user } = useAuth();
  
  // Get the latest relationship data directly
  const { data: relationship } = useUserRelationship(user?.uid || null);
  const inviteCode = relationship?.inviteCode || propInviteCode;
  
  // Update viewMode when relationship/inviteCode changes
  useEffect(() => {
    if (inviteCode) {
      setViewMode("share");
    }
  }, [inviteCode]);
  
  const { mutate: createRelationship, isPending: isCreating } = useCreateRelationship();
  const { mutate: joinRelationship, isPending: isJoining } = useJoinRelationship();
  
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      inviteCode: "",
    },
  });

  const copyToClipboard = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateRelationship = async () => {
    if (user) {
      try {
        const result = await createRelationship(user.uid);
        // Force a refetch after creation to ensure we have the latest data
        queryClient.invalidateQueries({ queryKey: ["relationships/user", user.uid] });
      } catch (error) {
        console.error("Error creating relationship:", error);
      }
    }
  };

  const onSubmit = async (data: InviteFormValues) => {
    if (user) {
      try {
        await joinRelationship({
          uid: user.uid,
          inviteCode: data.inviteCode,
        });
        // Force a refetch after joining to ensure we have the latest data
        queryClient.invalidateQueries({ queryKey: ["relationships/user", user.uid] });
      } catch (error) {
        console.error("Error joining relationship:", error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="text-center mb-6">
          <h3 className="font-serif text-2xl mb-2">
            {viewMode === "share" 
              ? (inviteCode ? "Invite Your Partner" : "Create Relationship") 
              : "Join a Relationship"}
          </h3>
          <p className="text-[var(--charcoal)]/70">
            {viewMode === "share" 
              ? (inviteCode ? "Share this code with your partner to start your memory journey together!" : "Create a relationship to start sharing memories")
              : "Enter the invite code from your partner"}
          </p>
        </div>
        
        {viewMode === "share" ? (
          <>
            {inviteCode ? (
              <>
                <div className="bg-[var(--cream)] rounded-lg p-3 flex items-center mb-6">
                  <input 
                    type="text" 
                    value={inviteCode} 
                    className="bg-transparent flex-grow pr-2 border-none focus:ring-0 text-sm" 
                    readOnly
                  />
                  <button 
                    onClick={copyToClipboard}
                    className="bg-[var(--secondary)] py-1.5 px-3 rounded-lg text-sm font-medium hover:bg-[var(--secondary-dark)] transition"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="mb-4 bg-[var(--primary-light)]/30 p-4 rounded-lg text-sm">
                    <h4 className="font-medium mb-1">How to invite your partner:</h4>
                    <ol className="list-decimal pl-5 space-y-1 text-[var(--charcoal)]/80">
                      <li>Copy the invite code above</li>
                      <li>Share it with your partner via any method you prefer</li>
                      <li>Ask them to sign up and enter this code to join your relationship</li>
                    </ol>
                  </div>
                  
                  <button 
                    onClick={copyToClipboard}
                    className="w-full py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] transition rounded-xl shadow-md font-medium text-white flex items-center justify-center space-x-2"
                  >
                    {copied ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span>Copied Successfully!</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                        <span>Copy Invite Code</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={handleCreateRelationship}
                disabled={isCreating}
                className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] transition rounded-xl shadow-md font-medium text-white"
              >
                {isCreating ? "Creating..." : "Create Relationship"}
              </button>
            )}
            
            <p className="text-sm text-center mt-6">
              Need to join an existing relationship instead? 
              <button 
                onClick={() => setViewMode("join")} 
                className="text-[var(--primary-dark)] font-medium hover:underline ml-1"
              >
                Join here
              </button>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <input 
                  {...form.register("inviteCode")}
                  placeholder="Enter invite code" 
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)] focus:outline-none"
                />
                {form.formState.errors.inviteCode && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.inviteCode.message}</p>
                )}
              </div>
              
              <button 
                type="submit"
                disabled={isJoining}
                className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] transition rounded-xl shadow-md font-medium text-white"
              >
                {isJoining ? "Joining..." : "Join Relationship"}
              </button>
            </form>
            
            <p className="text-sm text-center mt-6">
              Need to create a new relationship instead? 
              <button 
                onClick={() => setViewMode("share")} 
                className="text-[var(--primary-dark)] font-medium hover:underline ml-1"
              >
                Create here
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
