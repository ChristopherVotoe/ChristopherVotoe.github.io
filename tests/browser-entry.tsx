import React from "react";
import { createRoot } from "react-dom/client";
import { TrackingStudio } from "../src/components/TrackingStudio";
import "../src/app/globals.css";

createRoot(document.getElementById("root")!).render(<TrackingStudio />);
