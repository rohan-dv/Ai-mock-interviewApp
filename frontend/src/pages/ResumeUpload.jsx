import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { UploadCloud, FileText, CheckCircle2, Briefcase, GraduationCap, Code2, Sparkles } from "lucide-react";

export default function ResumeUpload() {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const fetchResume = () => {
    setLoading(true);
    api.get("/resume/latest")
      .then((r) => setResume(r.data))
      .catch(() => setResume(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchResume(); }, []);

  const handleFile = async (file) => {
    if (!file) return;
    const valid = /\.(pdf|docx|txt)$/i.test(file.name);
    if (!valid) {
      toast.error("Please upload a PDF, DOCX, or TXT file");
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post("/resume/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResume(res.data);
      toast.success("Resume parsed successfully");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
      data-testid="resume-page"
    >
      <div>
        <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-2">// resume</div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Resume Intelligence</h1>
        <p className="text-zinc-400 mt-2">Upload your resume. ARIA reads it and tailors every interview question to your background.</p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="bg-[#0F1115] border-2 border-dashed border-white/10 hover:border-[#00FF94]/40 rounded-lg p-10 text-center transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
        data-testid="resume-dropzone"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
          data-testid="resume-file-input"
        />
        <UploadCloud className="w-10 h-10 text-[#00FF94] mx-auto mb-4" strokeWidth={1.5} />
        <p className="font-display text-lg font-semibold mb-1">
          {uploading ? "Parsing with AI..." : "Drop your resume here"}
        </p>
        <p className="text-sm text-zinc-400">PDF, DOCX, or TXT · Max 5MB</p>
        <Button
          type="button"
          className="mt-5 bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold"
          disabled={uploading}
          data-testid="resume-upload-btn"
        >
          {uploading ? "Uploading..." : "Choose file"}
        </Button>
      </div>

      {/* Parsed result */}
      {loading ? (
        <Skeleton className="h-64 bg-white/5" />
      ) : resume ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <CheckCircle2 className="w-4 h-4 text-[#00FF94]" />
            <span>Last parsed: <span className="text-white">{resume.filename}</span> · {new Date(resume.created_at).toLocaleString()}</span>
          </div>

          {resume.parsed?.summary && (
            <div className="bg-[#0F1115] border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#00FF94]" />
                <span className="font-mono text-xs tracking-widest uppercase text-[#00FF94]">AI Summary</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">{resume.parsed.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {resume.parsed?.skills?.length > 0 && (
              <Section icon={Code2} title="Skills" testid="parsed-skills">
                <div className="flex flex-wrap gap-2">
                  {resume.parsed.skills.map((s, i) => (
                    <Badge key={i} variant="outline" className="border-white/15 bg-white/5 text-zinc-300">{s}</Badge>
                  ))}
                </div>
              </Section>
            )}

            {resume.parsed?.technologies?.length > 0 && (
              <Section icon={Code2} title="Technologies" testid="parsed-tech">
                <div className="flex flex-wrap gap-2">
                  {resume.parsed.technologies.map((s, i) => (
                    <Badge key={i} variant="outline" className="border-[#00FF94]/30 bg-[#00FF94]/5 text-[#00FF94]">{s}</Badge>
                  ))}
                </div>
              </Section>
            )}

            {resume.parsed?.experience?.length > 0 && (
              <Section icon={Briefcase} title="Experience" testid="parsed-experience">
                <div className="space-y-3">
                  {resume.parsed.experience.map((e, i) => (
                    <div key={i} className="border-l-2 border-[#00FF94]/30 pl-3">
                      <div className="text-white font-medium">{e.role}</div>
                      <div className="text-xs text-zinc-400">{e.company} · {e.duration}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {resume.parsed?.education?.length > 0 && (
              <Section icon={GraduationCap} title="Education" testid="parsed-education">
                <div className="space-y-3">
                  {resume.parsed.education.map((e, i) => (
                    <div key={i} className="border-l-2 border-[#00FF94]/30 pl-3">
                      <div className="text-white font-medium">{e.degree}</div>
                      <div className="text-xs text-zinc-400">{e.institution} · {e.year}</div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {resume.parsed?.projects?.length > 0 && (
              <Section icon={FileText} title="Projects" testid="parsed-projects" full>
                <div className="space-y-3">
                  {resume.parsed.projects.map((p, i) => (
                    <div key={i} className="border-l-2 border-[#00FF94]/30 pl-3">
                      <div className="text-white font-medium">{p.name}</div>
                      {p.description && <p className="text-sm text-zinc-400 mt-1">{p.description}</p>}
                      {p.tech?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {p.tech.map((t, ti) => (
                            <span key={ti} className="text-[10px] font-mono uppercase tracking-widest text-[#00FF94]">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-zinc-500 py-8">No resume uploaded yet.</div>
      )}
    </motion.div>
  );
}

function Section({ icon: Icon, title, children, testid, full }) {
  return (
    <div className={`bg-[#0F1115] border border-white/10 rounded-lg p-6 ${full ? "lg:col-span-2" : ""}`} data-testid={testid}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-[#00FF94]" strokeWidth={1.5} />
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
