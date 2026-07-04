import { useState, useEffect } from 'react';
import { useParams, Link } from "react-router-dom";
import { FileUpload } from "../../components/ui/FileUpload";
import { FileRowAction } from "../../components/ui/FileRowAction";
import { FileComments } from "../../components/ui/FileComments";
import { File as FileIcon, Clock, CheckCircle, UploadCloud } from "lucide-react";

export default function TeamProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "");
  const [projectData, setProjectData] = useState<any>(null);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjectData = () => {
    fetch(`/api/portal/team/projects/${projectId}`)
      .then(res => res.json())
      .then(data => {
        setProjectData(data.project);
        setProjectFiles(data.files || []);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!isNaN(projectId)) {
      fetchProjectData();
    }
  }, [projectId]);

  if (isNaN(projectId)) {
    return <div className="p-6 text-destructive">Invalid Project ID</div>;
  }

  if (isLoading) {
    return <div className="p-6">Loading project details...</div>;
  }

  if (!projectData) {
    return <div className="p-6 text-destructive">Project not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/team/projects" className="hover:text-foreground transition-colors">My Projects</Link>
            <span>/</span>
            <span>{projectData.client?.companyName || "Unknown Client"}</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">{projectData.title}</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl">{projectData.description || "No description provided."}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <FileIcon className="w-5 h-5 text-primary" />
                Project Files
              </h3>
              <span className="text-xs bg-secondary px-2 py-1 rounded-full font-medium">
                {projectFiles.length} files
              </span>
            </div>
            
            <div className="divide-y divide-border">
              {projectFiles.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <UploadCloud className="w-10 h-10 mx-auto opacity-20 mb-3" />
                  <p>No files uploaded yet.</p>
                </div>
              ) : (
                projectFiles.map((file) => (
                  <div key={file.id} className="p-4 hover:bg-secondary/10 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                          {file.originalFilename.split('.').pop()?.substring(0, 3)}
                        </div>
                        <div>
                          <p className="font-medium text-sm leading-tight mb-1 max-w-[200px] sm:max-w-[300px] truncate">
                            {file.originalFilename}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{(file.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {file.status === 'approved' ? (
                                <span className="text-emerald-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</span>
                              ) : file.status === 'client_review' ? (
                                <span className="text-amber-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Client Review</span>
                              ) : (
                                <span className="text-blue-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Internal Review</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <FileRowAction 
                        fileId={file.id} 
                        currentStatus={file.status} 
                        onStatusUpdate={fetchProjectData}
                        onDeleteSuccess={fetchProjectData}
                      />
                    </div>
                    <FileComments fileId={file.id} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <FileUpload projectId={projectId} onUploadSuccess={fetchProjectData} />

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">Details</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Status</span>
                <span className="capitalize font-medium">{projectData.status?.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Priority</span>
                <span className="capitalize font-medium">{projectData.priority}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Deadline</span>
                <span className="font-medium">{projectData.deadline ? new Date(projectData.deadline).toLocaleDateString() : 'Not Set'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
