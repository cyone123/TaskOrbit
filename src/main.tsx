import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PomodoroMiniView } from "./views/PomodoroMiniView";
import "./theme/theme.css";

const isPomodoroMiniWindow =
  new URLSearchParams(window.location.search).get("window") === "pomodoro-mini";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isPomodoroMiniWindow ? <PomodoroMiniView /> : <App />}
  </React.StrictMode>,
);
