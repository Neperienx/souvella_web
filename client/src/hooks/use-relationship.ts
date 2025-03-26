import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Relationship } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  getUserPrimaryRelationship, 
  createRelationship, 
  addUserToRelationship,
  getRelationshipByInviteCode
} from "@/lib/relationship-service";

// Hook to fetch user's primary relationship
export function useUserRelationship(uid: string | null) {
  return useQuery<Relationship | null>({
    queryKey: ["relationships/user", uid],
    queryFn: async () => {
      if (!uid) return null;
      return await getUserPrimaryRelationship(uid);
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
        // Create the relationship in Firebase
        const newRelationship = await createRelationship();
        
        // Add the user to this relationship
        await addUserToRelationship(uid, newRelationship.id);
        
        return newRelationship;
      } catch (error) {
        console.error("Error in createRelationship mutation:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Immediately update the relationship query cache with the new data
      queryClient.setQueryData(["relationships/user", variables], data);
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["relationships/user", variables] });
      
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
        // Find the relationship by invite code
        const relationship = await getRelationshipByInviteCode(inviteCode);
        
        if (!relationship) {
          throw new Error("Invalid invite code. Please check and try again.");
        }
        
        // Add the user to this relationship
        await addUserToRelationship(uid, relationship.id);
        
        return relationship;
      } catch (error) {
        console.error("Error in joinRelationship mutation:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Immediately update the relationship query cache with the new data
      queryClient.setQueryData(["relationships/user", variables.uid], data);
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["relationships/user", variables.uid] });
      
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
