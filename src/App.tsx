import { useEffect } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { ProjectDashboard } from "@/components/dashboard/ProjectDashboard";
import { Workspace } from "@/components/workspace/Workspace";

export default function App() {
  const activeProject = useDiagramStore((state) => state.activeProject);

  useEffect(() => {
    document.title = `Power Diagram v${__APP_VERSION__} - ERD Studio`;

    // Desvanecer suavemente la pantalla de carga inicial una vez montada la aplicación
    const splash = document.getElementById("app-splash");
    if (splash) {
      const timer = setTimeout(() => {
        splash.classList.add("splash-fade-out");
        const removeTimer = setTimeout(() => {
          splash.remove();
        }, 400);
        return () => clearTimeout(removeTimer);
      }, 350);

      return () => clearTimeout(timer);
    }
  }, []);

  return activeProject ? <Workspace /> : <ProjectDashboard />;
}
