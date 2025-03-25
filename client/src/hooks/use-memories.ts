import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Memory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Hook to fetch all memories for a relationship
export function useRelationshipMemories(relationshipId: number | null) {
  return useQuery<Memory[]>({
    queryKey: ["/api/memories/relationship", relationshipId],
    enabled: !!relationshipId,
  });
}

// Hook to fetch daily memories
export function useDailyMemories(relationshipId: number | null) {
  return useQuery<Memory[]>({
    queryKey: ["/api/daily-memories", relationshipId],
    enabled: !!relationshipId,
  });
}

// Hook to upload a new memory
export function useCreateMemory() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (memory: {
      userId: number;
      relationshipId: number;
      type: string;
      content: string;
    }) => {
      const res = await apiRequest("POST", "/api/memories", memory);
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate both memories and daily memories
      queryClient.invalidateQueries({ queryKey: ["/api/memories/relationship", variables.relationshipId] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-memories", variables.relationshipId] });
      
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
    mutationFn: async ({ memoryId, relationshipId }: { memoryId: number; relationshipId: number }) => {
      const res = await apiRequest("POST", `/api/memories/${memoryId}/react`, {});
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate both memories and daily memories
      queryClient.invalidateQueries({ queryKey: ["/api/memories/relationship", variables.relationshipId] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-memories", variables.relationshipId] });
    },
  });
}
