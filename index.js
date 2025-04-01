const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const Airtable = require('airtable');
const OpenAI = require('openai');

const ssm = new SSMClient({ region: 'us-east-2' });

// Enhanced logging function
function logEvent(event, context) {
  console.log('Lambda Event:', {
    method: event.requestContext?.http?.method,
    path: event.requestContext?.http?.path,
    headers: event.headers,
    body: event.body ? JSON.parse(event.body) : null,
    requestId: context.awsRequestId,
    timestamp: new Date().toISOString()
  });
}

// Enhanced error logging
function logError(error, context) {
  console.error('Lambda Error:', {
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    },
    context: {
      requestId: context.awsRequestId,
      timestamp: new Date().toISOString()
    }
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

// URL pattern handlers
const URL_PATTERNS = {
  GOALSETTER: {
    LIVE: /\/clients\/[^\/]+\/goalsetter_live\.html$/,
    TEMP: /\/clients\/[^\/]+\/goalsetter_temp\.html$/,
    REVIEW: /\/clients\/[^\/]+\/goalsetter_review\.html$/,
    PROD: /\/clients\/[^\/]+\/goalsetter\.html$/
  },
  BBH: {
    LIVE: /\/clients\/bbh\/[^\/]+_live\.html$/,
    TEMP: /\/clients\/bbh\/[^\/]+_temp\.html$/,
    REVIEW: /\/clients\/bbh\/[^\/]+_review\.html$/,
    PROD: /\/clients\/bbh\/[^\/]+\.html$/
  }
};

function determineContextFromUrl(url) {
  if (!url) return { mode: 'unknown' };

  for (const [page, patterns] of Object.entries(URL_PATTERNS)) {
    for (const [mode, pattern] of Object.entries(patterns)) {
      if (pattern.test(url)) {
        return {
          page,
          mode: mode.toLowerCase(),
          isReview: mode === 'REVIEW',
          isTemp: mode === 'TEMP',
          isLive: mode === 'LIVE',
          isProd: mode === 'PROD'
        };
      }
    }
  }
  return { mode: 'unknown' };
}

async function getSSMParameter(paramName) {
  try {
    const command = new GetParameterCommand({
      Name: paramName,
      WithDecryption: true
    });
    const response = await ssm.send(command);
    return response.Parameter.Value;
  } catch (error) {
    console.error(`Error fetching SSM parameter ${paramName}:`, error);
    throw error;
  }
}

async function getAirtableContext(orgId, assistantId, urlContext) {
  try {
    const airtableToken = await getSSMParameter('integraled/central/Airtable_API_Key');
    const baseId = await getSSMParameter('integraled/central/Airtable_Base_ID');
    
    const base = new Airtable({ apiKey: airtableToken }).base(baseId);
    
    // Fetch assistant profile with URL context
    const assistantRecord = await base('Assistants').find(assistantId);
    
    // Adjust assistant behavior based on URL context
    let instructions = assistantRecord.fields.instructions || '';
    if (urlContext.isReview) {
      instructions += "\nYou are in review mode. Provide detailed feedback and suggestions.";
    } else if (urlContext.isTemp) {
      instructions += "\nYou are in temporary mode. Keep responses simple and focused.";
    } else if (urlContext.isLive) {
      instructions += "\nYou are in live production mode. Provide polished, professional responses.";
    }

    return {
      assistantProfile: {
        ...assistantRecord.fields,
        instructions
      },
      branding: assistantRecord.fields.branding || {},
      urlContext
    };
  } catch (error) {
    console.error('Error fetching Airtable context:', error);
    throw error;
  }
}

async function logToAirtable(data) {
  try {
    const airtableToken = await getSSMParameter('integraled/central/Airtable_API_Key');
    const baseId = await getSSMParameter('integraled/central/Airtable_Base_ID');
    
    const base = new Airtable({ apiKey: airtableToken }).base(baseId);
    await base('LRS').create(data);
  } catch (error) {
    console.error('Error logging to Airtable:', error);
  }
}

async function getOpenAIClient() {
  const apiKey = await getSSMParameter('integraled/central/OpenAI_API_Key');
  return new OpenAI({ apiKey });
}

async function createOrGetThread(openai, threadId) {
  if (threadId) {
    try {
      return await openai.beta.threads.retrieve(threadId);
    } catch (error) {
      console.log('Thread not found, creating new one');
    }
  }
  return await openai.beta.threads.create();
}

async function getAssistantResponse(openai, assistantId, threadId, message, context = {}) {
  const thread = await createOrGetThread(openai, threadId);
  
  // Add message to thread with context
  const messageWithContext = context.urlContext?.isReview 
    ? `[Review Mode] ${message}`
    : context.urlContext?.isTemp
    ? `[Temporary Mode] ${message}`
    : message;

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: messageWithContext
  });

  // Run the assistant with context-aware instructions
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId,
    instructions: context.assistantProfile?.instructions
  });

  // Poll for completion
  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }

  if (runStatus.status === 'failed') {
    throw new Error('Assistant run failed');
  }

  // Get the assistant's response
  const messages = await openai.beta.threads.messages.list(thread.id);
  const lastMessage = messages.data[0];
  
  return {
    message: lastMessage.content[0].text.value,
    thread_id: thread.id
  };
}

exports.handler = async (event, context) => {
  // Log incoming event
  logEvent(event, context);

  if (event.requestContext.http.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  try {
    const body = JSON.parse(event.body);
    console.log('Parsed request body:', body);
    
    const openai = await getOpenAIClient();
    console.log('OpenAI client initialized');
    
    // Determine context from URL
    const urlContext = determineContextFromUrl(body.url);
    console.log('URL context determined:', urlContext);
    
    // Handle goal setter format
    if (body.intake_token === 'goalsetter_chat') {
      console.log('Processing goal setter request');
      const {
        name,
        email,
        user_id,
        thread_id,
        assistant_id,
        subject_and_grade,
        learning_target,
        measure_of_success,
        classroom_goal_statement,
        org_id,
        source,
        url
      } = body;

      if (!assistant_id || !org_id) {
        console.log('Missing required fields:', { assistant_id, org_id });
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Missing required fields' })
        };
      }

      // Get Airtable context
      console.log('Fetching Airtable context');
      const airtableContext = await getAirtableContext(org_id, assistant_id, urlContext);
      console.log('Airtable context received');

      // Get assistant response
      console.log('Getting assistant response');
      const response = await getAssistantResponse(
        openai,
        assistant_id,
        thread_id,
        classroom_goal_statement,
        airtableContext
      );
      console.log('Assistant response received');

      // Log to Airtable
      console.log('Logging to Airtable');
      await logToAirtable({
        user_id,
        org_id,
        assistant_id,
        thread_id: response.thread_id,
        message: classroom_goal_statement,
        response: response.message,
        url,
        url_context: urlContext,
        timestamp: new Date().toISOString()
      });
      console.log('Logged to Airtable');

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(response)
      };
    }

    // Handle standard chat format
    console.log('Processing standard chat request');
    const {
      User_ID,
      Org_ID,
      Assistant_ID,
      Thread_ID,
      message,
      url
    } = body;

    if (!Assistant_ID || !Org_ID) {
      console.log('Missing required fields:', { Assistant_ID, Org_ID });
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Get Airtable context
    console.log('Fetching Airtable context');
    const airtableContext = await getAirtableContext(Org_ID, Assistant_ID, urlContext);
    console.log('Airtable context received');

    // Get assistant response
    console.log('Getting assistant response');
    const response = await getAssistantResponse(
      openai,
      Assistant_ID,
      Thread_ID,
      message,
      airtableContext
    );
    console.log('Assistant response received');

    // Log to Airtable
    console.log('Logging to Airtable');
    await logToAirtable({
      user_id: User_ID,
      org_id: Org_ID,
      assistant_id: Assistant_ID,
      thread_id: response.thread_id,
      message,
      response: response.message,
      url,
      url_context: urlContext,
      timestamp: new Date().toISOString()
    });
    console.log('Logged to Airtable');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error) {
    logError(error, context);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 