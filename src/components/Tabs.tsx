import React from 'react';

type TabsProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

export const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = ['Verlauf', 'Profil', 'Statistiken'];

  return (
    <div className="flex justify-center bg-dark-gray p-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`px-4 py-2 mx-1 rounded text-14 ${activeTab === tab ? 'bg-blue text-white' : 'bg-light-gray text-dark-gray'}`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
