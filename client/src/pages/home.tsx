import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useUserRelationship } from "../hooks/use-relationship";
import { useDailyMemories, useRelationshipMemories } from "../hooks/use-memories";

import Header from "../components/header";
import DailyUpload from "../components/daily-upload";
import DailyMemories from "../components/daily-memories";
import RelationshipDashboard from "../components/relationship-dashboard";
import MobileNavigation from "../components/mobile-navigation";
import InvitePartnerModal from "../components/invite-partner-modal";
import { formatDate } from "../lib/utils";

export default function HomePage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  // Get user's relationship data
  const { data: relationship, isLoading: relationshipLoading } = useUserRelationship(user?.uid || null);
  
  // Get daily memories for this relationship
  const { data: dailyMemories, isLoading: memoriesLoading } = useDailyMemories(relationship?.id || null);
  
  // Get today's uploaded memories from this user
  const { data: allMemories } = useRelationshipMemories(relationship?.id || null);
  const today = new Date().toISOString().split('T')[0];
  const todaysUploadedMemories = allMemories?.filter(memory => {
    const memoryDate = new Date(memory.createdAt).toISOString().split('T')[0];
    return memoryDate === today && memory.userId === 1; // TODO: Replace with actual user ID
  }) || [];

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
        {!relationship ? (
          // Show relationship dashboard if user has no relationship
          <RelationshipDashboard userId={user?.uid || ""} />
        ) : (
          // Show memory content if user has a relationship
          <>
            <DailyUpload 
              userId={user?.uid || ""} 
              relationshipId={relationship?.id} 
              memories={dailyMemories || []}
            />
            
            {todaysUploadedMemories.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl">Your Uploaded Memory</h2>
                  <span className="font-script text-lg text-[var(--primary-dark)]">{formatDate(new Date())}</span>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {todaysUploadedMemories.map((memory, index) => (
                    <div key={memory.id} className="bg-[var(--primary-light)]/40 backdrop-blur-sm rounded-xl p-4 shadow-md">
                      <p className="font-medium mb-1">Today's Upload:</p>
                      <p className="text-[var(--charcoal)]">{memory.content}</p>
                      <div className="flex justify-end mt-2">
                        <span className="text-sm text-[var(--charcoal)]/60">
                          Saved at {new Date(memory.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            
            <DailyMemories 
              memories={dailyMemories || []} 
              isLoading={memoriesLoading} 
              relationshipId={relationship?.id || 0}
            />
          </>
        )}
      </main>
      
      <MobileNavigation 
        activePath="home" 
        onTimelineClick={handleTimelineClick} 
      />
      
      {isInviteModalOpen && relationship && (
        <InvitePartnerModal 
          isOpen={isInviteModalOpen} 
          onClose={() => setIsInviteModalOpen(false)} 
          inviteCode={relationship?.inviteCode || ""} 
        />
      )}
    </div>
  );
}
