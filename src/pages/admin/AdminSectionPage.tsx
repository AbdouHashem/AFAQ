import React from 'react';

export interface AdminSectionPageProps {
  title: string;
}

export const AdminSectionPage: React.FC<AdminSectionPageProps> = ({ title }) => {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-h1 font-bold text-brand-900">{title}</h1>
    </div>
  );
};
