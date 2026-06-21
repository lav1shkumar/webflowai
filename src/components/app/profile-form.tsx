"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile } from "@/server/account";
import type { Viewer } from "@/server/viewer";

export function ProfileForm({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const [name, setName] = React.useState(viewer.name);
  const [bio, setBio] = React.useState(viewer.bio);
  const [saving, setSaving] = React.useState(false);

  const dirty = name !== viewer.name || bio !== viewer.bio;

  const save = async () => {
    if (!name.trim()) {
      toast.error("Name can't be empty.");
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile({ name: name.trim(), bio });
      if (res.ok) {
        toast.success("Profile saved");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card/40">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {viewer.avatarUrl && (
              <AvatarImage src={viewer.avatarUrl} alt={viewer.name} />
            )}
            <AvatarFallback className="text-lg">
              {viewer.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() =>
                toast("Your avatar is managed by your account provider.")
              }
            >
              Change avatar
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              {viewer.authConfigured
                ? "Managed by your Clerk account."
                : "JPG, PNG or GIF. Max 2MB."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue={viewer.email}
              readOnly
              className="cursor-not-allowed opacity-70"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself"
            disabled={saving}
          />
        </div>

        <div className="flex justify-end">
          <Button variant="brand" onClick={save} disabled={saving || !dirty}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
