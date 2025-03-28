import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Relationship } from "@shared/schema";
import { useUserRelationships, useCreateRelationship, useJoinRelationship } from "@/hooks/use-relationship";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InvitePartnerModal from "@/components/invite-partner-modal";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, loading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [joinCode, setJoinCode] = useState("");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);

  // Fetch user relationships
  const { data: relationships, isLoading: isRelationshipsLoading } = useUserRelationships(user?.uid || null);
  
  // Mutations for creating and joining relationships
  const createRelationship = useCreateRelationship();
  const joinRelationship = useJoinRelationship();

  const handleCreateRelationship = async () => {
    if (!user) return;
    
    try {
      const newRelationship = await createRelationship.mutateAsync(user.uid);
      
      setSelectedRelationship(newRelationship);
      setShowInviteDialog(true);
      
      toast({
        title: "Success",
        description: "Your new relationship has been created",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create relationship",
        variant: "destructive",
      });
    }
  };

  const handleJoinRelationship = async () => {
    if (!user || !joinCode) return;
    
    try {
      await joinRelationship.mutateAsync({
        uid: user.uid,
        inviteCode: joinCode
      });
      
      setShowJoinDialog(false);
      setJoinCode("");
      
      toast({
        title: "Success",
        description: "You've successfully joined the relationship",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid invite code or relationship not found",
        variant: "destructive",
      });
    }
  };

  const goToRelationship = (relationshipId: number) => {
    navigate(`/home/${relationshipId}`);
  };

  const openInviteModal = (relationship: Relationship) => {
    setSelectedRelationship(relationship);
    setShowInviteDialog(true);
  };

  if (isAuthLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--cream)]">
      <Header 
        userName={user.displayName || "User"}
        notifications={0} 
        photoURL={user.photoURL || undefined}
      />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif mb-2">Your Relationships</h1>
          <p className="text-[var(--charcoal)]/70">
            Create or join a relationship to share memories with your partner or friend
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Relationship Card */}
          <Card className="bg-white/80 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Create New</CardTitle>
              <CardDescription>
                Start a new relationship and invite your partner
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center p-6">
              <div className="w-16 h-16 bg-[var(--primary-light)] rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[var(--primary)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button 
                onClick={handleCreateRelationship}
                disabled={createRelationship.isPending}
                className="bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
              >
                {createRelationship.isPending ? "Creating..." : "Create Relationship"}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Join Existing Relationship Card */}
          <Card className="bg-white/80 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Join Existing</CardTitle>
              <CardDescription>
                Join an existing relationship with an invite code
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center p-6">
              <div className="w-16 h-16 bg-[var(--secondary-light)] rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[var(--secondary-dark)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button 
                onClick={() => setShowJoinDialog(true)}
                variant="outline"
                className="border-[var(--secondary)] text-[var(--secondary-dark)] hover:bg-[var(--secondary-light)]"
              >
                Enter Invite Code
              </Button>
            </CardFooter>
          </Card>
          
          {/* Existing Relationships */}
          {isRelationshipsLoading ? (
            <Card className="bg-white/80 backdrop-blur-md shadow-sm">
              <CardContent className="flex justify-center items-center p-12">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ) : relationships && relationships.length > 0 ? (
            relationships.map((relationship: Relationship) => (
              <Card 
                key={relationship.id} 
                className="bg-white/80 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <CardTitle>Relationship #{relationship.id}</CardTitle>
                  <CardDescription>
                    Created on {new Date(relationship.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="w-16 h-16 bg-[var(--primary-light)] rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[var(--primary)]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center gap-3">
                  <Button 
                    onClick={() => goToRelationship(relationship.id)}
                    className="bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
                  >
                    View Memories
                  </Button>
                  <Button 
                    onClick={() => openInviteModal(relationship)}
                    variant="outline"
                    className="border-[var(--primary)] text-[var(--primary-dark)]"
                  >
                    Invite Partner
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : null}
        </div>
      </main>
      
      {/* Join Relationship Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join a Relationship</DialogTitle>
            <DialogDescription>
              Enter the invite code you received to join an existing relationship
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input 
                id="inviteCode" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter the 6-letter invite code"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleJoinRelationship}
              disabled={!joinCode || joinRelationship.isPending}
              className="bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
            >
              {joinRelationship.isPending ? "Joining..." : "Join Relationship"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Invite Partner Modal */}
      {selectedRelationship && (
        <InvitePartnerModal
          isOpen={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          inviteCode={selectedRelationship.inviteCode}
        />
      )}
    </div>
  );
}