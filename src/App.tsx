import { useEffect } from "react";
import { useDiagramStore } from "@/store/useDiagramStore";
import { ProjectDashboard } from "@/components/dashboard/ProjectDashboard";
import { Workspace } from "@/components/workspace/Workspace";

export default function App() {
  const activeProject = useDiagramStore((state) => state.activeProject);

  useEffect(() => {
    document.title = `Power Diagram v${__APP_VERSION__} - ERD Studio`;
  }, []);

  return activeProject ? <Workspace /> : <ProjectDashboard />;
}
