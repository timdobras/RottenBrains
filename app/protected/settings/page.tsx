import NavThemeSwitch from "@/components/features/navigation/NavThemeSwitch";
import DefaultSettingsForm from "@/components/features/settings/DefaultSettingsForm";
import UserSettingsForm from "@/components/features/settings/UserSettingsForm";
import { getCurrentUser } from "@/lib/supabase/serverQueries";
import React from "react";

const page = async () => {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto h-full w-full max-w-4xl px-4 md:px-0">
      <h1 className="my-4 text-xl font-semibold">Settings</h1>
      <NavThemeSwitch></NavThemeSwitch>
      <h1 className="my-4 text-lg font-semibold">Defaults</h1>
      <DefaultSettingsForm></DefaultSettingsForm>
      <h1 className="my-4 text-lg font-semibold">Profile</h1>
      <UserSettingsForm user={user}></UserSettingsForm>
    </div>
  );
};

export default page;
