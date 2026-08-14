"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormError } from "@/components/auth/FormError";
import { AvatarUpload } from "./AvatarUpload";
import { CoverUpload } from "./CoverUpload";
import { SocialLinksEditor } from "./SocialLinksEditor";
import type { SocialLink } from "@/lib/profile/socialLinks";

export interface ProfileEditFormProps {
  profile: Tables<"profiles">;
  initialSocialLinks: SocialLink[];
}

export function ProfileEditForm({ profile, initialSocialLinks }: ProfileEditFormProps) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [coverUrl, setCoverUrl] = useState(profile.cover_url);
  const [coverFocusY, setCoverFocusY] = useState(profile.cover_focus_y);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [country, setCountry] = useState(profile.country ?? "");
  const [favouritePlayer, setFavouritePlayer] = useState(profile.favourite_player ?? "");
  const [favouriteEra, setFavouriteEra] = useState(profile.favourite_era ?? "");
  const [fanSinceYear, setFanSinceYear] = useState(profile.fan_since_year?.toString() ?? "");
  const [favouriteShirt, setFavouriteShirt] = useState(profile.favourite_shirt ?? "");
  const [favouriteMemory, setFavouriteMemory] = useState(profile.favourite_memory ?? "");
  const [matchdayRoutine, setMatchdayRoutine] = useState(profile.matchday_routine ?? "");
  const [fanStyle, setFanStyle] = useState(profile.fan_style ?? "");
  const [favouriteChant, setFavouriteChant] = useState(profile.favourite_chant ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        cover_url: coverUrl,
        cover_focus_y: coverFocusY,
        display_name: displayName || null,
        bio: bio || null,
        location: location || null,
        country: country || null,
        favourite_player: favouritePlayer || null,
        favourite_era: favouriteEra || null,
        fan_since_year: fanSinceYear ? Number(fanSinceYear) : null,
        favourite_shirt: favouriteShirt || null,
        favourite_memory: favouriteMemory || null,
        matchday_routine: matchdayRoutine || null,
        fan_style: fanStyle || null,
        favourite_chant: favouriteChant || null,
      })
      .eq("id", profile.id);

    setLoading(false);

    if (updateError) {
      setError("We couldn't save your changes. Please try again.");
      return;
    }

    router.push("/profile");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error ? <FormError message={error} /> : null}

      <CoverUpload
        userId={profile.id}
        url={coverUrl}
        focusY={coverFocusY}
        onUploaded={setCoverUrl}
        onFocusChange={setCoverFocusY}
      />
      <AvatarUpload userId={profile.id} url={avatarUrl} onUploaded={setAvatarUrl} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Display Name"
          name="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={loading}
        />
        <Input
          label="Username"
          value={`@${profile.username}`}
          disabled
          title="Contact support to change your username"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wide text-text-muted">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={loading}
          rows={3}
          maxLength={280}
          className="rounded-control border border-ink/10 bg-bg-elevated px-4 py-3 text-sm text-ink placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary"
          placeholder="Tell the community about yourself"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Location"
          name="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={loading}
          placeholder="e.g. Manchester, UK"
        />
        <Input
          label="Country"
          name="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={loading}
          placeholder="e.g. United Kingdom"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Favourite Player"
          name="favouritePlayer"
          value={favouritePlayer}
          onChange={(e) => setFavouritePlayer(e.target.value)}
          disabled={loading}
          placeholder="e.g. Bruno Fernandes"
        />
        <Input
          label="Favourite Era"
          name="favouriteEra"
          value={favouriteEra}
          onChange={(e) => setFavouriteEra(e.target.value)}
          disabled={loading}
          placeholder="e.g. Class of '99"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Fan Since"
          name="fanSinceYear"
          type="number"
          inputMode="numeric"
          min={1878}
          max={new Date().getFullYear()}
          value={fanSinceYear}
          onChange={(e) => setFanSinceYear(e.target.value)}
          disabled={loading}
          placeholder="e.g. 2008"
        />
        <Input
          label="Favourite Shirt"
          name="favouriteShirt"
          value={favouriteShirt}
          onChange={(e) => setFavouriteShirt(e.target.value)}
          disabled={loading}
          placeholder="e.g. 2008 Champions League final shirt"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Favourite Memory
        </label>
        <textarea
          value={favouriteMemory}
          onChange={(e) => setFavouriteMemory(e.target.value)}
          disabled={loading}
          rows={3}
          maxLength={500}
          className="rounded-control border border-ink/10 bg-bg-elevated px-4 py-3 text-sm text-ink placeholder:text-text-muted/70 outline-none transition-colors focus:border-red-primary"
          placeholder="Your most treasured United moment"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Matchday Routine"
          name="matchdayRoutine"
          value={matchdayRoutine}
          onChange={(e) => setMatchdayRoutine(e.target.value)}
          disabled={loading}
          placeholder="e.g. Pub with the lads, then the Stretford End"
        />
        <Input
          label="Fan Style"
          name="fanStyle"
          value={fanStyle}
          onChange={(e) => setFanStyle(e.target.value)}
          disabled={loading}
          placeholder="e.g. Season ticket holder, armchair general"
        />
      </div>

      <Input
        label="Favourite Chant"
        name="favouriteChant"
        value={favouriteChant}
        onChange={(e) => setFavouriteChant(e.target.value)}
        disabled={loading}
        placeholder="e.g. Glory Glory Man United"
      />

      <SocialLinksEditor profileId={profile.id} initialLinks={initialSocialLinks} />

      <div className="flex gap-3">
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="secondary" href="/profile">
          Cancel
        </Button>
      </div>
    </form>
  );
}
