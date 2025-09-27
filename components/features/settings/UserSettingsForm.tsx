"use client";

import BackdropChange from "@/components/features/profile/BackdropChange";
import ProfilePicture from "@/components/features/profile/ProfilePictureChange";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, ChangeEvent, FormEvent } from "react";

interface FormData {
  name: string;
  username: string;
  email: string;
  bio: string;
}

const UserSettingsForm = (user: any) => {
  user = user;
  const [formData, setFormData] = useState<FormData>({
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
  });
  const [submitted, setSubmitted] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    try {
      const { data: updateData, error: updateError } = await supabase
        .from("users")
        .update([
          {
            name: formData.name,
            username: formData.username,
            bio: formData.bio,
          },
        ])
        .eq("id", user.id);
      setSubmitted(true);
      router.push("/protected/profile");
      toast({
        title: `Settings Changed Successfully`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="">
      <form onSubmit={handleSubmit}>
        <div className="mb-4 flex w-full flex-row items-center justify-between rounded-[16px] bg-foreground/10 p-4">
          <div className="flex flex-row items-center gap-2">
            <ProfilePicture></ProfilePicture>
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{formData.username}</p>
              <p className="text-sm text-foreground/50">{formData.name}</p>
            </div>
          </div>
        </div>
        <div className="mb-4 flex w-full flex-row items-center justify-between overflow-hidden rounded-[16px] bg-foreground/10">
          <BackdropChange></BackdropChange>
        </div>
        <div className="mb-4">
          <label htmlFor="email" className="block font-medium">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            readOnly
            className="mt-1 w-full rounded-[8px] bg-foreground/10 p-2 text-foreground/50"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="name" className="block font-medium">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-[8px] bg-foreground/10 p-2"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="name" className="block font-medium">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-[8px] bg-foreground/10 p-2"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="name" className="block font-medium">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-[8px] bg-foreground/10 p-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-white"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default UserSettingsForm;
