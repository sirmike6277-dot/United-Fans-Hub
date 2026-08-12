import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthVisual } from "@/components/auth/AuthVisual";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Sign Up — United Fans Hub",
  description: "Create your fan profile and become part of the community.",
};

export default function SignupPage() {
  return (
    <AuthLayout visual={<AuthVisual />}>
      <AuthHeader
        heading="Join the United Family."
        subtext="Create your fan profile and become part of the community."
      />
      <SignupForm />
      <AuthFooter prompt="Already have an account?" linkText="Log in" href="/login" />
    </AuthLayout>
  );
}
