import { useState } from "react";
import { getLastNMonths, formatDate, getTapePosition } from "../lib/utils";
import { Memory } from "@/lib/firebase-service";
import MemoryCard from "./memory-card";

interface MemoryTimelineProps {
  memories: Memory[];
  isLoading: boolean;
  relationshipId: number;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function MemoryTimeline({ 
  memories, 
  isLoading, 
  relationshipId,
  activeFilter,
  onFilterChange
}: MemoryTimelineProps) {
  const [activeMonth, setActiveMonth] = useState<Date>(new Date());
  const months = getLastNMonths(12);

  // Filter memories by month
  const filteredMemories = memories.filter(memory => {
    const memoryDate = new Date(memory.createdAt);
    return (
      memoryDate.getMonth() === activeMonth.getMonth() &&
      memoryDate.getFullYear() === activeMonth.getFullYear()
    );
  });

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl">Memory Timeline</h2>
          <div className="flex space-x-2">
            <div className="py-1 px-3 bg-white/80 rounded-lg text-sm shadow-sm animate-pulse w-16 h-8"></div>
            <div className="py-1 px-3 bg-white/30 rounded-lg text-sm shadow-sm animate-pulse w-16 h-8"></div>
            <div className="py-1 px-3 bg-white/30 rounded-lg text-sm shadow-sm animate-pulse w-16 h-8"></div>
          </div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 animate-pulse">
          <div className="flex overflow-x-auto pb-3 space-x-4">
            {[1, 2, 3, 4, 5, 6].map((_, index) => (
              <div key={index} className="flex flex-col items-center min-w-[80px]">
                <div className="w-16 h-16 rounded-full bg-gray-200"></div>
                <div className="h-4 w-8 bg-gray-200 mt-1 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl">Memory Timeline</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => onFilterChange("all")}
            className={`py-1 px-3 ${activeFilter === "all" ? "bg-white/80" : "bg-white/30"} rounded-lg text-sm shadow-sm hover:bg-white transition`}
          >
            All
          </button>
          <button 
            onClick={() => onFilterChange("image")}
            className={`py-1 px-3 ${activeFilter === "image" ? "bg-white/80" : "bg-white/30"} rounded-lg text-sm shadow-sm hover:bg-white/50 transition`}
          >
            Photos
          </button>
          <button 
            onClick={() => onFilterChange("audio")}
            className={`py-1 px-3 ${activeFilter === "audio" ? "bg-white/80" : "bg-white/30"} rounded-lg text-sm shadow-sm hover:bg-white/50 transition`}
          >
            Voice
          </button>
          <button 
            onClick={() => onFilterChange("text")}
            className={`py-1 px-3 ${activeFilter === "text" ? "bg-white/80" : "bg-white/30"} rounded-lg text-sm shadow-sm hover:bg-white/50 transition`}
          >
            Text
          </button>
        </div>
      </div>
      
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex overflow-x-auto pb-3 space-x-4 scrollbar-thin">
          {months.map((month, index) => (
            <div key={index} className="flex flex-col items-center min-w-[80px]">
              <button
                onClick={() => setActiveMonth(month.date)}
                className={`w-16 h-16 rounded-full ${
                  month.month === activeMonth.toLocaleString('en-US', { month: 'short' }) && 
                  month.year === activeMonth.toLocaleString('en-US', { year: 'numeric' })
                    ? "bg-[var(--primary)]/60" 
                    : "bg-[var(--secondary)]/20 hover:bg-[var(--secondary)]/40"
                } flex items-center justify-center transition cursor-pointer`}
              >
                <span className="font-medium">{month.month}</span>
              </button>
              <span className="text-sm mt-1">{month.year}</span>
            </div>
          ))}
        </div>
      </div>
      
      {filteredMemories.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-md p-8 text-center">
          <p className="font-script text-xl mb-2 text-[var(--charcoal)]/80">No memories for this period</p>
          <p className="text-sm text-[var(--charcoal)]/60">
            Try selecting a different month or creating new memories!
          </p>
        </div>
      ) : (
        <div className="relative pb-12 before:content-[''] before:absolute before:top-0 before:bottom-0 before:left-4 sm:before:left-1/2 before:w-0.5 before:bg-[var(--primary)]/30">
          {filteredMemories.map((memory, index) => (
            <div key={memory.id} className="relative mb-10">
              <div className="absolute left-4 sm:left-1/2 -ml-3 sm:-ml-3 w-6 h-6 rounded-full bg-[var(--primary)] shadow-sm z-10"></div>
              
              <div className={`relative ml-12 sm:ml-0 ${index % 2 === 0 ? 'sm:mr-1/2 sm:pr-8' : 'sm:ml-1/2 sm:pl-8'}`}>
                <MemoryCard
                  memory={memory}
                  tapePosition={index}
                  relationshipId={relationshipId}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
