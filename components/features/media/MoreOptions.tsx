"use client";

import React, { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { addToWatchList, updateGenreStats } from "@/lib/supabase/clientQueries";

type MoreOptionsProps = {
  user_id: string;
  media_type: string;
  media_id: number;
  genre_ids: bigint[];
};

const MoreOptions = ({
  user_id,
  media_type,
  media_id,
  genre_ids,
}: MoreOptionsProps) => {
  const [isSaving, setIsSaving] = useState<string | null>(null); // Set initial state to null

  const { toast } = useToast();

  const handleSaveToWatchLater = () => {
    setIsSaving("watch_later");
  };
  const handleSaveToWatching = () => {
    setIsSaving("watching");
  };
  const handleSaveToPlanned = () => {
    setIsSaving("planned");
  };
  const handleSaveToWatched = () => {
    setIsSaving("watched");
  };

  useEffect(() => {
    const saveData = async () => {
      if (isSaving !== null) {
        // Only proceed if isSaving is not null
        try {
          const data = await addToWatchList(
            user_id,
            media_type,
            media_id,
            isSaving,
          );
          if (!data.includes("Error")) {
            await updateGenreStats({
              genreIds: genre_ids,
              mediaType: media_type,
              userId: user_id,
            });
          }
          toast({
            title: data,
          });
        } catch (error) {
          console.error("Error saving to watch list", error);
        } finally {
          setIsSaving(null); // Reset isSaving to null after the operation
        }
      }
    };

    saveData();
  }, [isSaving, user_id, media_type, media_id, toast]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <img
          src="/assets/icons/more-vert.svg"
          alt=""
          className="invert-on-dark h-[20px] w-[20px]"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="border-none bg-background p-0"
        align="start"
      >
        <div className="h-full w-full bg-foreground/10">
          <div
            className="flex h-full w-full flex-row items-center gap-4 p-2 hover:cursor-pointer hover:bg-foreground/20"
            onClick={handleSaveToWatching}
          >
            <img
              src="/assets/icons/folder-outline.svg"
              alt=""
              className="invert-on-dark h-[24px] w-[24px]"
            />
            <p>Watching</p>
          </div>
          <div
            className="flex h-full w-full flex-row items-center gap-4 p-2 hover:cursor-pointer hover:bg-foreground/20"
            onClick={handleSaveToPlanned}
          >
            <img
              src="/assets/icons/folder-outline.svg"
              alt=""
              className="invert-on-dark h-[24px] w-[24px]"
            />
            <p>Planned</p>
          </div>
          <div
            className="flex h-full w-full flex-row items-center gap-4 p-2 hover:cursor-pointer hover:bg-foreground/20"
            onClick={handleSaveToWatched}
          >
            <img
              src="/assets/icons/folder-outline.svg"
              alt=""
              className="invert-on-dark h-[24px] w-[24px]"
            />
            <p>Watched</p>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MoreOptions;
