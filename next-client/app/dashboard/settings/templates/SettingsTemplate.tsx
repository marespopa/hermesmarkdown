import React from "react";
import DashboardTemplate from "../../templates/DashboardTemplate";

type Props = {
  header: React.ReactNode;
  children: React.ReactNode;
};

export default function SettingsTemplate({ header, children }: Props) {
  return (
    <DashboardTemplate>
      {header}
      {children}
    </DashboardTemplate>
  );
}
