import { AdminPage, AdminPageHeader } from "../components/ui/AdminUI";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Photography Intelligence"
        title={title}
        description={description}
      />
    </AdminPage>
  );
}
