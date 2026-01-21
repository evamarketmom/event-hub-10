import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, BarChart3 } from 'lucide-react';

interface CreatePollDialogProps {
  communityId: string;
  onPollCreated: () => void;
}

export function CreatePollDialog({ communityId, onPollCreated }: CreatePollDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Please sign in', variant: 'destructive' });
      return;
    }

    const validOptions = options.filter(o => o.trim());
    if (!question.trim()) {
      toast({ title: 'Please enter a question', variant: 'destructive' });
      return;
    }

    if (validOptions.length < 2) {
      toast({ title: 'Please add at least 2 options', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      // Create the poll
      const { data: poll, error: pollError } = await supabase
        .from('community_polls')
        .insert({
          community_id: communityId,
          created_by: user.id,
          question: question.trim(),
          ends_at: hasEndDate && endDate ? new Date(endDate).toISOString() : null,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create the options
      const optionsData = validOptions.map(option => ({
        poll_id: poll.id,
        option_text: option.trim(),
      }));

      const { error: optionsError } = await supabase
        .from('community_poll_options')
        .insert(optionsData);

      if (optionsError) throw optionsError;

      toast({ title: 'Poll created!' });
      setOpen(false);
      resetForm();
      onPollCreated();
    } catch (error: any) {
      console.error('Error creating poll:', error);
      toast({ title: 'Error creating poll', description: error.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setQuestion('');
    setOptions(['', '']);
    setHasEndDate(false);
    setEndDate('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-primary text-white">
          <BarChart3 className="mr-2 h-4 w-4" />
          Create Poll
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a Poll</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Options</Label>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="has-end-date">Set end date</Label>
            <Switch
              id="has-end-date"
              checked={hasEndDate}
              onCheckedChange={setHasEndDate}
            />
          </div>

          {hasEndDate && (
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={creating}
            className="gradient-primary text-white"
          >
            {creating ? 'Creating...' : 'Create Poll'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
