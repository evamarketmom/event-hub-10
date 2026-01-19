import { useState, useEffect } from 'react';
import logoImg from '@/assets/logo.jpg';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Phone, Lock, User, ArrowLeft, Mail } from 'lucide-react';
import { z } from 'zod';
import { Checkbox } from '@/components/ui/checkbox';

const phoneSchema = z.string().min(1, 'Mobile number is required').refine(
  (val) => /^[0-9]{10}$/.test(val),
  { message: 'Please enter a valid 10-digit mobile number' }
);
const emailOrPhoneSchema = z.string().min(1, 'Email or mobile number is required');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOver18, setIsOver18] = useState(false);
  
  const {
    user,
    signInWithEmail,
    signUpWithEmail
  } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (mode === 'signin') {
      // For sign in, just check if value exists
      if (!emailOrPhone.trim()) {
        newErrors.emailOrPhone = 'Email or mobile number is required';
      }
    } else {
      // For sign up, validate mobile number only
      const phoneResult = phoneSchema.safeParse(mobileNumber);
      if (!phoneResult.success) {
        newErrors.mobileNumber = phoneResult.error.errors[0].message;
      }
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (mode === 'signup') {
      const nameResult = nameSchema.safeParse(fullName);
      if (!nameResult.success) {
        newErrors.fullName = nameResult.error.errors[0].message;
      }

      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }

      if (!isOver18) {
        newErrors.age = 'You must confirm you are 18 years or older';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (mode === 'signin') {
        // For sign in, convert phone to email format if needed
        const isEmailInput = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
        const authEmail = isEmailInput ? emailOrPhone : `${emailOrPhone}@sms.samrambhak.app`;
        const { error } = await signInWithEmail(authEmail, password);
        if (error) {
          toast({
            title: 'Sign in failed',
            description: error.message,
            variant: 'destructive'
          });
        }
      } else {
        // For sign up, use mobile number only - convert to email format for Supabase
        const authEmail = `${mobileNumber}@sms.samrambhak.app`;
        const { error } = await signUpWithEmail(authEmail, password, fullName, undefined, mobileNumber);
        if (error) {
          toast({
            title: 'Sign up failed',
            description: error.message,
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Account created!',
            description: 'Welcome to സംരംഭക.com! Please complete your profile in Settings.'
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to home
        </Button>

        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logoImg} alt="സംരംഭക Logo" className="h-20 w-auto rounded-2xl mx-auto mb-4 shadow-glow" />
          <h1 className="text-3xl font-bold text-foreground">സംരംഭക.com</h1>
          <p className="text-muted-foreground mt-2">Connect. Build. Grow.</p>
        </div>

        <Card className="shadow-medium border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </CardTitle>
            <CardDescription className="text-center">
              {mode === 'signin' ? 'Sign in to continue your entrepreneurial journey' : 'Start your journey as an entrepreneur today'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Form */}
            <Tabs value={mode} onValueChange={v => setMode(v as 'signin' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <form onSubmit={handleEmailAuth} className="space-y-4 mt-4">
                <TabsContent value="signup" className="mt-0 space-y-4">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="fullName" 
                        placeholder="Enter your full name" 
                        className="pl-10" 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)} 
                      />
                    </div>
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>

                  {/* Mobile Number for Sign Up */}
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="mobileNumber" 
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        placeholder="Enter 10-digit mobile number"
                        className="pl-10" 
                        value={mobileNumber} 
                        onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))} 
                      />
                    </div>
                    {errors.mobileNumber && <p className="text-sm text-destructive">{errors.mobileNumber}</p>}
                  </div>

                </TabsContent>

                {/* Email or Phone for Sign In only */}
                {mode === 'signin' && (
                  <div className="space-y-2">
                    <Label htmlFor="emailOrPhone">Email / Mobile</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="emailOrPhone" 
                        type="text"
                        placeholder="Email or mobile number"
                        className="pl-10" 
                        value={emailOrPhone} 
                        onChange={e => setEmailOrPhone(e.target.value.trim())} 
                      />
                    </div>
                    {errors.emailOrPhone && <p className="text-sm text-destructive">{errors.emailOrPhone}</p>}
                  </div>
                )}

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Enter your password" 
                      className="pl-10 pr-10" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                {/* Confirm Password (only for signup) */}
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="confirmPassword" 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        placeholder="Repeat your password" 
                        className="pl-10 pr-10" 
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>
                )}

                {mode === 'signup' && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="age-verification" 
                        checked={isOver18}
                        onCheckedChange={(checked) => setIsOver18(checked === true)}
                      />
                      <Label 
                        htmlFor="age-verification" 
                        className="text-sm font-normal cursor-pointer"
                      >
                        I confirm that I am 18 years of age or older
                      </Label>
                    </div>
                    {errors.age && <p className="text-sm text-destructive">{errors.age}</p>}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 gradient-primary text-white font-semibold" 
                  disabled={loading || (mode === 'signup' && !isOver18)}
                >
                  {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>
            </Tabs>

            <p className="text-center text-sm text-muted-foreground mt-4">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}