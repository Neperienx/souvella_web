import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useUserNickname, useUpdateUserNickname } from "@/hooks/use-relationship-settings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Form schema
const nicknameSchema = z.object({
  nickname: z.string().min(1, "Nickname is required").max(30, "Nickname is too long"),
});

type NicknameFormValues = z.infer<typeof nicknameSchema>;

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationshipId: number;
}

export default function UserSettingsModal({ isOpen, onClose, relationshipId }: UserSettingsModalProps) {
  const { user } = useAuth();
  const { data: currentNickname, isLoading: isNicknameLoading } = useUserNickname(
    user?.uid || null, 
    relationshipId
  );
  const updateNickname = useUpdateUserNickname();
  
  // Create form
  const form = useForm<NicknameFormValues>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: {
      nickname: currentNickname || user?.displayName || "",
    },
  });
  
  // When the nickname data loads, update the form
  useEffect(() => {
    if (isOpen && !isNicknameLoading) {
      if (currentNickname) {
        form.setValue("nickname", currentNickname);
      } else if (user?.displayName) {
        form.setValue("nickname", user.displayName);
      }
    }
  }, [isOpen, isNicknameLoading, currentNickname, user?.displayName, form]);
  
  // Handle form submission
  const onSubmit = (data: NicknameFormValues) => {
    if (!user?.uid) return;
    
    updateNickname.mutate({
      userId: user.uid,
      relationshipId,
      nickname: data.nickname,
    }, {
      onSuccess: (success) => {
        if (success) {
          onClose();
        }
      },
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Your Settings</DialogTitle>
          <DialogDescription>
            Customize how you appear to your partner in this relationship.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Nickname</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your nickname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="submit"
                disabled={updateNickname.isPending || isNicknameLoading}
              >
                {updateNickname.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}