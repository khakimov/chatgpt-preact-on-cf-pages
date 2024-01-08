import { Message, ROLES } from '../types';
import OpenAI from 'openai';

interface Env {
  OPENAI_API_KEY: string;
}

const SYSTEM_MESSAGE = {
  role: 'system',
  content: 'You are a helpful assistant.',
};
const MODEL = 'gpt-3.5-turbo';

const parseRequestBody = async (request: Request): Promise<Message[]> => {
  const body = await request.json();

  if (!Array.isArray(body)) throw new Error();

  const messages = body.map((message) => {
    if (
      typeof message !== 'object' ||
      !ROLES.includes(message.role) ||
      typeof message.content !== 'string'
    ) {
      throw new Error();
    }
    return message;
  });

  return messages;
};

export const onRequest: PagesFunction<Env> = async ({ env, request }) => {
  // Validate method
  if (request.method !== 'POST') {
    return new Response('not found', {
      status: 404,
    });
  }

  // Validate & parse request body
  let messages: Message[];
  try {
    messages = await parseRequestBody(request);
  } catch (e) {
    return new Response('invalid request body', {
      status: 400,
    });
  }

  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: `https://gateway.ai.cloudflare.com/v1/${env.ACCOUNT_TAG}/gpt-book/openai`,
  });
  console.log(env.OPENAI_API_KEY);
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: MODEL,
      messages: [SYSTEM_MESSAGE, ...messages],
      max_tokens: 100, // Adjust max_tokens as needed
    });

    const response = chatCompletion.choices[0].message;
    return new Response(JSON.stringify(response));
  } catch (e) {
    return new Response(e.message, { status: 500 }); // Ensure that the error message is sent back
  }

  // Call OpenAI API
  // Note that the official OpenAI library is not yet compatible with
  // Cloudflare Workers due to the internal use of Axios (https://github.com/openai/openai-node/issues/30).
  // const data: any = await fetch('https://api.openai.com/v1/chat/completions', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: `Bearer ${env.OPENAI_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     model: MODEL,
  //     messages: [SYSTEM_MESSAGE, ...messages],
  //   }),
  // }).then((res) => res.json());

  // return new Response(JSON.stringify(data?.choices[0]?.message));
};
