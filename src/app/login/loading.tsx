import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthVisual } from "@/components/auth/AuthVisual";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";

export default function LoginLoading() {
  return (
    <AuthLayout visual={<AuthVisual />}>
      <AuthFormSkeleton />
    </AuthLayout>
  );
}
