import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useUserRelationship } from "../hooks/use-relationship";
import { useRelationshipMemories, useNewMemories, useMarkMemoriesAsViewed } from "../hooks/use-memories";
import { useUserNickname } from "@/hooks/use-relationship-settings"; 
import { Memory } from "@/lib/firebase-service";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { getRelationshipById } from "@/lib/relationship-service";

import Header from "../components/header";
import MemoryTimeline from "../components/memory-timeline";
import MobileNavigation from "../components/mobile-navigation";
import InvitePartnerModal from "../components/invite-partner-modal";
import RelationshipNameEditor from "../components/relationship-name-editor";

interface TimelinePageProps {
  params?: {
    relationshipId?: string;
  };
}

export default function TimelinePage({ params }: TimelinePageProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<number | null>(
    params?.relationshipId ? Number(params.relationshipId) : null
  );
  
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  // Use specified relationship ID when available, otherwise get primary relationship
  const { data: relationship, isLoading: relationshipLoading } = 
    selectedRelationshipId 
      ? useQuery({
          queryKey: ["relationships/specific", selectedRelationshipId],
          queryFn: async () => {
            if (!selectedRelationshipId) return null;
            const rel = await getRelationshipById(selectedRelationshipId);
            return rel;
          },
          enabled: !!selectedRelationshipId,
        })
      : useUserRelationship(user?.uid || null);
  
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

  // Handle navigation - keep the relationship ID when navigating
  const handleHomeClick = () => {
    if (relationship) {
      navigate(`/home/${relationship.id}`);
    } else {
      navigate("/");
    }
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

  // Return loading state if relationship data is still loading
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
        {relationship && (
          <div className="mb-6 bg-white/60 backdrop-blur-sm rounded-lg px-4 py-3 shadow-sm flex items-center justify-between">
            <RelationshipNameEditor relationship={relationship} />
            
            <button
              onClick={showInviteModal}
              className="text-sm px-3 py-1 bg-[var(--primary-light)] text-[var(--primary-dark)] rounded-md hover:bg-[var(--primary-light)/80] transition"
            >
              Invite Partner
            </button>
          </div>
        )}
        
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
        relationshipId={relationship?.id}
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
