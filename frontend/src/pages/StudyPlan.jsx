import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { Skeleton } from "../components/ui/skeleton";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { BookOpen, Calendar, Code2, Server, ListChecks, FolderGit2, ExternalLink } from "lucide-react";

export default function StudyPlan() {
  const { sessionId } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = sessionId ? `/study-plans/by-session/${sessionId}` : "/study-plans/latest";
    api.get(url)
      .then((r) => setPlan(r.data))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/2 bg-white/5" />
        <Skeleton className="h-80 bg-white/5" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <div>
          <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-2">// study plan</div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Personal Study Plan</h1>
        </div>
        <div className="bg-[#0F1115] border border-dashed border-white/10 rounded-lg p-12 text-center">
          <BookOpen className="w-10 h-10 text-zinc-600 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-zinc-400 mb-4">Complete an interview to generate your personalized roadmap.</p>
          <Link to="/interview/setup">
            <Button className="bg-[#00FF94] text-black hover:bg-[#00FF94]/85 font-semibold" data-testid="study-plan-cta-btn">
              Start an interview
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
      data-testid="study-plan-page"
    >
      <div>
        <div className="font-mono text-xs tracking-widest uppercase text-[#00FF94] mb-2">// study plan</div>
        <h1 className="font-display text-4xl font-bold tracking-tight flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-[#00FF94]" strokeWidth={1.5} />
          Your 4-week roadmap
        </h1>
        <p className="text-zinc-400 mt-2">Built around your weak topics and target interview style.</p>
      </div>

      <Tabs defaultValue="roadmap" className="w-full">
        <TabsList className="bg-[#0F1115] border border-white/10">
          <TabsTrigger value="roadmap" data-testid="tab-roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="topics" data-testid="tab-topics">Topics</TabsTrigger>
          <TabsTrigger value="questions" data-testid="tab-questions">Questions</TabsTrigger>
          <TabsTrigger value="projects" data-testid="tab-projects">Projects</TabsTrigger>
          <TabsTrigger value="resources" data-testid="tab-resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="roadmap" className="space-y-4 mt-6">
          {plan.roadmap?.map((w, i) => (
            <div key={i} className="bg-[#0F1115] border border-white/10 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-[#00FF94]/10 border border-[#00FF94]/30 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-[#00FF94]" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-[10px] tracking-widest uppercase text-[#00FF94]">week {w.week}</div>
                  <h3 className="font-display text-xl font-bold mt-1 mb-3">{w.focus}</h3>
                  {w.topics?.length > 0 && (
                    <div>
                      <div className="text-xs text-zinc-500 mb-2">Topics</div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {w.topics.map((t, ti) => (
                          <span key={ti} className="px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-zinc-300">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {w.deliverables?.length > 0 && (
                    <div>
                      <div className="text-xs text-zinc-500 mb-2">Deliverables</div>
                      <ul className="space-y-1">
                        {w.deliverables.map((d, di) => (
                          <li key={di} className="text-sm text-zinc-300 flex items-start gap-2">
                            <span className="font-mono text-[10px] text-[#00FF94] mt-1">▸</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="topics" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Section icon={Code2} title="DSA topics" testid="dsa-topics">
            <ul className="space-y-2">
              {plan.dsa_topics?.map((t, i) => (
                <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                  <span className="font-mono text-xs text-[#00FF94] shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>
          <Section icon={Server} title="System design topics" testid="sd-topics">
            <ul className="space-y-2">
              {plan.system_design_topics?.map((t, i) => (
                <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                  <span className="font-mono text-xs text-[#00FF94] shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Section>
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <Section icon={ListChecks} title="Recommended questions" testid="rec-questions">
            <ul className="space-y-3">
              {plan.recommended_questions?.map((q, i) => (
                <li key={i} className="p-3 bg-white/[0.02] border border-white/5 rounded-md text-sm text-zinc-300 flex items-start gap-3">
                  <span className="font-mono text-xs text-[#00FF94] shrink-0 mt-0.5">Q{i + 1}</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </Section>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <Section icon={FolderGit2} title="Portfolio project ideas" testid="project-ideas">
            <ul className="space-y-3">
              {plan.projects?.map((p, i) => (
                <li key={i} className="p-3 bg-white/[0.02] border border-white/5 rounded-md text-sm text-zinc-300">
                  <span className="font-mono text-xs text-[#00FF94] mr-2">{String(i + 1).padStart(2, "0")}</span>
                  {p}
                </li>
              ))}
            </ul>
          </Section>
        </TabsContent>

        <TabsContent value="resources" className="mt-6">
          <Section icon={BookOpen} title="Curated resources" testid="resources">
            <ul className="space-y-2">
              {plan.resources?.map((r, i) => (
                <li key={i}>
                  <a
                    href={r.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-md hover:bg-white/[0.05] transition-colors"
                  >
                    <div>
                      <div className="text-sm text-white">{r.name}</div>
                      <div className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{r.type}</div>
                    </div>
                    {r.url && <ExternalLink className="w-4 h-4 text-zinc-500" />}
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function Section({ icon: Icon, title, children, testid }) {
  return (
    <div className="bg-[#0F1115] border border-white/10 rounded-lg p-6" data-testid={testid}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-[#00FF94]" strokeWidth={1.5} />
        <h3 className="font-display font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
