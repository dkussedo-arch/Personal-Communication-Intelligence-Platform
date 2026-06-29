"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OutputRating } from "@/components/OutputRating";
import { Progress } from "@/components/ui/progress";
import {
  PCI_MODEL,
  trackAiGenerationCompleted,
  trackAiGenerationStarted,
  trackFileUploaded,
} from "@/lib/analytics";
import { getFileExtension, validateFile } from "@/lib/extract-text";
import { cn } from "@/lib/utils";

type ProcessingPhase = "idle" | "uploading" | "analyzing" | "complete";

interface ExtractTextResponse {
  text: string;
  filename: string;
}

const ANALYSIS_FEATURE = "document_analysis";

function getFileType(file: File): string {
  const extension = getFileExtension(file.name).replace(/^\./, "");
  if (extension) {
    return extension;
  }

  if (file.type) {
    return file.type.split("/").pop() ?? "unknown";
  }

  return "unknown";
}

const ACCEPT_ATTRIBUTE =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

function extractTextWithProgress(
  file: File,
  onProgress: (value: number) => void
): Promise<ExtractTextResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const uploadProgress = Math.round((event.loaded / event.total) * 70);
        onProgress(uploadProgress);
      }
    });

    xhr.addEventListener("load", () => {
      try {
        const payload = JSON.parse(xhr.responseText) as
          | ExtractTextResponse
          | { error?: string };

        if (xhr.status >= 400) {
          reject(
            new Error(
              "error" in payload && payload.error
                ? payload.error
                : "Failed to extract text from file."
            )
          );
          return;
        }

        if (!("text" in payload) || !payload.text) {
          reject(new Error("No text could be extracted from this file."));
          return;
        }

        onProgress(80);
        resolve(payload);
      } catch {
        reject(new Error("Failed to parse extraction response."));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error while uploading file."));
    });

    xhr.open("POST", "/api/extract-text");
    xhr.send(formData);
  });
}

async function streamAnalysis(
  response: Response,
  onChunk: (text: string) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response stream received from analysis.");
  }

  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result += decoder.decode(value, { stream: true });
    onChunk(result);
  }
}

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ProcessingPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState("");

  const isProcessing = phase === "uploading" || phase === "analyzing";

  const resetState = useCallback(() => {
    setError(null);
    setProgress(0);
    setAnalysis("");
    setUploadedFilename(null);
    setPhase("idle");
  }, []);

  const handleFileSelection = useCallback(
    (file: File | null) => {
      resetState();
      setSelectedFile(null);

      if (!file) {
        return;
      }

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setSelectedFile(file);
    },
    [resetState]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isProcessing) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (isProcessing) {
      return;
    }

    const file = event.dataTransfer.files[0] ?? null;
    handleFileSelection(file);
  };

  const clearSelection = () => {
    if (isProcessing) {
      return;
    }

    setSelectedFile(null);
    resetState();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || isProcessing) {
      return;
    }

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setAnalysis("");
    setUploadedFilename(null);
    setPhase("uploading");
    setProgress(5);

    try {
      const { text, filename } = await extractTextWithProgress(
        selectedFile,
        setProgress
      );

      trackFileUploaded(
        Math.round(selectedFile.size / 1024),
        getFileType(selectedFile)
      );

      setUploadedFilename(filename);
      setPhase("analyzing");
      setProgress(90);

      trackAiGenerationStarted(ANALYSIS_FEATURE, PCI_MODEL);
      const generationStartedAt = performance.now();

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, filename }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        trackAiGenerationCompleted(
          Math.round(performance.now() - generationStartedAt),
          false,
          ANALYSIS_FEATURE
        );
        throw new Error(payload?.error ?? "Analysis request failed.");
      }

      setProgress(100);

      const contentType = response.headers.get("content-type") ?? "";
      try {
        if (contentType.includes("application/json")) {
          const payload = (await response.json()) as { analysis?: string };
          setAnalysis(payload.analysis ?? "");
        } else {
          await streamAnalysis(response, setAnalysis);
        }

        trackAiGenerationCompleted(
          Math.round(performance.now() - generationStartedAt),
          true,
          ANALYSIS_FEATURE
        );
      } catch {
        trackAiGenerationCompleted(
          Math.round(performance.now() - generationStartedAt),
          false,
          ANALYSIS_FEATURE
        );
        throw new Error("Failed to read analysis response.");
      }

      setPhase("complete");
    } catch (uploadError) {
      setPhase("idle");
      setProgress(0);
      setUploadedFilename(null);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Something went wrong while processing the file."
      );
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isProcessing) {
            inputRef.current?.click();
          }
        }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          isProcessing && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          onChange={handleInputChange}
          className="hidden"
          disabled={isProcessing}
        />

        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">
          Drag and drop your file here, or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, DOCX, or TXT — up to 10MB
        </p>
      </div>

      {selectedFile && !uploadedFilename && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 truncate">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{selectedFile.name}</span>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                clearSelection();
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remove selected file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {phase === "uploading"
                ? "Uploading and extracting text..."
                : "Analyzing with AI..."}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      {phase === "analyzing" && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing your document — this may take a moment.
        </div>
      )}

      {uploadedFilename && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <FileText className="h-4 w-4 text-primary" />
          <span>
            Uploaded: <span className="font-medium">{uploadedFilename}</span>
          </span>
        </div>
      )}

      <Button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Upload & Analyze"
        )}
      </Button>

      {analysis && phase === "complete" && (
        <div className="space-y-3 rounded-md border bg-card p-4">
          <h3 className="text-sm font-semibold">Analysis</h3>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {analysis}
          </p>
          <OutputRating label="Was this analysis helpful?" />
        </div>
      )}
    </div>
  );
}
