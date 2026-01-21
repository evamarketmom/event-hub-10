import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import logoImg from '@/assets/logo.jpg';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Phone, Lock, User, ArrowLeft, AtSign, Check, X, Loader2, CalendarIcon } from 'lucide-react';
import { z } from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const phoneSchema = z.string().min(1, 'Mobile number is required').refine(
  (val) => /^[0-9]{10}$/.test(val),
  { message: 'Please enter a valid 10-digit mobile number' }
);
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');
const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOver18, setIsOver18] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  
  const { user, signUpWithMobile, signInWithMobile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const checkMobileExists = async (mobile: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('mobile_number', mobile)
      .maybeSingle();
    
    return !!data && !error;
  };

  const generateUsername = (name: string, mobile: string): string => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    const lastFourDigits = mobile.slice(-4);
    return cleanName ? `${cleanName}${lastFourDigits}` : '';
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    const checks = {
      minLength: pwd.length >= 6,
      hasUppercase: /[A-Z]/.test(pwd),
      hasLowercase: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
    
    const passedChecks = Object.values(checks).filter(Boolean).length;
    let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
    let color = 'bg-destructive';
    
    if (passedChecks >= 5) {
      strength = 'strong';
      color = 'bg-emerald-500';
    } else if (passedChecks >= 4) {
      strength = 'good';
      color = 'bg-emerald-400';
    } else if (passedChecks >= 3) {
      strength = 'fair';
      color = 'bg-yellow-500';
    }
    
    return { checks, passedChecks, strength, color, percentage: (passedChecks / 5) * 100 };
  };

  const passwordStrength = getPasswordStrength(password);

  // Auto-generate username when name or mobile changes (real-time)
  useEffect(() => {
    if (mode === 'signup' && !usernameManuallyEdited) {
      const generatedUsername = generateUsername(fullName, mobileNumber);
      setUsername(generatedUsername);
      setUsernameAvailable(null);
    }
  }, [fullName, mobileNumber, mode, usernameManuallyEdited]);

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const validationResult = usernameSchema.safeParse(usernameToCheck);
    if (!validationResult.success) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', usernameToCheck)
        .maybeSingle();
      
      setUsernameAvailable(!data && !error);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const validate = async (finalUsername: string) => {
    const newErrors: Record<string, string> = {};

    // Validate mobile number
    const phoneResult = phoneSchema.safeParse(mobileNumber);
    if (!phoneResult.success) {
      newErrors.mobileNumber = phoneResult.error.errors[0].message;
    }

    // Validate password
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (mode === 'signup') {
      // Validate full name
      const nameResult = nameSchema.safeParse(fullName);
      if (!nameResult.success) {
        newErrors.fullName = nameResult.error.errors[0].message;
      }

      // Validate username (using the finalUsername which is auto-filled if blank)
      const usernameResult = usernameSchema.safeParse(finalUsername);
      if (!usernameResult.success) {
        newErrors.username = usernameResult.error.errors[0].message;
      } else {
        // Check availability for the final username
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', finalUsername)
          .maybeSingle();
        
        if (data) {
          newErrors.username = 'This username is already taken';
        }
      }

      // Validate confirm password
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }

      // Check age confirmation
      if (!isOver18) {
        newErrors.age = 'You must confirm you are 18 years or older';
      }

      // Validate date of birth
      if (!dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required';
      }

      // Check if mobile number already exists (only for signup)
      if (!newErrors.mobileNumber) {
        const exists = await checkMobileExists(mobileNumber);
        if (exists) {
          newErrors.mobileNumber = 'This mobile number is already registered';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Auto-fill username if blank
      let finalUsername = username;
      if (mode === 'signup' && !username.trim()) {
        finalUsername = generateUsername(fullName, mobileNumber);
        setUsername(finalUsername);
      }

      const isValid = await validate(finalUsername);
      if (!isValid) {
        setLoading(false);
        return;
      }

      if (mode === 'signin') {
        const { error } = await signInWithMobile(mobileNumber, password);
        if (error) {
          toast({
            title: 'Sign in failed',
            description: error.message,
            variant: 'destructive'
          });
        }
      } else {
        const { error } = await signUpWithMobile(mobileNumber, password, fullName, finalUsername, dateOfBirth ? format(dateOfBirth, 'yyyy-MM-dd') : undefined);
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

              <form onSubmit={handleAuth} className="space-y-4 mt-4">
                {/* Full Name - only for signup */}
                {mode === 'signup' && (
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
                )}

                {/* Username - only for signup */}
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="username">Username (User ID)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="username" 
                          placeholder="Choose a unique username" 
                          className="pl-10 pr-10" 
                          value={username} 
                          onChange={e => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                            setUsername(value);
                            if (value) {
                              setUsernameManuallyEdited(true);
                            } else {
                              // Reset to auto-generate when cleared
                              setUsernameManuallyEdited(false);
                            }
                            setUsernameAvailable(null);
                          }}
                          maxLength={30}
                        />
                        {username.length >= 3 && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {checkingUsername ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : usernameAvailable === true ? (
                              <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                            ) : usernameAvailable === false ? (
                              <X className="h-4 w-4 text-destructive" />
                            ) : null}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!username || username.length < 3 || checkingUsername}
                        onClick={() => checkUsernameAvailability(username)}
                        className="shrink-0"
                      >
                        {checkingUsername ? 'Checking...' : 'Check'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Auto-generated from your name + last 4 digits of mobile. You can customize it.
                    </p>
                    {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                    {usernameAvailable === true && !errors.username && (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">Username is available!</p>
                    )}
                    {usernameAvailable === false && (
                      <p className="text-sm text-destructive">Username is already taken. Try another.</p>
                    )}
                  </div>
                )}

                {/* Mobile Number */}
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
                  
                  {/* Password Strength Indicator - only for signup */}
                  {mode === 'signup' && password && (
                    <div className="space-y-2">
                      {/* Strength Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.percentage}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium capitalize ${
                          passwordStrength.strength === 'strong' ? 'text-emerald-500' :
                          passwordStrength.strength === 'good' ? 'text-emerald-400' :
                          passwordStrength.strength === 'fair' ? 'text-yellow-500' :
                          'text-destructive'
                        }`}>
                          {passwordStrength.strength}
                        </span>
                      </div>
                      
                      {/* Requirements Checklist */}
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className={`flex items-center gap-1 ${passwordStrength.checks.minLength ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {passwordStrength.checks.minLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>6+ characters</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.checks.hasUppercase ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {passwordStrength.checks.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>Uppercase letter</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.checks.hasLowercase ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {passwordStrength.checks.hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>Lowercase letter</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.checks.hasNumber ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {passwordStrength.checks.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>Number</span>
                        </div>
                        <div className={`flex items-center gap-1 ${passwordStrength.checks.hasSpecial ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          {passwordStrength.checks.hasSpecial ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          <span>Special character</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                  <>
                    {/* Date of Birth */}
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateOfBirth && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateOfBirth ? format(dateOfBirth, "PPP") : <span>Pick your date of birth</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateOfBirth}
                            onSelect={setDateOfBirth}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                            captionLayout="dropdown-buttons"
                            fromYear={1920}
                            toYear={new Date().getFullYear()}
                          />
                        </PopoverContent>
                      </Popover>
                      <p className="text-xs text-muted-foreground">Your date of birth is private and only visible to admins</p>
                      {errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth}</p>}
                    </div>

                    {/* Age verification checkbox */}
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
                  </>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 gradient-primary text-white font-semibold" 
                  disabled={loading || (mode === 'signup' && !isOver18)}
                >
                  {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Button>

                {mode === 'signin' && (
                  <div className="text-center">
                    <Button 
                      type="button"
                      variant="link" 
                      onClick={() => navigate('/forgot-password')}
                      className="text-sm text-primary"
                    >
                      Forgot Password?
                    </Button>
                  </div>
                )}
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
