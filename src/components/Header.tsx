import React from 'react';
import { useCurrentTime } from '../hooks/useCurrentTime';

type HeaderProps = {
  appName: string;
};

export const Header: React.FC<HeaderProps> = ({ appName }) => {
  const currentTime = useCurrentTime();

  return (
    <header className="flex justify-between items-center p-4 bg-dark-gray text-white">
      <h1 className="text-16 font-bold">{appName}</h1>
      <span className="text-16">{currentTime}</span>
    </header>
  );
};
