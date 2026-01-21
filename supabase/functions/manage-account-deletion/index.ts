import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Account deletion action: ${action} for user: ${user_id}`);

    if (action === 'request_deletion') {
      // Check if there's already a pending request
      const { data: existingRequest, error: checkError } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', user_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing request:', checkError);
        throw checkError;
      }

      if (existingRequest) {
        return new Response(
          JSON.stringify({ 
            error: 'A deletion request is already pending',
            existing_request: existingRequest
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create new deletion request
      const scheduledDeletionAt = new Date();
      scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 3);

      const { data: newRequest, error: insertError } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id,
          scheduled_deletion_at: scheduledDeletionAt.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating deletion request:', insertError);
        throw insertError;
      }

      console.log('Deletion request created:', newRequest);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Account deletion scheduled',
          deletion_request: newRequest
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'cancel_deletion') {
      // Find and cancel the pending request
      const { data: cancelledRequest, error: cancelError } = await supabase
        .from('account_deletion_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('status', 'pending')
        .select()
        .single();

      if (cancelError) {
        console.error('Error cancelling deletion request:', cancelError);
        if (cancelError.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'No pending deletion request found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        throw cancelError;
      }

      console.log('Deletion request cancelled:', cancelledRequest);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Account deletion cancelled',
          deletion_request: cancelledRequest
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'get_status') {
      // Get current deletion request status
      const { data: request, error: statusError } = await supabase
        .from('account_deletion_requests')
        .select('*')
        .eq('user_id', user_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (statusError) {
        console.error('Error getting deletion status:', statusError);
        throw statusError;
      }

      return new Response(
        JSON.stringify({ 
          has_pending_request: !!request,
          deletion_request: request
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use: request_deletion, cancel_deletion, or get_status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    console.error('Error in manage-account-deletion:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
