import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { repoName, isPrivate, files } = await req.json();

    // Get GitHub token from connected_accounts
    const { data: account, error: accountError } = await supabase
      .from('connected_accounts')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('provider', 'github')
      .eq('is_active', true)
      .single();

    if (accountError || !account?.access_token) {
      return new Response(JSON.stringify({ error: 'no_github_account', message: 'No GitHub account connected' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ghToken = account.access_token;
    const ghHeaders = {
      'Authorization': `token ${ghToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // Create repo
    const repoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({
        name: repoName,
        private: isPrivate,
        auto_init: true,
        description: 'Generated with Wiser AI Builder',
      }),
    });

    if (!repoRes.ok) {
      const errData = await repoRes.json();
      return new Response(JSON.stringify({ error: 'repo_create_failed', message: errData.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const repo = await repoRes.json();
    const owner = repo.owner.login;

    // Wait briefly for repo initialization
    await new Promise(r => setTimeout(r, 1500));

    // Commit each file
    for (const file of files) {
      const content = btoa(unescape(encodeURIComponent(file.content)));
      await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`, {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify({
          message: `Add ${file.path}`,
          content,
        }),
      });
    }

    return new Response(JSON.stringify({ repoUrl: repo.html_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
