import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface ProfileTabProps {
  userName: string;
  userEmail: string;
  onNameChange: (name: string) => void;
}

export function ProfileTab({ userName, userEmail, onNameChange }: ProfileTabProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Personal Information</h2>
        <p className="text-sm text-muted-foreground">Update your personal details and avatar</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <Label>Profile Picture</Label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-[#9d7d59] text-white flex items-center justify-center text-2xl font-semibold shrink-0">
            {userName.split(' ').map((n) => n[0]).join('').toUpperCase()}
          </div>
          <div className="space-y-2">
            <Button variant="outline" size="sm">Upload Photo</Button>
            <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max size 2MB</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="settings-name">Full Name</Label>
        <Input
          id="settings-name"
          value={userName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter your name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-email">Email</Label>
        <Input
          id="settings-email"
          type="email"
          value={userEmail}
          placeholder="Enter your email"
          disabled
        />
        <p className="text-xs text-muted-foreground">This is your login email and cannot be changed</p>
      </div>
    </div>
  );
}
