import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { Provider } from "./lib.jsx";
import App from "./App.jsx";
import "./styles.css";
createRoot(document.getElementById("root")).render(<HashRouter><Provider><App /></Provider></HashRouter>);
