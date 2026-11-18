import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// For a project site (owner.github.io/repo) set base to "/repo/"
export default defineConfig({ plugins: [react()], base: "./" });
