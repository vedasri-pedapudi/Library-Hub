import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserX } from "lucide-react";
import { useLibrary } from "@/services/store";
import { MemberProfile } from "@/features/members/MemberProfile";
import { EmptyState } from "@/components/common/Layout";

export const Route = createFileRoute("/_app/members/$memberId")({
  head: () => ({ meta: [{ title: "Member | PageNest" }] }),
  component: MemberPage,
});

function MemberPage() {
  const { memberId } = Route.useParams();
  const { data } = useLibrary();
  const member = data.members.find((m) => m.id === memberId);
  return (
    <>
      <Link to="/members" className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-ivory"><ArrowLeft className="size-3.5" aria-hidden="true" /> All members</Link>
      {member ? <MemberProfile member={member} staffView /> : <EmptyState icon={UserX} title="Member not found" />}
    </>
  );
}
