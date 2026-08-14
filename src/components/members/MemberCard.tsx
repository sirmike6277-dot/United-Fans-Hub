import { UserIdentity } from "@/components/ui/UserIdentity";
import { FanLevelBadge } from "@/components/ui/FanLevelBadge";
import { Card } from "@/components/ui/Card";
import { FollowButton } from "@/components/community/FollowButton";
import type { FeedAuthor } from "@/lib/community/posts";

export interface MemberCardProps {
  member: FeedAuthor;
  currentUserId: string;
  initialIsFollowing: boolean;
}

export function MemberCard({ member, currentUserId, initialIsFollowing }: MemberCardProps) {
  const name = member.display_name || member.username;

  return (
    <Card className="!p-4 flex items-center gap-3 transition-colors hover:border-ink/30 sm:!p-5">
      <UserIdentity
        name={name}
        username={member.username}
        avatarUrl={member.avatar_url}
        size={48}
        href={`/profile/${member.id}`}
        className="flex-1"
      />
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <FanLevelBadge level={member.fan_level} />
        <FollowButton
          currentUserId={currentUserId}
          targetProfileId={member.id}
          initialIsFollowing={initialIsFollowing}
        />
      </div>
    </Card>
  );
}
