import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Memory } from "@/lib/firebase-service";
import { 
  getRelationshipMemories, 
  getDailyMemories, 
  getNewMemories,
  createMemory as createFirestoreMemory, 
  reactToMemory as reactToFirestoreMemory,
  markMemoriesAsViewed,
  getUserRemainingThumbsUp,
  regenerateDailyMemories
} from "@/lib/firebase-service";

// Hook to fetch all memories for a relationship
export function useRelationshipMemories(relationshipId: number | null) {
  return useQuery<Memory[]>({
    queryKey: ["memories", relationshipId],
    queryFn: async () => {
      if (!relationshipId) return [];
      return getRelationshipMemories(relationshipId);
    },
    enabled: !!relationshipId,
  });
}

// Hook to fetch daily memories
export function useDailyMemories(relationshipId: number | null) {
  return useQuery<Memory[]>({
    queryKey: ["dailyMemories", relationshipId],
    queryFn: async () => {
      if (!relationshipId) return [];
      console.log(`Fetching daily memories in queryFn for relationship ${relationshipId}`);
      
      try {
        const memories = await getDailyMemories(relationshipId);
        console.log(`Successfully retrieved ${memories.length} daily memories:`, 
          memories.map(m => ({ id: m.id, type: m.type, thumbsUp: m.thumbsUpCount }))
        );
        return memories;
      } catch (error) {
        console.error(`Error fetching daily memories:`, error);
        throw error;
      }
    },
    enabled: !!relationshipId,
    // Refresh daily memories every minute
    refetchInterval: 60 * 1000, 
    // Use optimistic updates to show the loading state then the data
    staleTime: 0,
    refetchOnWindowFocus: true
  });
}

// Hook to fetch new memories
export function useNewMemories(relationshipId: number | null) {
  return useQuery<Memory[]>({
    queryKey: ["newMemories", relationshipId],
    queryFn: async () => {
      if (!relationshipId) return [];
      return getNewMemories(relationshipId);
    },
    enabled: !!relationshipId,
  });
}

// Hook to mark new memories as viewed
export function useMarkMemoriesAsViewed(relationshipId: number | null) {
  return useMutation({
    mutationFn: async () => {
      if (!relationshipId) return;
      return markMemoriesAsViewed(relationshipId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["newMemories", relationshipId] });
    }
  });
}

// Hook to upload a new memory
export function useCreateMemory() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (memory: {
      userId: string;
      relationshipId: number;
      type: string;
      content: string;
      caption?: string;
      file?: File;
    }) => {
      // Use Firestore to create the memory
      return createFirestoreMemory(memory);
    },
    onSuccess: (_, variables) => {
      // Invalidate all memory queries
      queryClient.invalidateQueries({ queryKey: ["memories", variables.relationshipId] });
      queryClient.invalidateQueries({ queryKey: ["dailyMemories", variables.relationshipId] });
      queryClient.invalidateQueries({ queryKey: ["newMemories", variables.relationshipId] });
      
      toast({
        title: "Memory Created",
        description: "Your memory has been saved successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create memory",
        variant: "destructive",
      });
    },
  });
}

// Hook to get user's remaining thumbs up for today
export function useRemainingThumbsUp(userId: string | null) {
  return useQuery<number>({
    queryKey: ["remainingThumbsUp", userId],
    queryFn: async () => {
      if (!userId) return 0;
      return getUserRemainingThumbsUp(userId);
    },
    enabled: !!userId,
    // Refresh every minute to ensure count is current
    refetchInterval: 60 * 1000
  });
}

// Hook to like a memory with daily limit
export function useReactToMemory() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      memoryId, 
      relationshipId, 
      userId 
    }: { 
      memoryId: string; 
      relationshipId: number;
      userId: string;
    }) => {
      // Use Firestore to react to the memory with the thumbs up limit
      return reactToFirestoreMemory(memoryId, userId);
    },
    onSuccess: (result, variables) => {
      // Show toast with the result message
      toast({
        title: result.success ? "Thumbs Up!" : "Cannot Add Thumbs Up",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
      // Invalidate all memory queries
      queryClient.invalidateQueries({ queryKey: ["memories", variables.relationshipId] });
      queryClient.invalidateQueries({ queryKey: ["dailyMemories", variables.relationshipId] });
      queryClient.invalidateQueries({ queryKey: ["newMemories", variables.relationshipId] });
      
      // Also invalidate remaining thumbs up count
      queryClient.invalidateQueries({ queryKey: ["remainingThumbsUp", variables.userId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add thumbs up",
        variant: "destructive",
      });
    }
  });
}

// Hook to reroll daily memories
export function useRerollDailyMemories() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      relationshipId, 
      count = 3 
    }: { 
      relationshipId: number; 
      count?: number;
    }) => {
      console.log(`Starting memory reroll for relationship ${relationshipId}, count: ${count}`);
      
      // Use Firestore to regenerate daily memories
      const memories = await regenerateDailyMemories(relationshipId, count);
      
      // Log the memories for debugging
      console.log(`Reroll completed. Selected ${memories.length} memories:`, 
        memories.map(m => ({ id: m.id, type: m.type, thumbsUp: m.thumbsUpCount }))
      );
      
      return memories;
    },
    onSuccess: (result, variables) => {
      // Show toast with the result message
      toast({
        title: "Memories Rerolled",
        description: `New selection of ${result.length} memories has been generated!`,
      });
      
      // Force refetch instead of just invalidating to ensure immediate update
      queryClient.invalidateQueries({ 
        queryKey: ["dailyMemories", variables.relationshipId],
        refetchType: 'all'  // Force immediate refetch
      });
      
      // If no memories were selected, wait a bit and refetch again
      if (result.length === 0) {
        setTimeout(() => {
          queryClient.invalidateQueries({ 
            queryKey: ["dailyMemories", variables.relationshipId],
            refetchType: 'all'
          });
        }, 1000);
      }
    },
    onError: (error) => {
      console.error("Error during reroll:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reroll memories",
        variant: "destructive",
      });
    }
  });
}
