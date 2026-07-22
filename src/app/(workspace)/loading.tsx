import { LoaderCircle } from "@/components/icons";

export default function WorkspaceLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-0 flex-1 items-center justify-center"
    >
      <LoaderCircle className="text-primary size-7 animate-spin" />
      <span className="sr-only">Loading page</span>
    </div>
  );
}
