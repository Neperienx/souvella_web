import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getUserNickname, updateUserNickname } from "@/lib/relationship-service";

// Hook to get a user's nickname in a relationship
export function useUserNickname(userId: string | null, relationshipId: number | null) {
  return useQuery({
    queryKey: ["userNickname", userId, relationshipId],
    queryFn: async () => {
      if (!userId || !relationshipId) return null;
      return getUserNickname(userId, relationshipId);
    },
    enabled: !!userId && !!relationshipId,
  });
}

// Hook to update a user's nickname
export function useUpdateUserNickname() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({
      userId,
      relationshipId,
      nickname
    }: {
      userId: string;
      relationshipId: number;
      nickname: string;
    }) => {
      return updateUserNickname(userId, relationshipId, nickname);
    },
    onSuccess: (success, variables) => {
      if (success) {
        toast({
          title: "Nickname Updated",
          description: "Your nickname has been updated successfully"
        });
        
        // Invalidate the cache for this user's nickname
        queryClient.invalidateQueries({ 
          queryKey: ["userNickname", variables.userId, variables.relationshipId] 
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update your nickname",
          variant: "destructive"
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update your nickname",
        variant: "destructive"
      });
    }
  });
}