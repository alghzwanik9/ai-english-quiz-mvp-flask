import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSessionUser } from "../lib/storage";
import { Button } from "../ui";
import { ArrowRight, BookOpen, BrainCircuit, GraduationCap } from "lucide-react";

export default function Home() {
  const nav = useNavigate();
  const user = getSessionUser();

  const features = [
    {
      title: "For Teachers",
      desc: "Create dynamic tests and generate high-quality questions instantly using advanced AI.",
      icon: GraduationCap,
      color: "bg-zinc-100 text-black",
    },
    {
      title: "For Students",
      desc: "Take interactive tests, get instant feedback, and summarize learning materials with AI.",
      icon: BookOpen,
      color: "bg-zinc-100 text-black",
    },
    {
      title: "AI Powered",
      desc: "Multi-type question generation: MCQ, True-False, Fill in the blanks, and Reading comprehension.",
      icon: BrainCircuit,
      color: "bg-zinc-100 text-black",
    },
  ];

  return (
    <div className="space-y-16 pb-20 animate-in">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 border border-black/10 text-black text-xs font-black mb-8 uppercase tracking-widest">
            NEXT-GEN ENGLISH LEARNING
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-black tracking-tighter leading-none mb-8">
            Master English with <br />
            AI Intelligence
          </h1>
          
          <p className="max-w-2xl mx-auto mb-10 text-zinc-600 text-lg font-medium leading-relaxed">
            Create professional tests in seconds using AI, track progress with precision, and elevate your learning experience to a new elite standard.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!user ? (
              <>
                <Button size="lg" className="btn-primary h-14 px-10 text-lg" onClick={() => nav("/register")}>
                  Get Started for Free
                </Button>
                <Button size="lg" variant="outline" className="btn-secondary h-14 px-10 text-lg" onClick={() => nav("/login")}>
                  Sign In
                </Button>
              </>
            ) : (
              <Button 
                size="lg"
                className="btn-primary h-14 px-10 text-lg"
                onClick={() => nav(user.role === "teacher" ? "/teacher" : "/student")}
              >
                Back to Dashboard <ArrowRight size={20} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-3 gap-8 px-6">
        {features.map((f, i) => (
          <div key={i} className="modern-card p-10 group bg-white border border-black/10">
            <div className={`inline-flex p-4 rounded-xl ${f.color} mb-8 group-hover:bg-black group-hover:text-white transition-all duration-300`}>
              <f.icon size={28} />
            </div>
            <h3 className="text-2xl font-black text-black mb-4">{f.title}</h3>
            <p className="text-zinc-500 font-medium leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Demo Account Indicator */}
      <section className="text-center pt-10">
        <div className="inline-block bg-zinc-100 rounded-lg px-8 py-4 border border-black/5">
          <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest">
            Quick Demo: <span className="text-black">teacher1@test.com</span> / <span className="text-black">1234</span>
          </p>
        </div>
      </section>
    </div>
  );
}
