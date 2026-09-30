import { LinkButton } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <main id="main" className="bg-notebook flex min-h-[70dvh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-serif text-6xl font-semibold text-brand">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-ink-2">The page doesn&apos;t exist, or it isn&apos;t available for your role.</p>
        <LinkButton href="/" className="mt-6">
          Back to home
        </LinkButton>
      </div>
    </main>
  );
}
