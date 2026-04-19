import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Mail,
  Zap,
  Users,
  Eye,
  ArrowRight,
  Star,
  CheckCircle2,
  Moon,
  Sun,
  Sparkles,
  TrendingUp,
  Clock,
  Send,
} from 'lucide-react';
import { RapidmailLogo } from '@/components/RapidmailLogo';
import { AuthModal } from '@/components/AuthModal';
import { useState, useEffect } from 'react';

function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary">
              <RapidmailLogo />
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                How it works
              </a>
              <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                About
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="rounded-full">
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => setIsAuthModalOpen(true)}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-background to-background"></div>

        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI-Powered Email Platform</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                  Rapidly Send Emails in{' '}
                  <span className="text-primary relative">
                    Seconds
                    <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none">
                      <path d="M2 10C80 2 220 2 298 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary/40" />
                    </svg>
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
                  Send high-performing email campaigns in seconds with a fast, intuitive platform built to help you
                  reach the right audience, improve deliverability, and scale your outreach effortlessly.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="rounded-xl px-8 py-6 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  onClick={() => setIsAuthModalOpen(true)}
                >
                  Sign up to start
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" className="rounded-xl px-8 py-6 text-lg font-semibold">
                  Watch Demo
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 rounded-full bg-primary/20 border-2 border-background"></div>
                    <div className="h-8 w-8 rounded-full bg-primary/30 border-2 border-background"></div>
                    <div className="h-8 w-8 rounded-full bg-primary/40 border-2 border-background"></div>
                  </div>
                  <span className="text-sm text-muted-foreground">10,000+ users</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-sm font-medium ml-1">4.9/5</span>
                </div>
              </div>
            </div>

            {/* Product Mockup */}
            <div className="relative">
              <Card className="rounded-3xl border-2 border-primary/20 shadow-2xl overflow-hidden backdrop-blur-sm bg-card/95">
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Subject</label>
                    <div className="p-4 rounded-xl bg-background/80 border border-border">
                      <p className="text-sm">
                        Hi <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-medium">{'{{Name}}'}</span>, exclusive offer for{' '}
                        <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-medium">{'{{Company}}'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email Preview</label>
                    <div className="p-6 rounded-xl bg-background/80 border border-border space-y-4">
                      <p className="text-sm leading-relaxed">
                        Hi <span className="font-semibold text-primary">John Smith</span>,
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        We're excited to offer <span className="font-semibold text-foreground">Acme Corp</span> an exclusive 30% discount on our premium plan.
                      </p>
                      <Button size="sm" className="rounded-lg">Claim Offer</Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-xs text-muted-foreground">Variables auto-personalize for each recipient</p>
                  </div>
                </CardContent>
              </Card>

              <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-primary/5 blur-3xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '10K+', label: 'Active Users' },
              { value: '1M+', label: 'Emails Sent' },
              { value: '99.9%', label: 'Delivery Rate' },
              { value: '4.9/5', label: 'User Rating' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Everything you need to succeed</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help you create and send email campaigns that convert
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Send className="h-8 w-8" />, title: 'Bulk Sending at Scale', description: 'Send thousands of personalized emails in seconds with our optimized delivery system.' },
              { icon: <Sparkles className="h-8 w-8" />, title: 'Smart Personalization', description: 'Use dynamic variables to customize every email for each recipient automatically.' },
              { icon: <Zap className="h-8 w-8" />, title: 'AI Email Assistant', description: 'Get intelligent suggestions for subject lines, content, and optimal send times.' },
              { icon: <Eye className="h-8 w-8" />, title: 'Real-Time Preview', description: 'See exactly how your email looks for each contact before sending.' },
            ].map((feature, index) => (
              <Card key={index} className="rounded-2xl border-2 hover:border-primary/30 transition-all hover:shadow-lg group">
                <CardContent className="p-8 space-y-4">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">How Rapidmail Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Get started in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: '01', title: 'Import Contacts', description: 'Upload your contact list via CSV or add recipients manually. Organize with custom fields and segments.', icon: <Users className="h-8 w-8" /> },
              { step: '02', title: 'Write & Personalize', description: 'Use our rich editor to craft beautiful emails. Add personalization variables like {{Name}} and {{Company}}.', icon: <Mail className="h-8 w-8" /> },
              { step: '03', title: 'Send & Track Results', description: 'Preview how emails look for each recipient, then send immediately or schedule for later. Track performance in real-time.', icon: <TrendingUp className="h-8 w-8" /> },
            ].map((item, index) => (
              <Card key={index} className="rounded-2xl border-2 h-full">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      {item.icon}
                    </div>
                    <div className="text-5xl font-bold text-primary/20">{item.step}</div>
                  </div>
                  <h3 className="text-2xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Why teams choose Rapidmail</h2>
              <div className="space-y-6">
                {[
                  { icon: <TrendingUp className="h-6 w-6" />, title: 'Increase Reply Rates', description: 'Personalized emails get 6x higher response rates than generic blasts.' },
                  { icon: <Clock className="h-6 w-6" />, title: 'Save Time', description: 'Automate personalization and send thousands of emails in seconds, not hours.' },
                  { icon: <Zap className="h-6 w-6" />, title: 'Scale Outreach Easily', description: 'From 100 to 100,000 contacts, our platform grows with your business.' },
                ].map((benefit, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <Card className="rounded-3xl border-2 border-primary/20 shadow-2xl overflow-hidden bg-linear-to-br from-card to-primary/5">
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-3">
                    {[
                      'Campaign sent to 5,234 recipients',
                      '98.7% delivery rate',
                      '45% open rate (industry avg: 21%)',
                    ].map((text) => (
                      <div key={text} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium">{text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-border"></div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[{ value: '5.2K', label: 'Sent' }, { value: '2.3K', label: 'Opened' }, { value: '847', label: 'Clicked' }].map((s) => (
                      <div key={s.label}>
                        <div className="text-3xl font-bold text-primary">{s.value}</div>
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Loved by marketing teams</h2>
            <p className="text-xl text-muted-foreground">See what our customers have to say</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Sarah Johnson', role: 'Marketing Director', company: 'TechCorp', content: "Rapidmail transformed our email marketing. We've seen a 45% increase in engagement rates. The personalization features are game-changing.", rating: 5 },
              { name: 'Michael Chen', role: 'Founder', company: 'StartupHub', content: "The easiest email platform I've used. Setup took minutes, and our first campaign went out the same day. ROI has been excellent.", rating: 5 },
              { name: 'Emma Williams', role: 'E-commerce Manager', company: 'ShopCo', content: 'Outstanding support and powerful features. The analytics help us understand our audience better. Highly recommend!', rating: 5 },
            ].map((t, index) => (
              <Card key={index} className="rounded-2xl border-2">
                <CardContent className="p-8 space-y-4">
                  <div className="flex gap-1">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground leading-relaxed italic">"{t.content}"</p>
                  <div className="pt-4 border-t">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{t.role} at {t.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-primary/5 to-background"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Start sending smarter emails today</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join 10,000+ businesses growing with Rapidmail. Start your free trial — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="rounded-xl px-8 py-6 text-lg font-semibold shadow-lg shadow-primary/25"
                onClick={() => setIsAuthModalOpen(true)}
              >
                Sign up to start
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground pt-4">
              {['14-day free trial', 'No credit card required', 'Cancel anytime'].map((text) => (
                <div key={text} className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="border-t bg-card py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Templates'] },
              { title: 'Company', links: ['About', 'Blog', 'Contact'] },
              { title: 'Resources', links: ['Documentation', 'Support', 'API'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'GDPR'] },
            ].map((col) => (
              <div key={col.title}>
                <h3 className="font-semibold mb-4">{col.title}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="hover:text-primary transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">© 2026 Rapidmail. All rights reserved.</div>
          </div>
        </div>
      </footer>

      <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </div>
  );
}

export default Home;
