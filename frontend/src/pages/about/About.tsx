import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Zap, Shield, Users, Target, TrendingUp, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/app/hook';
import { createFeedbackApi } from '@/features/feedback/feedbackApi';
import { feedbackFormSchema, type FeedbackCreateInput, type FeedbackType } from '@/schema/feedback';

const features = [
  {
    icon: <Mail className="h-8 w-8" />,
    title: 'Easy Email Creation',
    description: 'Create professional email campaigns with our intuitive editor and customizable templates.',
  },
  {
    icon: <Zap className="h-8 w-8" />,
    title: 'Fast Delivery',
    description: 'Send emails to thousands of recipients in seconds with our optimized delivery system.',
  },
  {
    icon: <Shield className="h-8 w-8" />,
    title: 'Secure & Reliable',
    description: 'Your data is protected with enterprise-grade security and encrypted connections.',
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: 'List Management',
    description: 'Easily manage your contacts, segment your audience, and personalize your messages.',
  },
  {
    icon: <Target className="h-8 w-8" />,
    title: 'Targeted Campaigns',
    description: 'Use variables and custom fields to create highly personalized email experiences.',
  },
  {
    icon: <TrendingUp className="h-8 w-8" />,
    title: 'Analytics & Insights',
    description: 'Track your campaign performance with detailed reports and actionable insights.',
  },
];

const About = () => {
  const userEmail = useAppSelector((state) => state.auth.user?.email ?? '');
  const dispatch = useAppDispatch();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: FeedbackCreateInput = {
      type: feedbackType,
      title: subject,
      message,
    };

    try {
      await feedbackFormSchema.validate(payload, { abortEarly: true });
    } catch (err) {
      if (err instanceof Error) toast.error(err.message);
      return;
    }

    setSubmittingFeedback(true);
    try {
      await dispatch(createFeedbackApi(payload)).unwrap();
      toast.success('Thank you for your feedback!');
      setSubject('');
      setMessage('');
      setFeedbackType('general');
    } catch {
      toast.error('Failed to submit feedback, please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">About Rapidmail</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your all-in-one email marketing platform for creating, sending, and tracking
          professional email campaigns with ease.
        </p>
      </div>

      {/* Contact & Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
              <p className="text-muted-foreground mb-6">
                Have questions or need help? Our support team is here to assist you.
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> support@rapidmail.com</p>
                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
                <p><strong>Address:</strong> 123 Marketing Street, Digital City, DC 12345</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#9d7d59]/10 text-[#9d7d59] mb-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Send Feedback</h2>
              <p className="text-muted-foreground text-sm">
                We'd love to hear from you! Share your thoughts and suggestions.
              </p>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback-type">Feedback Type</Label>
                <Select value={feedbackType} onValueChange={(v) => setFeedbackType(v as FeedbackType)}>
                  <SelectTrigger id="feedback-type">
                    <SelectValue placeholder="Select feedback type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">🐛 Bug Report</SelectItem>
                    <SelectItem value="feature">✨ Feature Request</SelectItem>
                    <SelectItem value="general">💬 General Feedback</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your feedback"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more about your feedback..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  disabled
                  className="bg-muted"
                />
              </div>

              <Button type="submit" className="w-full" disabled={submittingFeedback}>
                <Send className="h-4 w-4 mr-2" />
                {submittingFeedback ? 'Đang gửi...' : 'Submit Feedback'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Mission */}
      <Card className="mb-12">
        <CardContent className="pt-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              At Rapidmail, we're dedicated to empowering businesses of all sizes to connect
              with their audience through effective email marketing. We believe that powerful
              marketing tools should be accessible, intuitive, and affordable for everyone.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8">Why Choose Rapidmail?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="mb-4 text-primary">{feature.icon}</div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stats */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-sm opacity-90">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">1M+</div>
              <div className="text-sm opacity-90">Emails Sent</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-sm opacity-90">Delivery Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default About;
