import { useState } from "react";
import { formatDate, getTapePosition } from "../lib/utils";
import { Memory } from "@/lib/firebase-service";
import { useReactToMemory, useRemainingThumbsUp } from "../hooks/use-memories";
import { useAuth } from "../hooks/use-auth";
import { useUserNickname } from "@/hooks/use-relationship-settings";
import AudioPlayer from "./audio-player";

interface MemoryCardProps {
  memory: Memory;
  tapePosition: number;
  relationshipId: number;
}

export default function MemoryCard({ memory, tapePosition, relationshipId }: MemoryCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { mutate: reactToMemory, isPending } = useReactToMemory();
  const { user } = useAuth();
  const { data: remainingThumbsUp = 0 } = useRemainingThumbsUp(user?.uid || null, relationshipId);
  
  // Get the author's nickname if available
  const { data: authorNickname } = useUserNickname(memory.userId, relationshipId);

  const handleThumbsUp = () => {
    if (!user?.uid) return;
    
    reactToMemory({ 
      memoryId: String(memory.id),
      relationshipId,
      userId: user.uid
    });
  };

  const renderMemoryContent = () => {
    switch (memory.type) {
      case 'image':
        return (
          <div className="polaroid bg-white p-2 border border-gray-100 shadow-lg mb-4 max-w-xs mx-auto rotate-2">
            <img 
              src={memory.imageUrl || memory.content} 
              alt="Memory" 
              className="w-full h-48 object-cover"
            />
            {memory.caption ? (
              <p className="font-script text-center mt-2 pt-1 px-2 text-[var(--charcoal)]/90 border-t border-dashed border-gray-200">
                {memory.caption}
              </p>
            ) : null}
            <p className="font-script text-center mt-2 text-[var(--charcoal)]/80">
              {formatDate(new Date(memory.createdAt))}
            </p>
          </div>
        );
      
      case 'audio':
        return memory.imageUrl ? (
          <div className="mb-4">
            <AudioPlayer 
              audioUrl={memory.imageUrl} 
              caption={memory.caption || memory.content}
              showFileInfo={true} // Enable file information for audio memories
            />
          </div>
        ) : (
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-[var(--accent)]/30 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[var(--charcoal)]/70">Voice Memory</p>
              <p className="font-medium">{memory.content}</p>
              <p className="text-xs text-red-500">Audio file unavailable</p>
            </div>
          </div>
        );
      
      default: // text
        return (
          <p className="text-[var(--charcoal)] mb-4">{memory.content}</p>
        );
    }
  };

  const tapeClass = getTapePosition(tapePosition);

  return (
    <div className="memory-card relative bg-white rounded-xl shadow-md p-5 overflow-hidden">
      <div className={`tape w-24 ${tapeClass}`}></div>
      
      <div className="mb-3 flex justify-between items-start">
        <div className="flex flex-col">
          <span className="font-script text-lg text-[var(--primary-dark)]">
            {formatDate(new Date(memory.createdAt))}
          </span>
          {/* Display author nickname or user ID */}
          <span className="text-xs text-[var(--charcoal)]/70 mt-1">
            From: {authorNickname || `Partner ${memory.userId.substring(0, 4)}`}
          </span>
        </div>
        <span className="like-badge flex items-center space-x-1 text-sm bg-[var(--secondary)]/40 py-1 px-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
          </svg>
          <span>{memory.thumbsUpCount}</span>
        </span>
      </div>
      
      {renderMemoryContent()}
      
      <div className="flex justify-end space-x-2 items-center">
        {remainingThumbsUp > 0 && (
          <span className="text-xs text-[var(--accent-dark)] font-medium">
            {remainingThumbsUp} {remainingThumbsUp === 1 ? 'thumb up' : 'thumbs up'} left today
          </span>
        )}
        <button
          onClick={handleThumbsUp}
          disabled={isPending || remainingThumbsUp <= 0}
          className={`react-btn flex items-center space-x-1 py-1 px-3 rounded-full transition-colors ${
            remainingThumbsUp > 0 
              ? 'text-[var(--primary-dark)] hover:text-[var(--primary)]' 
              : 'text-gray-400 cursor-not-allowed'
          }`}
          title={remainingThumbsUp <= 0 ? "You've used all your thumbs up for today" : "Love this memory"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill={remainingThumbsUp > 0 ? "none" : "currentColor"} 
            viewBox="0 0 24 24" 
            strokeWidth="1.5" 
            stroke="currentColor" 
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <span>Love this</span>
        </button>
      </div>
    </div>
  );
}
