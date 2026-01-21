-- Add date_of_birth column to profiles table (hidden from public, visible to admins)
ALTER TABLE public.profiles 
ADD COLUMN date_of_birth date;