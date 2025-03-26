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
          <div className="flex items-center space-x-3">
            <span className="font-script text-xl text-[var(--primary-dark)]">{formatDate(today)}</span>
            <button 
              disabled={true}
              className="text-sm px-3 py-1 rounded-lg bg-gray-200 text-gray-500 opacity-50 cursor-not-allowed flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reroll
            </button>
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
          <div className="flex items-center space-x-3">
            <span className="font-script text-xl text-[var(--primary-dark)]">{formatDate(today)}</span>
            <button 
              onClick={handleReroll}
              className="text-sm px-3 py-1 rounded-lg bg-[var(--secondary)]/60 hover:bg-[var(--secondary)]/80 transition flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Generate Memories
            </button>
          </div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-md p-8 text-center">
          <p className="font-script text-xl mb-2 text-[var(--charcoal)]/80">No memories to display yet</p>
          <p className="text-sm text-[var(--charcoal)]/60 mb-4">
            Start creating memories together or generate some from your memory collection!
          </p>
          <button
            onClick={handleReroll}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition flex items-center mx-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Generate Daily Memories
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl">Today's Memory Gems</h2>
        <div className="flex items-center space-x-3">
          <span className="font-script text-xl text-[var(--primary-dark)]">{formatDate(today)}</span>
          <button 
            onClick={handleReroll}
            className="text-sm px-3 py-1 rounded-lg bg-[var(--secondary)]/60 hover:bg-[var(--secondary)]/80 transition flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reroll
          </button>
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
      
      {/* Debug information - only visible in development */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg text-xs">
        <h3 className="font-bold mb-2">Debug Info:</h3>
        <p>Selected memories: {memories.length}</p>
        <p>Memory IDs and weights:</p>
        <ul className="list-disc pl-4 mt-1 space-y-1">
          {memories.map(memory => (
            <li key={memory.id}>ID: {memory.id} - Thumbs Up: {memory.thumbsUpCount}</li>
          ))}
        </ul>
        <p className="mt-2 text-gray-500">Note: Memories with more thumbs up have a higher chance of being selected.</p>
      </div>
    </section>
  );
}
