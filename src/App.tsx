import { useDiagramStore } from "@/store/useDiagramStore";
import { ProjectDashboard } from "@/components/dashboard/ProjectDashboard";
import { Workspace } from "@/components/workspace/Workspace";

export default function App() {
  const activeProject = useDiagramStore((state) => state.activeProject);

  return activeProject ? <Workspace /> : <ProjectDashboard />;
}
