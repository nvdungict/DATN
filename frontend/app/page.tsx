import Link from 'next/link';
import { Sparkles, MapPin, Zap, Shield, Check, Play, ArrowRight, ChevronDown, Globe, Mail, Phone } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 text-white font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/8 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/30">
                ✈️
              </div>
              <span className="font-bold text-xl tracking-tight text-white">TravelAI</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <Link href="#features" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Features</Link>
                <Link href="#destinations" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Destinations</Link>
                <Link href="#pricing" className="text-slate-300 hover:text-white text-sm font-medium transition-colors">Pricing</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">Log In</Link>
              <Link href="/register" className="text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/25 transform hover:-translate-y-0.5">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Abstract Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-40 right-0 w-96 h-96 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-xl shadow-lg">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold tracking-wide uppercase text-indigo-200">AI-Powered Travel Companion</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-slate-400">
            Your Dream Trip <br />
            Starts Here
          </h1>
          
          <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Our intelligent AI assistant helps you plan detailed itineraries, discover hidden gems, and manage your budget—all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-lg transition-all duration-300 transform hover:-translate-y-1 shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2">
              Start Planning Free <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-lg backdrop-blur-xl border border-white/10 transition-all duration-300 flex items-center justify-center gap-2">
              <Play className="w-5 h-5 fill-current" /> Watch Demo
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto pt-10 border-t border-white/10">
            <div>
              <div className="text-3xl font-bold text-white mb-1">500k+</div>
              <div className="text-sm text-slate-400">Happy Travelers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">2M+</div>
              <div className="text-sm text-slate-400">Trips Planned</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1">180+</div>
              <div className="text-sm text-slate-400">Countries Covered</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white mb-1 flex justify-center items-baseline gap-1">
                4.9<span className="text-indigo-400 text-xl">★</span>
              </div>
              <div className="text-sm text-slate-400">Average Rating</div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-bounce">
          <span className="text-[10px] uppercase tracking-widest text-slate-400">Scroll Down</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything you need for the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">perfect trip</span>
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">From AI generation to collaborative booking, we handle the logistics so you can focus on the adventure.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Smart AI Planning</h3>
              <p className="text-slate-400 leading-relaxed">
                Our AI analyzes your preferences, budget, and timeframe to generate an optimal, day-by-day itinerary in seconds.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-violet-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 group">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Discover 10,000+ Spots</h3>
              <p className="text-slate-400 leading-relaxed">
                Access a massive database of curated destinations with real reviews, stunning photos, and community insights.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Instant Booking</h3>
              <p className="text-slate-400 leading-relaxed">
                Connect directly with 500+ premium providers for hotels, tours, and restaurants—book everything in one click.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-rose-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10 group">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Backup Itineraries</h3>
              <p className="text-slate-400 leading-relaxed">
                Automatically generate alternative plans if bad weather hits, places close unexpectedly, or your mood changes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-slate-400">Start for free, upgrade when you need more power.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
            {/* Free Tier */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
              <h3 className="text-xl font-bold mb-2 text-white">Basic</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-slate-400">/ forever</span>
              </div>
              <ul className="space-y-4 mb-8 text-slate-300">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>3 trips per month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>Basic AI recommendations</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>Save up to 10 places</span>
                </li>
              </ul>
              <Link href="/register" className="block text-center w-full py-3 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-colors border border-white/10">
                Get Started
              </Link>
            </div>

            {/* Premium Tier */}
            <div className="bg-gradient-to-br from-indigo-900/80 to-violet-900/80 backdrop-blur-xl rounded-3xl p-8 border border-indigo-500/50 relative transform md:-translate-y-4 shadow-2xl shadow-indigo-500/20">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg">
                Most Popular
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">Pro Traveler</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-bold text-white">$9</span>
                <span className="text-indigo-200 font-medium">/ month</span>
              </div>
              <ul className="space-y-4 mb-8 text-indigo-100 font-medium">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-white shrink-0" />
                  <span>Unlimited trips</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-white shrink-0" />
                  <span>Advanced AI & Copilot</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-white shrink-0" />
                  <span>Real-time weather tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-white shrink-0" />
                  <span>Smart Budgeting tools</span>
                </li>
              </ul>
              <Link href="/register" className="block text-center w-full py-3 rounded-xl bg-white text-indigo-900 font-bold hover:bg-slate-100 transition-colors shadow-lg">
                Start Free Trial
              </Link>
            </div>

            {/* Business Tier */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
              <h3 className="text-xl font-bold mb-2 text-white">Agency</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-bold text-white">1.200.000</span>
                <span className="text-slate-400">₫ / month</span>
              </div>
              <ul className="space-y-4 mb-8 text-slate-300">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>Team collaboration (10 seats)</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span>Client export & branding</span>
                </li>
              </ul>
              <Link href="/register" className="block text-center w-full py-3 rounded-xl bg-white/5 text-white font-semibold hover:bg-white/10 transition-colors border border-white/10">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 backdrop-blur-2xl rounded-[2rem] p-12 md:p-20 text-center border border-white/10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                Ready for your next <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">adventure?</span>
              </h2>
              <p className="text-slate-300 text-lg mb-10 max-w-2xl mx-auto">
                Join 500,000+ travelers using TravelAI to plan unforgettable journeys in minutes.
              </p>
              <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-lg transition-transform transform hover:-translate-y-1 shadow-lg shadow-indigo-500/25">
                Create Free Account <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 pt-16 pb-8 bg-slate-950/50 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg">
                <span className="text-sm">✈️</span>
              </div>
              <span className="font-bold text-xl tracking-tight text-white">TravelAI</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400">
              <Link href="#" className="hover:text-white transition-colors">About</Link>
              <Link href="#" className="hover:text-white transition-colors">Blog</Link>
              <Link href="#" className="hover:text-white transition-colors">Support</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            </div>
            
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/10">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/10">
                <Mail className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/10">
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div className="text-center text-sm text-slate-600 border-t border-white/5 pt-8">
            © 2026 TravelAI. Made with <span className="text-red-500">❤️</span> to help you explore the world.
          </div>
        </div>
      </footer>
    </div>
  );
}
