import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { iframeLinks } from "@/lib/constants/links";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const ProviderDropdown = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const handleProviderSelection = (providerName: string) => {
    localStorage.setItem("video_provider", providerName);

    const selectedProvider = iframeLinks.find(
      (link) => link.name === providerName,
    );
    window.location.reload();
    setOpen(!open);
    toast({
      title: "Provider Changed",
      description: `${selectedProvider?.name} has been set as your default video provider.`,
    });
  };
  return (
    <div>
      <DropdownMenu open={open} onOpenChange={() => setOpen(!open)}>
        <DropdownMenuTrigger className="z-10 flex flex-row items-center gap-2 justify-self-end rounded-full bg-foreground/10 px-4 py-1">
          <p>Server</p>
          <img
            src="/assets/icons/chevron-down.svg"
            alt="Rate"
            width={12}
            height={12}
            className="invert-on-dark"
            loading="lazy"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-[200px] rounded-[8px] border-none bg-background p-0 drop-shadow-lg"
          align="start"
        >
          <div className="flex h-full w-full flex-col gap-2 bg-foreground/10 py-2">
            {iframeLinks.map((provider) => (
              <button
                key={provider.name}
                onClick={() => handleProviderSelection(provider.name)}
                className={`cursor-pointer border px-4 py-2 hover:bg-foreground/10`}
              >
                {provider.name}
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ProviderDropdown;
