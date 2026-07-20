import { GmailSearch } from "@/components/mail/gmail-search";
import { ThreadReader } from "@/components/mail/thread-reader";

export function SearchWorkspace() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(360px,520px)_minmax(0,1fr)]">
      <div className="xl:sticky xl:top-20">
        <GmailSearch />
      </div>
      <ThreadReader />
    </div>
  );
}
