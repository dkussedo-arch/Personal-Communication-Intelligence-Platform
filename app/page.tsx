import { ChatInterface } from "@/components/ChatInterface";
import { ClaimEvaluator } from "@/components/ClaimEvaluator";
import { FileUpload } from "@/components/FileUpload";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-10 p-8">
      <div className="max-w-2xl space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Personal Communication Intelligence
        </h1>
        <p className="text-muted-foreground">
          Upload a document to extract your communication patterns and build
          your intelligence profile.
        </p>
      </div>

      <section className="flex w-full flex-col items-center gap-4">
        <div className="max-w-2xl space-y-1 text-center">
          <h2 className="text-xl font-semibold">Analyze Your Documents</h2>
          <p className="text-sm text-muted-foreground">
            Upload a file to extract communication patterns from your writing.
          </p>
        </div>
        <FileUpload />
      </section>

      <section className="flex w-full flex-col items-center gap-4">
        <div className="max-w-2xl space-y-1 text-center">
          <h2 className="text-xl font-semibold">Chat With Your PCI Assistant</h2>
          <p className="text-sm text-muted-foreground">
            Refine drafts, adapt tone, and strengthen professional messages.
          </p>
        </div>
        <ChatInterface />
      </section>

      <section className="flex w-full flex-col items-center gap-4">
        <div className="max-w-2xl space-y-1 text-center">
          <h2 className="text-xl font-semibold">Verify AI Claims</h2>
          <p className="text-sm text-muted-foreground">
            Check whether AI-generated text is grounded in your source document,
            claim by claim.
          </p>
        </div>
        <ClaimEvaluator />
      </section>
    </main>
  );
}
