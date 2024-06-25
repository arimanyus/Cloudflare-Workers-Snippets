import { createClient } from '@supabase/supabase-js';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method === 'POST') {
      try {
        const { email, 'g-recaptcha-response': recaptchaResponse } = await request.json();

        if (!email) {
          return new Response('Email is required', {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        if (!recaptchaResponse) {
          return new Response('reCAPTCHA is required', {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        // Validate reCAPTCHA using reCAPTCHA Enterprise REST API
        const recaptchaApiKey = 'Your-GCloud-API-Key';
        const recaptchaSiteKey = 'ReCaptcha-Site-key'; // Replace with your site key
        const recaptchaApiUrl = `https://recaptchaenterprise.googleapis.com/v1/projects/project-00000000/assessments?key=${recaptchaApiKey}`;

        const recaptchaRequestBody = {
          event: {
            token: recaptchaResponse,
            expectedAction: 'submit',
            siteKey: recaptchaSiteKey,
          },
        };

        const recaptchaValidationResponse = await fetch(recaptchaApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(recaptchaRequestBody),
        });

        const recaptchaValidationData = await recaptchaValidationResponse.json();

        // Debugging: Log the reCAPTCHA validation response
        console.log('reCAPTCHA validation response:', recaptchaValidationData);

        if (!recaptchaValidationData.tokenProperties || !recaptchaValidationData.tokenProperties.valid) {
          return new Response('Invalid reCAPTCHA', {
            status: 400,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        // Initialize Supabase client
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('Received email:', email);

        // Insert email into Supabase
        const { data, error } = await supabase
          .from('Email_Responses') // Ensure the table name is correct
          .insert([{ email }]);

        if (error) {
          console.error('Supabase error:', error);
          return new Response(`Failed to save email: ${JSON.stringify(error)}`, {
            status: 500,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        return new Response('Email saved successfully', {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        console.error('Worker error:', error);
        return new Response('Internal Server Error', {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } else {
      return new Response('Method not allowed', {
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
