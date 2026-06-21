import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/app/profile-form";
import { DeleteAccountButton } from "@/components/app/delete-account-button";
import { ClerkUserProfile } from "@/components/app/clerk-user-profile";
import { getViewer } from "@/server/viewer";

export default async function AccountSettingsPage() {
  const viewer = await getViewer();

  // With Clerk configured, use its first-party account management UI which
  // covers profile, email, password, 2FA, sessions, and account deletion.
  if (viewer.authConfigured) {
    return <ClerkUserProfile />;
  }

  // Demo mode (no Clerk): the lightweight local profile form.
  return (
    <div className="space-y-6">
      <ProfileForm viewer={viewer} />

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete account</p>
            <p className="text-sm text-muted-foreground">
              Permanently remove your account and all data.
            </p>
          </div>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}
