import { signIn } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="rounded-[2rem] border border-border bg-hero-gradient p-8 shadow-panel">
          <Logo />
          <div className="mt-10 max-w-xl space-y-5">
            <div className="text-sm uppercase tracking-[0.35em] text-white/65">RocketLevel AI</div>
            <h1 className="text-4xl font-semibold text-white">RocketLevel AI Routing Console</h1>
            <p className="text-lg text-white/75">Smarter Routing. Less Complexity.</p>
            <p className="text-sm leading-7 text-white/70">
              A controlled self-service workspace for schedule changes, on-call technician queue updates, and
              short-term routing adjustments. Underlying architecture stays protected.
            </p>
          </div>
        </div>
        <Card className="self-center">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your domain account to access approved routing controls.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              action={async (formData) => {
                "use server";
                await signIn("credentials", {
                  email: formData.get("email"),
                  password: formData.get("password"),
                  redirectTo: "/overview"
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="you@company.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
            <div className="mt-4 text-sm text-muted-foreground">
              <a href="/forgot-password" className="text-primary">
                Forgot password?
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
