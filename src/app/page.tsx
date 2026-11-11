"use client";

import React, { useState, useEffect } from "react";

export default function GamePage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <main style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", backgroundColor: "#060913" }}>
      {isLoaded && (
        <iframe
          src="/index.html"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block"
          }}
          title="Stellar Strike: Cyber Typing Interceptor"
          allow="autoplay"
        />
      )}
    </main>
  );
}
