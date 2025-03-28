import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Relationship } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  getUserPrimaryRelationship,
  getUserRelationships as getRelationships,
  createRelationship, 
  addUserToRelationship,
  getRelationshipByInviteCode
} from "@/lib/relationship-service";

// Hook to fetch user's primary relationship
export function useUserRelationship(uid: string | null) {
  return useQuery<Relationship | null>({
    queryKey: ["relationships/user/primary", uid],
    queryFn: async () => {
      if (!uid) return null;
      return await getUserPrimaryRelationship(uid);
    },
    enabled: !!uid,
  });
}

// Hook to fetch all user's relationships
export function useUserRelationships(uid: string | null) {
  return useQuery<Relationship[]>({
    queryKey: ["relationships/user/all", uid],
    queryFn: async () => {
      if (!uid) return [];
      return await getRelationships(uid);
    },
    enabled: !!uid,
  });
}

// Hook to create a new relationship
export function useCreateRelationship() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (uid: string) => {
      try {
        console.log("Creating new relationship for user:", uid);
        
        // Create the relationship in Firebase
        const newRelationship = await createRelationship();
        console.log("Relationship created with ID:", newRelationship.id, "and code:", newRelationship.inviteCode);
        
        // Add the user to this relationship and get the updated relationship
        const updatedRelationship = await addUserToRelationship(uid, newRelationship.id);
        console.log("User added to relationship, returning:", updatedRelationship);
        
        return updatedRelationship;
      } catch (error) {
        console.error("Error in createRelationship mutation:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log("Relationship created successfully:", data);
      
      // Invalidate both the primary relationship and all relationships queries
      queryClient.invalidateQueries({ queryKey: ["relationships/user/primary", variables] });
      queryClient.invalidateQueries({ queryKey: ["relationships/user/all", variables] });
      
      toast({
        title: "Relationship Created",
        description: "Your relationship has been created. Share the invite code with your partner!",
      });
      
      return data;
    },
    onError: (error) => {
      console.error("Error creating relationship:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create relationship",
        variant: "destructive",
      });
    },
  });
}

// Hook to join a relationship with an invite code
export function useJoinRelationship() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ uid, inviteCode }: { uid: string; inviteCode: string }) => {
      try {
        console.log("Joining relationship with invite code:", inviteCode, "for user:", uid);
        
        // Find the relationship by invite code
        const relationship = await getRelationshipByInviteCode(inviteCode);
        
        if (!relationship) {
          console.error("Invalid invite code:", inviteCode);
          throw new Error("Invalid invite code. Please check and try again.");
        }
        
        console.log("Found relationship with ID:", relationship.id);
        
        // Add the user to this relationship and get the updated relationship
        const updatedRelationship = await addUserToRelationship(uid, relationship.id);
        console.log("User added to relationship, returning:", updatedRelationship);
        
        return updatedRelationship;
      } catch (error) {
        console.error("Error in joinRelationship mutation:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log("Successfully joined relationship:", data);
      
      // Invalidate both the primary relationship and all relationships queries
      queryClient.invalidateQueries({ queryKey: ["relationships/user/primary", variables.uid] });
      queryClient.invalidateQueries({ queryKey: ["relationships/user/all", variables.uid] });
      
      toast({
        title: "Joined Relationship",
        description: "You've successfully joined the relationship!",
      });
      
      return data;
    },
    onError: (error) => {
      console.error("Error joining relationship:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join relationship",
        variant: "destructive",
      });
    },
  });
}
