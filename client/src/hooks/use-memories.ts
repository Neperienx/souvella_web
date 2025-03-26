import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Memory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  getRelationshipMemories, 
  getDailyMemories, 
  getNewMemories,
  createMemory as createFirestoreMemory, 
  reactToMemory as reactToFirestoreMemory,
  markMemoriesAsViewed
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
      return getDailyMemories(relationshipId);
    },
    enabled: !!relationshipId,
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

// Hook to like a memory
export function useReactToMemory() {
  return useMutation({
    mutationFn: async ({ memoryId, relationshipId }: { memoryId: string; relationshipId: number }) => {
      // Use Firestore to react to the memory
      return reactToFirestoreMemory(memoryId);
    },
    onSuccess: (_, variables) => {
      // Invalidate all memory queries
      queryClient.invalidateQueries({ queryKey: ["memories", variables.relationshipId] });
      queryClient.invalidateQueries({ queryKey: ["dailyMemories", variables.relationshipId] });
      queryClient.invalidateQueries({ queryKey: ["newMemories", variables.relationshipId] });
    },
  });
}
