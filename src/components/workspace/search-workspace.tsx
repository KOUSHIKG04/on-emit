import { GmailSearch } from "@/components/mail/gmail-search";
import { ThreadReader } from "@/components/mail/thread-reader";

export function SearchWorkspace() {
  return (
    <div className="bg-border grid min-h-full gap-px xl:grid-cols-[minmax(360px,520px)_minmax(0,1fr)] [&_[data-slot=card]]:rounded-none [&_[data-slot=card]]:ring-0">
      <div>
        <GmailSearch />
      </div>
      <ThreadReader />
    </div>
  );
}
