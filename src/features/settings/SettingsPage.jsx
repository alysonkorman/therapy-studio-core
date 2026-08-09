import { EmptyState, Page } from "../../components/layout";

export default function SettingsPage() {
  return (
    <Page
      description="Therapy Studio preferences will live here as they become available."
      title="Settings"
    >
      <EmptyState description="Coming soon." title="Settings Are Coming Later" />
    </Page>
  );
}
