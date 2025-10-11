"use client"

import { Button } from "@/components/ui/button"
import { ChevronRight, ImageIcon } from "lucide-react"
import { useState } from "react"
import { Header } from "@/components/header"

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      question: "How to get started with AI generation for beginners?",
      answer:
        "AI is not just a tool but a knowledgeable assistant that comprehends your creative intent effortlessly. It democratizes professional image generation, making high-quality visuals achievable for everyone. With AI's assistance, even those without extensive design experience can produce stunning results. This technology streamlines the creative process, offering suggestions, enhancing details, and adapting to individual styles. AI empowers creators to achieve professional-level outcomes, transforming imaginative ideas into visually captivating realities with ease and precision.",
      image: "/creative-workspace.png",
    },
    {
      question: "Is the service free?",
      answer: "Information about pricing and free tier options.",
    },
    {
      question: "Who owns © generated images?",
      answer: "Information about image ownership and copyright.",
    },
    {
      question: "Do you store generated images?",
      answer: "Information about data storage and privacy.",
    },
    {
      question: "May I use the service anonymously?",
      answer: "Information about anonymous usage.",
    },
    {
      question: "What about content policies?",
      answer: "Information about content policies and guidelines.",
    },
    {
      question: "What does mean responsible AI use?",
      answer: "Information about responsible AI usage.",
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Free AI <span className="text-pink-500">Generator</span>
          </h1>
          <p className="text-xl text-gray-400">Powerful mobile app with ultimate AI features</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          {/* Left side - Image with overlay */}
          <div className="relative">
            <img src="/creative-portrait.jpg" alt="AI Generated" className="rounded-lg w-full" />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[80%]">
              <div className="bg-gray-900/80 backdrop-blur-sm border-2 border-pink-500 rounded-full px-6 py-3 text-center">
                <span className="text-pink-500 font-medium">creative portrait photography</span>
              </div>
            </div>
          </div>

          {/* Right side - Content */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              AI <span className="text-pink-500">Generator</span>
            </h2>
            <div className="space-y-4 text-gray-400">
              <p>
                Explore limitless creative possibilities with our AI-powered generator. Create stunning images and
                videos without boundaries. Our free artificial intelligence tool can generate images and videos of any
                subject over 18 based on your text description within seconds. Thousands of{" "}
                <span className="text-white font-semibold">free AI templates</span> and examples can bring all your
                creative desires to life.
              </p>
              <p>
                <span className="text-white font-semibold">Creative Works AI</span> — generate AI content{" "}
                <span className="text-white font-semibold">without registration</span>
              </p>
            </div>
            <div className="space-y-3">
              <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white text-lg py-6">
                Generate AI Content for free
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                className="w-full border-2 border-pink-500 text-pink-500 hover:bg-pink-500/10 text-lg py-6 bg-transparent"
              >
                <ImageIcon className="mr-2 h-5 w-5" />
                See AI Gallery
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* AI Editor Section */}
      <section className="container mx-auto px-4 py-16 bg-gray-900/30">
        <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          {/* Left side - Content */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              AI{" "}
              <span className="text-pink-500 relative">
                Editor
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                  <path d="M0 4 Q50 0, 100 4 T200 4" stroke="#ec4899" strokeWidth="3" fill="none" />
                </svg>
              </span>
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Transform your images with precision using our AI-powered editor. Modify, enhance, and reimagine your
              visuals with simple text commands. Our advanced AI understands your creative vision and applies
              professional-grade edits instantly, giving you complete control over every detail.
            </p>
            <p className="text-gray-400">
              <span className="text-white font-semibold">Creative Works AI</span> — edit images like magic
            </p>
            <Button className="bg-pink-500 hover:bg-pink-600 text-white text-lg py-6 px-8">
              Try AI Editor
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Right side - Image with overlay */}
          <div className="relative">
            <img src="/creative-scene.jpg" alt="AI Editor" className="rounded-lg w-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%]">
              <div className="bg-gray-900/80 backdrop-blur-sm border-2 border-pink-500 rounded-full px-8 py-4 text-center">
                <span className="text-pink-500 font-bold text-xl">like in real</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Generator Section (Portrait) */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          {/* Left side - Image with overlay */}
          <div className="relative">
            <img
              src="/man-in-beige-sweater-in-garden-with-flowers.jpg"
              alt="Creative Portrait"
              className="rounded-lg w-full"
            />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[80%]">
              <div className="bg-gray-900/80 backdrop-blur-sm border-2 border-pink-500 rounded-full px-6 py-3 text-center">
                <span className="text-pink-500 font-medium">creative portrait photography</span>
              </div>
            </div>
          </div>

          {/* Right side - Content */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              AI <span className="text-pink-500">Generator</span>
            </h2>
            <div className="space-y-4 text-gray-400">
              <p>
                Explore limitless creative possibilities with our AI-powered generator. Create stunning images and
                videos without boundaries. Our free artificial intelligence tool can generate images and videos of any
                subject over 18 based on your text description within seconds. Thousands of{" "}
                <span className="text-white font-semibold">free AI templates</span> and examples can bring all your
                creative desires to life.
              </p>
              <p>
                <span className="text-white font-semibold">Creative Works AI</span> — generate AI content{" "}
                <span className="text-white font-semibold">without registration</span>
              </p>
            </div>
            <div className="space-y-3">
              <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white text-lg py-6">
                Generate AI Content for free
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                className="w-full border-2 border-pink-500 text-pink-500 hover:bg-pink-500/10 text-lg py-6 bg-transparent"
              >
                <ImageIcon className="mr-2 h-5 w-5" />
                See AI Gallery
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-900/50 transition-colors"
              >
                <span className={`text-lg font-medium ${openFaq === index ? "text-pink-500" : "text-gray-300"}`}>
                  {faq.question}
                </span>
                <span className="text-2xl text-pink-500">{openFaq === index ? "−" : "+"}</span>
              </button>
              {openFaq === index && (
                <div className="px-6 pb-6">
                  {faq.image && (
                    <div className="mb-4">
                      <img
                        src={faq.image || "/placeholder.svg"}
                        alt="FAQ illustration"
                        className="rounded-lg w-full max-w-md"
                      />
                    </div>
                  )}
                  <p className="text-gray-400 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Video Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          {/* Left side - Content */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              AI <span className="text-pink-500">Videos</span>
            </h2>
            <p className="text-gray-400 leading-relaxed">
              Create captivating AI-powered videos effortlessly with our cutting-edge AI generator. Simply input your
              concepts, and let our advanced AI bring your fantasies to life with stunning visuals and fluid motion. Our
              technology, similar to OpenAI's Sora, can generate ultra-realistic video scenes.
            </p>
            <p className="text-gray-400">
              <span className="text-white font-semibold">Creative Works AI</span> — make AI videos
            </p>
            <Button className="bg-pink-500 hover:bg-pink-600 text-white text-lg py-6 px-8">
              Create AI Video
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Right side - Image with overlay */}
          <div className="relative">
            <img src="/party-celebration.png" alt="AI Generated Video" className="rounded-lg w-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%]">
              <div className="bg-gray-900/80 backdrop-blur-sm border-2 border-pink-500 rounded-full px-8 py-4 text-center">
                <span className="text-pink-500 font-bold text-xl">let's party!</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Images Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="relative">
            <img src="/creative-scene.jpg" alt="Example 1" className="rounded-lg w-full" />
            <div className="absolute top-4 right-4 bg-pink-500 text-white font-bold px-3 py-1 rounded">4k</div>
          </div>
          <div className="relative">
            <img src="/artistic-composition.png" alt="Example 2" className="rounded-lg w-full" />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[80%]">
              <div className="bg-gray-900/80 backdrop-blur-sm border-2 border-pink-500 rounded-full px-6 py-3 text-center">
                <span className="text-pink-500 font-medium">No limits!</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
