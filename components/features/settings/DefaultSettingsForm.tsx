"use client";

import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { iframeLinks } from "@/lib/constants/links";

interface FormData {
  video_provider: string;
}

const DefaultSettingsForm = () => {
  const [formData, setFormData] = useState<FormData>({
    video_provider: iframeLinks[0]?.name || "", // Default to first link
  });

  const { toast } = useToast();

  useEffect(() => {
    const storedProvider = localStorage.getItem("video_provider");
    if (storedProvider) {
      setFormData({ video_provider: storedProvider });
    }
  }, []);

  const handleProviderSelection = (providerName: string) => {
    setFormData({ video_provider: providerName });
    localStorage.setItem("video_provider", providerName);

    const selectedProvider = iframeLinks.find(
      (link) => link.name === providerName,
    );

    toast({
      title: "Provider Changed",
      description: `${selectedProvider?.name} has been set as your default video provider.`,
    });
  };

  return (
    <div>
      <form>
        <p className="mb-2 block font-medium">Watch provider</p>
        <div className="flex w-full flex-row flex-wrap items-center justify-center gap-4">
          {iframeLinks.map((provider) => (
            <div
              key={provider.name}
              onClick={() => handleProviderSelection(provider.name)}
              className={`cursor-pointer rounded-[4px] border px-4 py-2 ${
                formData.video_provider === provider.name
                  ? "border-accent"
                  : "border-foreground/10"
              }`}
            >
              {provider.name}
            </div>
          ))}
        </div>
      </form>
    </div>
  );
};

export default DefaultSettingsForm;
