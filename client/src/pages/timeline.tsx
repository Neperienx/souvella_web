import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useUserRelationship } from "../hooks/use-relationship";
import { useRelationshipMemories, useNewMemories, useMarkMemoriesAsViewed } from "../hooks/use-memories";
import { useUserNickname } from "@/hooks/use-relationship-settings"; 
import { Memory } from "@/lib/firebase-service";
import { queryClient } from "@/lib/queryClient";

import Header from "../components/header";
import MemoryTimeline from "../components/memory-timeline";
import MobileNavigation from "../components/mobile-navigation";
import InvitePartnerModal from "../components/invite-partner-modal";

export default function TimelinePage() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  // Get user's relationship data
  const { data: relationship, isLoading: relationshipLoading } = useUserRelationship(user?.uid || null);
  
  // Get all memories for this relationship
  const { data: memories, isLoading: memoriesLoading } = useRelationshipMemories(relationship?.id || null);
  
  // Get newly added memories
  const { data: newMemories, isLoading: newMemoriesLoading } = useNewMemories(relationship?.id || null);
  
  // Mark new memories as viewed after 5 seconds
  const { mutate: markAsViewed } = useMarkMemoriesAsViewed(relationship?.id || null);
  
  // Use effect to mark memories as viewed after a delay (similar to home page)
  useEffect(() => {
    if (newMemories && newMemories.length > 0) {
      const timer = setTimeout(() => {
        markAsViewed();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [newMemories, markAsViewed]);

  // Handle navigation
  const handleHomeClick = () => {
    navigate("/");
  };

  // Show invite modal
  const showInviteModal = () => {
    setIsInviteModalOpen(true);
  };

  // Get user's nickname if available
  const { data: userNickname } = useUserNickname(
    user?.uid || null,
    relationship?.id || null
  );
  
  // Function to handle viewing notifications in UI
  const handleViewNotifications = () => {
    // Manually trigger a re-fetch of new memories to reflect changes
    queryClient.invalidateQueries({ queryKey: ["newMemories", relationship?.id] });
  };
  
  // Filter memories
  const filteredMemories = memories?.filter(memory => {
    if (activeFilter === "all") return true;
    return memory.type === activeFilter;
  }) || [];

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
        userName={userNickname || user?.displayName || "User"} 
        notifications={newMemories?.length || 0} 
        photoURL={user?.photoURL || undefined}
        relationship={relationship || undefined}
        onShowInvite={showInviteModal}
        onViewNotifications={handleViewNotifications}
      />
      
      <main className="container mx-auto px-4 py-6">
        <MemoryTimeline 
          memories={filteredMemories} 
          isLoading={memoriesLoading} 
          relationshipId={relationship?.id || 0}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </main>
      
      <MobileNavigation 
        activePath="timeline" 
        onHomeClick={handleHomeClick} 
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
