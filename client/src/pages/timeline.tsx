import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import { useUserRelationship } from "../hooks/use-relationship";
import { useRelationshipMemories } from "../hooks/use-memories";
import { Memory } from "@/lib/firebase-service";

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

  // Handle navigation
  const handleHomeClick = () => {
    navigate("/");
  };

  // Show invite modal
  const showInviteModal = () => {
    setIsInviteModalOpen(true);
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
        userName={user?.displayName || "User"} 
        notifications={2} 
        photoURL={user?.photoURL || undefined}
        relationship={relationship || undefined}
        onShowInvite={showInviteModal}
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
