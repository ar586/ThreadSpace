import React from "react";

export interface PreviewData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export function LinkPreview({ data }: { data: PreviewData }) {
  if (!data || (!data.title && !data.description && !data.image)) return null;

  const url = data.url || "#";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 mb-1 w-full max-w-sm rounded-lg overflow-hidden border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
    >
      <div className="flex flex-col sm:flex-row border-l-4 border-primary h-full">
        <div className="flex-1 p-3 min-w-0 flex flex-col justify-center">
          {data.title && (
            <h3 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {data.title}
            </h3>
          )}
          {data.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {data.description}
            </p>
          )}
        </div>
        {data.image && (
          <div className="sm:w-24 h-32 sm:h-auto shrink-0 bg-muted overflow-hidden relative">
            <img
              src={data.image}
              alt={data.title || "Link preview"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
      </div>
    </a>
  );
}
