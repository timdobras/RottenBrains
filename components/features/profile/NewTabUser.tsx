import { Tab } from "./Tab";

const NewTabs = ({ user_id }: { user_id: string }) => {
  const tabs = [
    { name: "Home", link: `/protected/user/${user_id}` },
    { name: "Movies", link: `/protected/user/${user_id}/movies` },
    { name: "Shows", link: `/protected/user/${user_id}/tv` },
    { name: "History", link: `/protected/user/${user_id}/history` },
  ];

  return (
    <div className="flex w-full flex-row">
      {tabs.map((tab) => (
        <Tab key={tab.link} name={tab.name} link={tab.link} />
      ))}
      <div className="h-12 w-full border-b border-foreground/10 px-4 py-2"></div>
    </div>
  );
};

export default NewTabs;
