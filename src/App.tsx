import { useEffect, useState } from "react";
import { createProject, getProjects, Project } from "@/db/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Conectando a SQLite...");

  const loadData = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
      setStatus("SQLite conectado y migraciones listas ✅");
    } catch (err) {
      console.error(err);
      setStatus(`Error en SQLite: ${String(err)}`);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createProject(name.trim(), "postgres");
    setName("");
    await loadData();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ERD Studio - Test Base</h1>
          <p className="text-sm text-zinc-400 mt-1">{status}</p>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Nombre del diagrama (ej. E-commerce)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-900 border-zinc-800"
          />
          <Button onClick={handleCreate}>Crear</Button>
        </div>

        <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50 space-y-2">
          <h2 className="text-xs font-semibold uppercase text-zinc-400">
            Proyectos en SQLite ({projects.length})
          </h2>
          {projects.length === 0 ? (
            <p className="text-sm text-zinc-500">No hay proyectos registrados aún.</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className="p-2.5 rounded bg-zinc-900 border border-zinc-800 flex justify-between items-center text-sm"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    {p.db_engine}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}