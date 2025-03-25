import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useUserRelationship } from "../hooks/use-relationship";
import { useDailyMemories } from "../hooks/use-memories";

import Header from "../components/header";
import DailyUpload from "../components/daily-upload";
import DailyMemories from "../components/daily-memories";
import MobileNavigation from "../components/mobile-navigation";
import InvitePartnerModal from "../components/invite-partner-modal";

export default function HomePage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  // Get user's relationship data
  const { data: relationship, isLoading: relationshipLoading } = useUserRelationship(user?.uid || null);
  
  // Get daily memories for this relationship
  const { data: dailyMemories, isLoading: memoriesLoading } = useDailyMemories(relationship?.id || null);

  // Handle navigation
  const handleTimelineClick = () => {
    navigate("/timeline");
  };

  // Show invite modal
  const showInviteModal = () => {
    setIsInviteModalOpen(true);
  };

  if (relationshipLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--cream)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--primary-dark)] mx-auto"></div>
          <p className="mt-4 font-serif text-lg text-[var(--charcoal)]">Loading relationship data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <Header 
        userName={user?.displayName || "User"} 
        notifications={2} 
        photoURL={user?.photoURL || undefined}
        relationship={relationship}
        onShowInvite={showInviteModal}
      />
      
      <main className="container mx-auto px-4 py-6">
        <DailyUpload 
          userId={user?.uid || ""} 
          relationshipId={relationship?.id} 
          memories={dailyMemories || []}
        />
        
        <DailyMemories 
          memories={dailyMemories || []} 
          isLoading={memoriesLoading} 
          relationshipId={relationship?.id || 0}
        />
      </main>
      
      <MobileNavigation 
        activePath="home" 
        onTimelineClick={handleTimelineClick} 
      />
      
      {isInviteModalOpen && (
        <InvitePartnerModal 
          isOpen={isInviteModalOpen} 
          onClose={() => setIsInviteModalOpen(false)} 
          inviteCode={relationship?.inviteCode || ""} 
        />
      )}
    </div>
  );
}
