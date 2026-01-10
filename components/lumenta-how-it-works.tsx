"use client"

import { motion } from "framer-motion"
import { Upload, Eye, ListChecks } from "lucide-react"

const steps = [
  {
    icon: Upload,
    title: "Upload Clips",
    description: "Upload video files that loop continuously as camera feeds",
  },
  {
    icon: Eye,
    title: "Watch the Wall",
    description: "Monitor all feeds simultaneously with real-time activity detection",
  },
  {
    icon: ListChecks,
    title: "Review Incidents",
    description: "Analyze detected events and signals in the incident log",
  },
]

export function LumentaHowItWorks() {
  return (
    <section className="relative py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Simple workflow to transform video clips into actionable intelligence
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800"
            >
              <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center mb-4">
                <step.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
