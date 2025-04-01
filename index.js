const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const Airtable = require('airtable');
const OpenAI = require('openai');

const ssm = new SSMClient({ region: 'us-east-2' });

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

exports.handler = async (event) => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  try {
    const body = JSON.parse(event.body);
    const openai = await getOpenAIClient();
    
    // Determine context from URL
    const urlContext = determineContextFromUrl(body.url);
    
    // Handle goal setter format
    if (body.intake_token === 'goalsetter_chat') {
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
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Missing required fields' })
        };
      }

      const context = await getAirtableContext(org_id, assistant_id, urlContext);
      
      // Construct goal setter message with context
      const message = `[${urlContext.mode.toUpperCase()}] Name: ${name}
Email: ${email}
Subject and Grade: ${subject_and_grade}
Learning Target: ${learning_target}
Measure of Success: ${measure_of_success}
Classroom Goal Statement: ${classroom_goal_statement}`;

      const response = await getAssistantResponse(openai, assistant_id, thread_id, message, context);
      
      await logToAirtable({
        Time: new Date().toISOString(),
        Org_ID: org_id,
        Assistant_ID: assistant_id,
        User_ID: user_id,
        Thread_ID: response.thread_id,
        Name: name,
        Email: email,
        Subject_Grade: subject_and_grade,
        Learning_Target: learning_target,
        Measure_Of_Success: measure_of_success,
        Goal_Statement: classroom_goal_statement,
        Source: source,
        URL: url,
        URL_Context: urlContext,
        Response: response.message
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(response)
      };
    }

    // Handle standard chat format
    const { User_ID, Org_ID, Assistant_ID, Thread_ID, message, url } = body;

    if (!Assistant_ID || !message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const context = await getAirtableContext(Org_ID, Assistant_ID, urlContext);
    const response = await getAssistantResponse(openai, Assistant_ID, Thread_ID, message, context);
    
    await logToAirtable({
      Time: new Date().toISOString(),
      Org_ID,
      Assistant_ID,
      User_ID,
      Thread_ID: response.thread_id,
      Message: message,
      URL: url,
      URL_Context: urlContext,
      Response: response.message
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 