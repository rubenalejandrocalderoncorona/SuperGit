"use client";

import { useEffect, useState } from "react";
import { fetchVersion } from "@/lib/api";

export function VersionButton() {
  const [version, setVersion] = useState("v1.0.0");
  const [repoURL, setRepoURL] = useState(
    "https://github.com/rubenalejandrocalderoncorona/SuperGit"
  );

  useEffect(() => {
    fetchVersion()
      .then((v) => {
        setVersion(v.version);
        setRepoURL(v.repo_url);
      })
      .catch(() => {
        // keep defaults if server is not running
      });
  }, []);

  return (
    <button
      onClick={() => window.open(repoURL, "_blank")}
      title={`SuperGit ${version} — click to open repository`}
      className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-lg text-sm font-mono transition-all duration-200 glass"
      style={{
        color: "#378add",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 0 12px rgba(55,138,221,0.35), 0 2px 8px rgba(0,0,0,0.3)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "rgba(55,138,221,0.5)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 2px 8px rgba(0,0,0,0.3)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "rgba(55,138,221,0.18)";
      }}
    >
      {version}
    </button>
  );
}
