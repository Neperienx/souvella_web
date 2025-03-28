import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Relationship } from "@shared/schema";
import { useUpdateRelationshipName } from "@/hooks/use-relationship";

interface RelationshipNameEditorProps {
  relationship: Relationship;
}

export default function RelationshipNameEditor({ relationship }: RelationshipNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(relationship.name || `Relationship #${relationship.id}`);
  
  const { mutate: updateName, isPending } = useUpdateRelationshipName();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      // Default to the relationship ID if name is empty
      setName(`Relationship #${relationship.id}`);
      return;
    }
    
    updateName(
      { 
        relationshipId: relationship.id,
        name: name.trim()
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        }
      }
    );
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setName(relationship.name || `Relationship #${relationship.id}`);
  };
  
  const displayName = relationship.name || `Relationship #${relationship.id}`;
  
  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter relationship name"
          className="p-1 border border-gray-300 rounded text-lg font-serif focus:border-[var(--primary)] focus:outline-none"
          autoFocus
        />
        <button 
          type="submit" 
          disabled={isPending}
          aria-label="Save name"
          className="p-1 rounded-full hover:bg-[var(--primary-light)]"
        >
          <Check className="h-5 w-5 text-[var(--primary)]" />
        </button>
        <button 
          type="button" 
          onClick={handleCancel}
          aria-label="Cancel"
          className="p-1 rounded-full hover:bg-red-100"
        >
          <X className="h-5 w-5 text-red-600" />
        </button>
      </form>
    );
  }
  
  return (
    <div className="flex items-center">
      <h1 className="font-serif text-2xl">{displayName}</h1>
      <button 
        onClick={() => setIsEditing(true)}
        aria-label="Edit relationship name"
        className="ml-2 p-1 rounded-full hover:bg-[var(--primary-light)]"
      >
        <Pencil className="h-4 w-4 text-[var(--primary)]" />
      </button>
    </div>
  );
}