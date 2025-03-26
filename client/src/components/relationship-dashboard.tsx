import { useState } from "react";
import { Relationship } from "@shared/schema";
import { useCreateRelationship, useJoinRelationship } from "../hooks/use-relationship";
import { useToast } from "@/hooks/use-toast";

interface RelationshipDashboardProps {
  userId: string;
  onRelationshipCreated?: () => void;
}

export default function RelationshipDashboard({ userId, onRelationshipCreated }: RelationshipDashboardProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const { toast } = useToast();
  
  const { mutate: createRelationship, isPending: isCreating } = useCreateRelationship();
  const { mutate: joinRelationship, isPending: isJoining } = useJoinRelationship();
  
  const handleCreateRelationship = () => {
    createRelationship(userId);
    
    // Use manual timing to open the invite modal after a short delay
    // to allow for API response and state update
    setTimeout(() => {
      if (onRelationshipCreated) {
        onRelationshipCreated();
      }
    }, 1000);
  };
  
  const handleJoinRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteCode) {
      toast({
        title: "Error",
        description: "Please enter an invite code",
        variant: "destructive",
      });
      return;
    }
    
    joinRelationship({ uid: userId, inviteCode });
  };
  
  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 relative overflow-hidden">
      <div className="paper-clip"></div>
      <div className="tape w-32 -left-6 top-10 rotate-12"></div>
      
      <h2 className="font-serif text-2xl mb-2 text-center">Welcome to Memory Jar</h2>
      <p className="font-script text-xl text-center mb-2 text-[var(--charcoal)]/80">
        Your digital memory scrapbook
      </p>
      <p className="text-center mb-6 text-[var(--charcoal)]/70">
        Create a new relationship or join an existing one using your partner's invite code to start sharing daily memories together.
      </p>
      
      <div className="space-y-6">
        {!showJoinForm ? (
          <div className="space-y-4">
            <button
              onClick={handleCreateRelationship}
              disabled={isCreating}
              className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] transition rounded-xl shadow-md font-medium text-white disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create a New Relationship"}
            </button>
            
            <p className="text-center text-[var(--charcoal)]/60">- or -</p>
            
            <button
              onClick={() => setShowJoinForm(true)}
              className="w-full py-3 bg-[var(--secondary)] hover:bg-[var(--secondary-dark)] transition rounded-xl shadow-md font-medium"
            >
              Join Existing Relationship
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoinRelationship} className="space-y-4">
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-[var(--charcoal)] mb-1">
                Enter Invite Code
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter the invite code from your partner"
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary-light)] focus:outline-none bg-white/90"
                required
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowJoinForm(false)}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 transition rounded-xl shadow-md font-medium"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isJoining}
                className="flex-1 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] transition rounded-xl shadow-md font-medium text-white disabled:opacity-50"
              >
                {isJoining ? "Joining..." : "Join Relationship"}
              </button>
            </div>
          </form>
        )}
        
        <div className="bg-[var(--cream)]/50 p-4 rounded-xl">
          <h3 className="font-serif text-lg mb-2">How Memory Jar Works</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-[var(--primary)]/20 rounded-full flex items-center justify-center mr-2">
                <span className="font-medium text-sm">1</span>
              </div>
              <p className="text-sm text-[var(--charcoal)]/80">
                Create or join a relationship to connect with your partner
              </p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-[var(--primary)]/20 rounded-full flex items-center justify-center mr-2">
                <span className="font-medium text-sm">2</span>
              </div>
              <p className="text-sm text-[var(--charcoal)]/80">
                Share one memory each day through text, photos, or voice notes
              </p>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-[var(--primary)]/20 rounded-full flex items-center justify-center mr-2">
                <span className="font-medium text-sm">3</span>
              </div>
              <p className="text-sm text-[var(--charcoal)]/80">
                Build a timeline of your relationship that you can revisit anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}