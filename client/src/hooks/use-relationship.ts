import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Relationship } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Hook to fetch user's relationship
export function useUserRelationship(uid: string | null) {
  return useQuery<Relationship>({
    queryKey: ["/api/relationships/user", uid],
    enabled: !!uid,
  });
}

// Hook to create a new relationship
export function useCreateRelationship() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (uid: string) => {
      const res = await apiRequest("POST", "/api/relationships", { uid });
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Immediately update the relationship query cache with the new data
      queryClient.setQueryData(["/api/relationships/user", variables], data);
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/relationships/user", variables] });
      
      toast({
        title: "Relationship Created",
        description: "Your relationship has been created. Share the invite code with your partner!",
      });
      
      return data;
    },
    onError: (error) => {
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
      const res = await apiRequest("POST", "/api/relationships/join", { uid, inviteCode });
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Immediately update the relationship query cache with the new data
      queryClient.setQueryData(["/api/relationships/user", variables.uid], data);
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/relationships/user", variables.uid] });
      
      toast({
        title: "Joined Relationship",
        description: "You've successfully joined the relationship!",
      });
      
      return data;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join relationship",
        variant: "destructive",
      });
    },
  });
}
