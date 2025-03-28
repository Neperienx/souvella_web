import { useState } from "react";
import { formatDate } from "../lib/utils";
import { Memory } from "@/lib/firebase-service";
import { useRerollDailyMemories } from "@/hooks/use-memories";
import MemoryCard from "./memory-card";

interface DailyMemoriesProps {
  memories: Memory[];
  isLoading: boolean;
  relationshipId: number;
}

export default function DailyMemories({ memories, isLoading, relationshipId }: DailyMemoriesProps) {
  const today = new Date();
  const { mutate: rerollMemories, isPending: isRerolling } = useRerollDailyMemories();
  
  const handleReroll = () => {
    rerollMemories({ relationshipId, count: 3 });
  };
  
  if (isLoading || isRerolling) {
    return (
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl">Today's Memory Gems</h2>
          <div className="flex items-center">
            <span className="font-script text-xl text-[var(--primary-dark)]">{formatDate(today)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3].map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md p-5 animate-pulse">
              <div className="mb-3 flex justify-between items-start">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-24 bg-gray-200 rounded mb-4"></div>
              <div className="flex justify-end">
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  
  if (memories.length === 0) {
    return (
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl">Today's Memory Gems</h2>
          <div className="flex items-center">
            <span className="font-script text-xl text-[var(--primary-dark)]">{formatDate(today)}</span>
          </div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-md p-8 text-center">
          <p className="font-script text-xl mb-2 text-[var(--charcoal)]/80">No memories to display yet</p>
          <p className="text-sm text-[var(--charcoal)]/60 mb-4">
            Create special memories together to see them appear here!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl">Today's Memory Gems</h2>
        <div className="flex items-center">
          <span className="font-script text-xl text-[var(--primary-dark)]">{formatDate(today)}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {memories.map((memory, index) => (
          <MemoryCard
            key={memory.id}
            memory={memory}
            tapePosition={index % 4}
            relationshipId={relationshipId}
          />
        ))}
      </div>
    </section>
  );
}
