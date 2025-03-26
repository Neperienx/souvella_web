import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useUserRelationship } from "../hooks/use-relationship";
import { 
  useDailyMemories, 
  useRelationshipMemories, 
  useNewMemories,
  useMarkMemoriesAsViewed
} from "../hooks/use-memories";
import { queryClient } from "@/lib/queryClient";

import Header from "../components/header";
import DailyUpload from "../components/daily-upload";
import DailyMemories from "../components/daily-memories";
import RelationshipDashboard from "../components/relationship-dashboard";
import MobileNavigation from "../components/mobile-navigation";
import InvitePartnerModal from "../components/invite-partner-modal";
import MemoryCard from "../components/memory-card";
import { formatDate } from "../lib/utils";

export default function HomePage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  // Get user's relationship data
  const { data: relationship, isLoading: relationshipLoading } = useUserRelationship(user?.uid || null);
  
  // Get daily memories for this relationship
  const { data: dailyMemories, isLoading: memoriesLoading } = useDailyMemories(relationship?.id || null);
  
  // Get all memories for this relationship
  const { data: allMemories } = useRelationshipMemories(relationship?.id || null);
  
  // Filter today's uploaded memories (using string comparison instead of trying to convert UID to number)
  const todaysDate = new Date().toISOString().split('T')[0];
  const todaysUploadedMemories = (allMemories || []).filter(memory => {
    const memoryDate = new Date(memory.createdAt).toISOString().split('T')[0];
    return memoryDate === todaysDate && String(memory.userId) === user?.uid;
  });
  
  // Get newly added memories
  const { data: newMemories, isLoading: newMemoriesLoading } = useNewMemories(relationship?.id || null);
  
  // Mark new memories as viewed after 5 seconds
  const { mutate: markAsViewed } = useMarkMemoriesAsViewed(relationship?.id || null);
  
  useEffect(() => {
    if (newMemories && newMemories.length > 0) {
      const timer = setTimeout(() => {
        markAsViewed();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [newMemories, markAsViewed]);

  // Handle navigation
  const handleTimelineClick = () => {
    navigate("/timeline");
  };

  // Show invite modal
  const showInviteModal = () => {
    // Force a refetch of relationship data before showing the modal
    queryClient.invalidateQueries({ queryKey: ["/api/relationships/user", user?.uid] });
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
          <RelationshipDashboard 
            userId={user?.uid || ""} 
            onRelationshipCreated={showInviteModal}
          />
        ) : (
          // Show memory content if user has a relationship
          <>
            <DailyUpload 
              userId={user?.uid || ""} 
              relationshipId={relationship?.id} 
              memories={dailyMemories || []}
            />
            
            {/* New Memories Section */}
            {newMemories && newMemories.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl text-[var(--primary-dark)]">✨ New Memories</h2>
                  <span className="font-script text-lg text-[var(--primary-dark)]">{formatDate(new Date())}</span>
                </div>
                
                <div className="grid grid-cols-1 gap-4 relative">
                  <div className="absolute -top-2 left-4 -rotate-6 z-10">
                    <div className="bg-yellow-300 p-2 font-script text-lg shadow-md transform rotate-3 animate-pulse">
                      Just Added!
                    </div>
                  </div>
                  
                  {newMemories.map((memory, index) => (
                    <div key={memory.id} className="relative mt-4">
                      <MemoryCard 
                        memory={memory} 
                        tapePosition={index} 
                        relationshipId={relationship?.id || 0} 
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
            
            {/* Daily Memories Section */}
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
