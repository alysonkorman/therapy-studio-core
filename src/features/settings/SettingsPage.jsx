import { Page } from "../../components/layout";
import DataBackupSection from "./DataBackupSection";
import "./SettingsPage.css";

export default function SettingsPage() {
  return (
    <Page
      className="settings-page"
      description="Manage Therapy Studio settings and protect information stored in this browser."
      title="Settings"
    >
      <DataBackupSection />
    </Page>
  );
}
