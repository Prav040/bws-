import React from 'react';
import { HomeIcon, HistoryIcon, StatsIcon, ProfileIcon } from '../assets/icons';

type NavigationProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', icon: <HomeIcon /> },
    { id: 'history', icon: <HistoryIcon /> },
    { id: 'stats', icon: <StatsIcon /> },
    { id: 'profile', icon: <ProfileIcon /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-dark-gray p-2 flex justify-around">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`p-2 ${activeTab === tab.id ? 'text-blue' : 'text-gray'}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon}
        </button>
      ))}
    </nav>
  );
};
