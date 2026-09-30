import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useLibrary } from "@/services/store";
import { MemberProfile } from "@/features/members/MemberProfile";
import { EmptyState } from "@/components/common/Layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile | PageNest" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data, currentMemberId, isLibrarian, librarian } = useLibrary();
  if (isLibrarian) {
    return <EmptyState icon={ShieldCheck} title={`Signed in as ${librarian.name}`} description={librarian.title} action={<Button asChild variant="outline"><Link to="/settings">Library settings</Link></Button>} />;
  }
  const member = data.members.find((m) => m.id === currentMemberId);
  return member ? <MemberProfile member={member} staffView={false} /> : null;
}
